# Decision log

Architecture decisions, newest first. Each entry records what was decided, what was
rejected, and why — the reasoning is the point, since the decision itself is usually
visible in the code.

**Add an entry whenever a change is hard to reverse, sets a precedent for later features,
or has a non-trivial security implication.** Not for routine work.

Format:

```
## ADR-nnn — Title
**Date** · **Status**: Accepted | Superseded by ADR-nnn | Reversed
**Decision** — what we do
**Alternatives** — what we did not do
**Why** — the reasoning, including what we accepted as a cost
**Consequences** — what this obliges or forbids later
```

> **ADR-001 to ADR-010 are reconstructed.** They were inferred by reading the code on
> 2026-08-15, not recorded when the decision was made. The decision and reasoning are
> reconstructions; the original dates are unknown. They are written down so the reasoning
> is not lost and not accidentally reversed. Correct any entry that misstates the original
> intent.

---

## ADR-018 — The hosted resource is called `Site`, with a `type` and optional child services

**2026-08-17** · **Status**: Accepted

**Decision** — The core hosted entity is named `Site`, not `Application`, resolving
[Q10](OPEN_QUESTIONS.md). A Site is anchored to a primary domain — the unit agencies already
group by. `Site` carries a `type` enum (`wordpress` at launch; `static`, `docker_compose`,
etc. later). Types that need more than one running process get child `SiteService` rows
(e.g. `web`, `worker`, `redis` — one per container/process); a WordPress site has one
implicit service and never touches that table.

**Alternatives** — `Application` with a `type` (the placeholder recommendation Q10 had
recorded); a flat `Site` with no `type` column, forcing a rename once a non-WordPress type
ships.

**Why** — "Site" matches the product's own language, the pitch, and every named competitor
(Forge, FlyWP, Ploi) — "Application" would fight that vocabulary for no gain, since a `type`
column gets the same extensibility either way. The multi-container question is answered by
separating *domain grouping* from *process composition*: a Site stays one row per
domain-facing thing regardless of how many containers back it, so a docker-compose app is
still addressable and billable as a single Site while its internals live as child
`SiteService` rows. This avoids two failure modes: forcing every WordPress site to carry
unused multi-service structure, and fragmenting a multi-container app across several Site
rows that don't match how the customer thinks about "the app".

**Consequences**

- `sites` table, not `applications`. ADR-016's top-level area, named "Applications" there,
  is renamed to "Sites" to match — the one existing decision this reopens.
- `sites.type` is required at creation and drives the creation flow, config screen, and
  whether any `SiteService` rows exist.  
- `site_services` is populated only for types that declare more than one process; simple
  types (`wordpress`, `static`) have zero rows and are queried as a single unit.
- Backups, domains, deployments, certificates and metrics carry a foreign key to `Site`, not
  to `SiteService` — the customer-facing and billable unit is the Site.
- `Client` (ADR-017) attaches at the Site level: sites are grouped by domain and, optionally,
  tagged to a client.

---

## ADR-017 — Clients are a grouping entity inside a Team, not a second tenancy level

**2026-08-17** · **Status**: Accepted

**Decision** — `Team` remains the sole tenancy boundary and stays free-form: an agency
creates as many Teams as it wants, named however it likes (functional groupings such as
"Front-end", "Back-end", "QA", "DevOps" are an explicit, supported use, following Forge's
convention). This resolves [Q1](OPEN_QUESTIONS.md) — there is no second tenancy level, and
"Team" is not renamed.

A new `Client` entity is added *inside* a Team: a lightweight record (name, contact details)
owned by a Team, with no membership, login or permission model of its own. `Site` gets a
nullable `client_id` FK scoped to the same Team; domains and mailboxes will get the same FK
when they exist. This follows the WPMUDEV Hub pattern — sites are tagged to a client for
organisation and reporting, and later for recurring billing and ticketing — without touching
the tenancy boundary.

**Alternatives** — A second tenancy level where Client sits above or below Team and owns
servers/sites directly (the two-level model Q1 raised as a possibility); folding "client"
into Team itself by convention only.

**Why** — The actual requirement is Forge-style free-naming teams (colleagues grouped
however an agency likes, not necessarily one-per-client) *plus* WPMUDEV-style client tagging
for billing and reporting. A second tenancy level would force "one tenant per client" on
every agency, which directly contradicts wanting teams named by function rather than by
client. Modelling Client as an owned, non-tenancy entity inside Team gets the
grouping/billing/ticketing benefit at a fraction of the cost of a second enforcement layer,
and leaves ADR-005 (permissions) and ADR-007 (team-scoped URLs) completely untouched.

**Consequences**

- `Team` keeps its current meaning, model and name. No rename, no restructuring.
- `Client` is a new tenant-owned table: `team_id` FK, `cascadeOnDelete`, following the
  modelling constraints in [DATA_MODEL.md](DATA_MODEL.md).
- `Site.client_id` (and later `Domain.client_id`, `Mailbox.client_id`) is nullable — a site
  need not belong to a client.
- Client is authorised through the same team-permission model as everything else (ADR-005);
  there is no client-level login or role in this design. A client portal with its own login
  is a distinct, deliberate future feature, not implied here.
- Recurring billing and ticketing, the motivating future uses, are out of scope for this
  ADR — it only settles the grouping shape they will attach to.

---

## ADR-016 — Top navigation for areas, contextual navigation for resources

**2026-08-15** · **Status**: Accepted

**Decision** — The application shell is a persistent two-row top navigation, not a global
sidebar:

- **Row one** — logo, tenant (team) switcher, account menu. Constant at every depth.
- **Row two** — tenant-scoped _areas_: Dashboard and Settings today; Servers, Applications
  and DNS as they are built.
- **Second level** — a `SectionNav` for the sections _within_ one resource or area, rendered
  beside the content rather than as a global sidebar.

`AppLayout` now renders `app/app-header-layout`. The sidebar template stays in the tree as
the alternative.

**Alternatives** — Keep the global sidebar and nest resources inside it; adopt Laravel
Forge's information architecture wholesale.

**Why** — The application has two navigation axes, and one sidebar expresses only one of
them well. Tenant-scoped areas are stable and always available; resource-scoped sections
belong to whatever is currently open. Forcing both into a single sidebar produces either an
accordion tree that grows without bound, or navigation that depends entirely on breadcrumbs
and loses discoverability.

The second level matters more than the first. Server sections are identical for every
server, but **application sections are not**: a WordPress install wants plugins, themes and
WP-CLI; a Laravel application wants queues, scheduler and environment. A contextual nav can
swap per resource type. A fixed global sidebar cannot — which is the real argument for this
shape, stronger than anything about the server level.

**We deliberately did not copy Forge's structure.** Forge is server-first, because it is a
tool for developers running their own infrastructure: sites live inside a server. This
platform's users are agencies, who think in terms of a client's website rather than
`web-03`. Applications are therefore a top-level area in their own right, listable across
servers, with Servers a peer rather than a mandatory parent.

**Consequences**

- New tenant-scoped **areas** go in row two of `app-header`. New **sections** of a resource
  go in a `SectionNav`. Anything that is a section of one resource must not be added to the
  top nav.
- `SectionNav` (`components/section-nav.tsx`) is the reusable second level. Settings is its
  first consumer and the working reference.
- The shell follows Laravel Forge's proportions — a 1920px container, `px-4 sm:px-8`
  gutters, a 16.5 unit header row, tabs with a sliding underline, and content in an inset
  panel with a hairline ring. Those proportions are expressed with **this project's existing
  tokens** (`bg-sidebar`, `ring-sidebar-border`, `bg-accent`), not with a parallel set of
  semantic colours copied from Forge. Adopting Forge's token vocabulary would have meant
  maintaining two design systems at once.
- `NavTabs`, `EmptyState`, `AppFooter` and the `AppContent` panel are built as reusable
  components rather than markup inside the dashboard, because every server and application
  list will need exactly these four.
- This settles [Q4](OPEN_QUESTIONS.md): tenant resources are routed
  `/{current_team}/servers/{server}/…` and `/{current_team}/applications/{application}/…`,
  while user-level `/settings/…` stays outside the tenant prefix deliberately, because it
  belongs to the person rather than the tenant.
- **Account settings are not an area.** Profile, Security and Appearance hang off the avatar
  menu, keeping the tab row for the product rather than personal preferences. They remain
  real pages at `/settings/…`, not a dialog: `settings/security` sits behind
  `RequirePassword`, which _redirects_, and both it and Profile launch their own dialogs
  (two-factor setup, passkeys, account deletion). A settings modal would mean nesting those.
- **Team administration stays with the account settings**, at `/settings/teams/…`, reached
  through the avatar menu. It was briefly promoted to its own area on the reasoning that it
  administers an organisation rather than a person; that was reversed the same day. Until
  the platform has servers and applications, team management is something an agency touches
  a handful of times — at setup and when staff change — and a permanent slot in the top
  navigation overstates it. Revisit if it grows billing or an audit log.
- `teams.index` sits outside the `{current_team}` prefix: it lists every team the user
  belongs to, so it cannot belong to any one tenant. Everything scoped to a single team
  keeps `EnsureTeamMembership`.
- **Row two holds one item — Overview.** The row exists for what is coming, and listing an
  area before its routes exist would only produce 404s. Renamed from "Dashboard" to match
  the language the rest of the industry uses for a tenant landing page.
- Mobile collapses both levels into the existing sheet. Two navigation levels do not fold
  gracefully by default, so any new area must be added to the sheet as well.
- The naming and typing of the resource behind "Applications" is **not** settled by this
  decision — see [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md) (Q10). Nothing here should be read
  as approving a `sites` table.

---

## ADR-015 — shadcn/ui runs on the React Aria base

**2026-08-15** · **Status**: Accepted

**Decision** — Switched the shadcn base from Radix to React Aria: `components.json` moved
from `"style": "new-york"` to `"style": "aria-vega"`, all primitives were re-added from the
aria registry, and the thirteen `@radix-ui/*` packages were removed. Vega is the style
formerly called new-york, so the app looks the same.

**Alternatives** — Stay on Radix (fully supported, not deprecated); move to the Base UI
registry instead.

**Why** — Requested. React Aria became a first-class shadcn base in July 2026 and brings
Adobe's accessibility work — focus management, keyboard interaction and screen-reader
behaviour — as the foundation of every primitive.

**This was not an under-the-hood swap, and could not be.** shadcn's aria components expose
React Aria's own API, so call-sites had to change:

| Radix                                                                         | React Aria                                                                 |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `<DialogContent>` inside `<Dialog>`                                           | `<Dialog>` is the content                                                  |
| `open` / `onOpenChange`                                                       | `isOpen` / `onOpenChange`                                                  |
| `onClick` / `disabled`                                                        | `onPress` / `isDisabled`                                                   |
| `onSelect` on menu items                                                      | `onAction`                                                                 |
| `asChild`                                                                     | `href`, `LinkButton`, or a `render` prop                                   |
| `<TooltipProvider>` + `<Tooltip><TooltipTrigger/><TooltipContent/></Tooltip>` | `<TooltipTrigger>` holds trigger and `<Tooltip>` side by side; no provider |
| `<DropdownMenu>` root                                                         | `<DropdownMenuTrigger>` is the root                                        |
| `side` / `align` / `sideOffset`                                               | `placement`                                                                |
| `<SelectItem value>`                                                          | `<SelectItem id>`, with `selectedKey` / `onSelectionChange`                |

There is no codemod for this: `shadcn migrate` offers only `icons`, `rtl` and `radix`, and
that last one converts individual Radix packages to the unified `radix-ui` package. 95 type
errors across 35 files were worked through by hand and by targeted scripts.

**Consequences**

- **`RouterProvider` is wired to Inertia in `app.tsx`.** React Aria components navigate
  through their own `href`, so without it every link inside a primitive would need to wrap
  an Inertia `<Link>`. This is what makes `LinkButton`, `SidebarMenuButton href` and
  `DropdownMenuItem href` perform client-side visits.
- **Inertia's `prefetch` is lost** on links that are now React Aria components: the sidebar
  nav, the app logo and the user menu's Settings item. `RouterProvider` calls
  `router.visit()`, which has no hover-prefetch equivalent. Navigation still works; it is
  marginally less eager. Restoring it would mean going back to wrapping Inertia `<Link>`s,
  which is the pattern React Aria is built to avoid.
- **`navigation-menu` does not exist in the aria registry.** Its only consumer used the three
  structural wrappers and no menu behaviour, so `app-header` now uses semantic
  `<nav>/<ul>/<li>` and the primitive is deleted.
- **`sonner` was rewired.** The registry version reads the theme from `next-themes`; it now
  uses this app's `useAppearance` hook, and `next-themes` was removed rather than run a
  second theme system.
- The CLI's `use-mobile.ts` was discarded in favour of the existing `use-mobile.tsx`, which
  is SSR-safe via `useSyncExternalStore`. The CLI version flashes on first render.
- Five unused primitives were deleted (toggle, toggle-group, skeleton, icon, collapsible);
  the CLI re-added `skeleton`, `textarea` and `input-group` as dependencies of others.
- **`sidebar.tsx` and `dropdown-menu.tsx` carry a local fix.** They passed
  `data-active={isActive}` and `data-inset={inset}` straight through. React renders a `false`
  data attribute as the string `"false"` rather than omitting it, and the variants match on
  presence (`data-active:`, not `data-[active=true]`), so every sidebar button painted its
  active background permanently. Both now pass `|| undefined`. **`shadcn add --overwrite`
  will drop this** — re-check it after any component update.
- **Two dialogs kept the Radix nesting** — trigger inside `<Dialog>` rather than beside it
  under `<DialogTrigger>` — which renders nothing at all, hiding the delete-account and
  remove-passkey buttons. Fixed, and `tests/Feature/DialogStructureTest.php` now asserts
  against that shape, since neither tsc nor the linter can see it.
- **Verification is thin.** There are no frontend tests. Lint, `tsc`, the production build
  and 93 backend tests pass, and the unauthenticated pages were checked in a browser, but
  the authenticated flows have not been exercised. See
  [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md) (Q9).

---

## ADR-014 — `vp run dev` runs the whole stack, and Vite is registered directly

**2026-08-15** · **Status**: Accepted

**Decision** — `package.json`'s `dev` script runs `php artisan dev`, so `vp run dev` and
`composer dev` both start the full stack. `AppServiceProvider::configureDevCommands()`
overrides Laravel's Vite dev process to run `vp dev` directly instead of the default
`pnpm run dev`.

**Alternatives** — Leave `dev` as `vp dev` and require `composer dev` for the full stack;
name the Vite-only script `dev:vite` and have `artisan dev` call that.

**Why** — `vp run dev` looks like the command that runs the app, so people reached for it,
got Vite alone, and found nothing on `:8000` — made worse by `laravel-vite-plugin` printing
an `APP_URL: http://localhost:8000` banner that reads like a server it started. Making the
obvious command do the obvious thing is worth more than preserving the split.

**The override is load-bearing, not decoration.** Laravel registers its Vite process as
`pnpm run dev`, which resolves to the `dev` script — now `php artisan dev`. Left alone, the
command and the script would spawn each other without end. Registering `vp dev` under the
same `vite` name takes package.json out of that path entirely. Routing through a
`dev:vite` script would have worked too, but leaves the same trap one rename away.

**Consequences**

- Do not point the `vite` dev process back at a package.json script without changing the
  `dev` script in the same edit. `tests/Feature/DevCommandsTest.php` fails if anyone does.
- `vp dev` still means Vite alone — useful with Herd or Valet, and what the Vite+ docs
  describe. The `vp <name>` versus `vp run <name>` distinction now genuinely matters here.
- Run one stack at a time: concurrent `artisan dev` runs fight over the Vite port and
  `public/hot`.

---

## ADR-013 — The build pipeline runs through `vp`, and CI actually runs

**2026-08-15** · **Status**: Accepted

**Decision** — `composer setup` and `composer ci:check` invoke `vp` instead of `npm`. The
GitHub Actions workflow uses `voidzero-dev/setup-vp` (Node 24, caching enabled) in place of
`actions/setup-node`. PHPStan is invoked with `--memory-limit=1G`.

**Alternatives** — Keep `npm` and drop the `devEngines` constraint; call `pnpm` directly and
leave `vp` for local use; drop the composer wrappers and document the raw commands.

**Why** — After ADR-012, both composer scripts failed immediately with `EBADDEVENGINES`,
because they called `npm` while `package.json` requires pnpm. The workflow inherited that
failure, pinned Node 22 against the Node 24 the migration installed, and never installed the
`vp` CLI at all — so CI could not have passed even once. `setup-vp` is the vendor-supported
path and collapses Node, package-manager and cache setup into a single step, which removes
three ways for the workflow to drift out of sync with local development.

Dropping `devEngines` instead would have "fixed" CI by allowing two package managers to
write the same lockfile — trading a loud failure for a quiet one.

**Consequences**

- `vp` must be present wherever `composer setup` or `composer ci:check` runs. In CI that is
  `setup-vp`; locally it is the developer's global install.
- The workflow pins `setup-vp` to a commit SHA with the release tag in a comment, matching
  the existing actions. Dependabot's `github-actions` ecosystem keeps it updated.
- **PHPStan must be run through `composer types:check`.** Calling `phpstan analyse` directly
  crashes at PHP's default 128M limit, and the error names the crash rather than the cause.
- Enabling `composer ci:check` exposed 16 test files that Pint had been failing on — the
  Pint step had never been reached, because `npm` failed first. Fixed with
  `vendor/bin/pint`: 15 files missing a trailing newline, and `AuthenticationTest.php` also
  needed unary-operator spacing. No test logic changed and all 90 tests still pass.

---

## ADR-012 — The frontend toolchain is Vite+ (`vp`), replacing ESLint and Prettier

**2026-08-15** · **Status**: Accepted

**Decision** — Migrated to Vite+ 0.2.9. `vp` is the entry point for install, dev, build,
lint, format and check. Oxlint replaces ESLint, Oxfmt replaces Prettier, and both are
configured through `lint` and `fmt` keys inside `vite.config.ts` rather than separate
dotfiles. A pre-commit hook runs `vp check --fix` over staged files. `baseUrl` was removed
from `tsconfig.json` so type-aware linting could be enabled.

**Alternatives** — Stay on Vite with ESLint and Prettier; adopt Biome; keep ESLint and swap
only the formatter.

**Why** — One toolchain with one config surface instead of four tools with four configs, and
Oxlint and Oxfmt are substantially faster than what they replace. The migration was
automated: `@oxlint/migrate` converted the ESLint rules, the Prettier config was translated,
and `@andrewbranch/ts5to6` removed the deprecated `baseUrl`. Removing `baseUrl` was needed
regardless — it is deprecated in TypeScript 6 and removed in 7 — and unlocked type-aware
lint rules as a side benefit.

The pre-commit hook is the part that matters most for this project. Checks that only run in
CI are checks that get discovered late; running them on staged files means formatting and
lint drift never reaches review. That is worth more here than raw speed, given the tree
currently has no version control to fall back on at all.

**Consequences**

- `eslint.config.js`, `.prettierrc` and `.prettierignore` are gone. Do not recreate them —
  edit the `lint` and `fmt` keys in `vite.config.ts`.
- `vite.config.ts` grew to roughly 1400 lines, mostly a generated browser-globals map. The
  Vite plugin array is wrapped in `lazyPlugins()` so lint and format commands do not
  instantiate the Laravel, Inertia, React, Tailwind and Wayfinder plugins. New plugins go
  inside that callback.
- **Do not reintroduce `baseUrl`.** It silently disables type-aware linting.
- Type-aware linting surfaced four pre-existing warnings ESLint did not catch (three
  floating promises, one useless default parameter). All four are now fixed.
- `CLAUDE.md` and `AGENTS.md` now carry a second generated block, `<!--VITE PLUS START-->`
  to `<!--VITE PLUS END-->`, at the bottom. Project guidance sits between the two generated
  blocks.
- The build pipeline was repointed at `vp` — see ADR-013.

---

## ADR-011 — Documentation lives in the repository and is part of the definition of done

**2026-08-15** · **Status**: Accepted

**Decision** — Architecture, data model, security posture, open questions and this log are
maintained as Markdown in the repository. Documentation is updated in the same change as
the code it describes, never deferred.

**Alternatives** — An external wiki or Notion space; documentation written at milestones;
no formal documentation, relying on the code.

**Why** — The platform is going to grow several large domains (servers, sites, agents,
monitoring, billing) on top of a foundation only partly designed. Documentation that lives
elsewhere goes stale invisibly and gets skipped under delivery pressure. In the repository
it is reviewed alongside the code and is available to whoever — or whatever — is working on
the codebase. Deferring documentation updates to "later" reliably means never; the cost of
a stale architecture document is worse than having none, because it invites trust it has
not earned.

**Consequences** — Every change that alters behaviour, data shape or security posture
updates the relevant documents in the same change. `CLAUDE.md` encodes this as a mandatory
step.

---

## ADR-010 — Project guidance is appended below the generated Boost block

**2026-08-15** · **Status**: Accepted

**Decision** — `CLAUDE.md` and `AGENTS.md` keep the machine-generated
`<laravel-boost-guidelines>` block untouched at the top. All project-specific guidance is
appended strictly below its closing tag. Scoped guidance sits in `app/CLAUDE.md`,
`app/Http/Controllers/Teams/CLAUDE.md` and `resources/js/CLAUDE.md`.

**Alternatives** — Replace the generated block with hand-written content; keep project
guidance only in `docs/`.

**Why** — `composer update` runs `boost:update`, which rewrites the block between those
tags. Anything written inside it is destroyed without warning. Appending below the closing
tag survives regeneration.

**Consequences** — Never edit inside `<laravel-boost-guidelines>`. Since `app/` is organised
by Laravel type rather than by domain, there is no domain folder to host a scoped file yet;
that lands when ADR-open (domain folder structure) is settled.

---

## ADR-009 — The invitation code alone does not grant access

**Reconstructed** · **Status**: Accepted

**Decision** — Accepting an invitation requires both the 64-character code _and_ an
authenticated user whose email matches the invitation's email, compared case-insensitively
(`App\Rules\ValidTeamInvitation`). Invitations expire after three days and expired rows are
pruned daily.

**Alternatives** — Treat possession of the code as sufficient authority, the common
"anyone with the link can join" pattern.

**Why** — Invitation links travel through email, which gets forwarded, archived, indexed by
corporate scanners and left in shared inboxes. Making the link alone sufficient means one
careless forward grants a stranger access to a tenant's data. Requiring the mailbox as well
means a leaked link is inert without control of the invited address. The cost is friction:
you cannot invite `info@` and have a colleague accept from their personal address. That
trade is correct for a platform holding customer server access.

**Consequences** — Any future invite-style flow (server enrolment tokens, share links)
follows the same shape: the token identifies, a second factor authorises. Changing the
invited email means cancelling and re-inviting.

---

## ADR-008 — Team names are validated against reserved route prefixes

**Reconstructed** · **Status**: Accepted

**Decision** — `App\Rules\TeamName` rejects any name whose slug collides with an existing
first-segment route prefix, plus a static list of reserved words (`admin`, `api`, `billing`,
`settings`, HTTP status codes, and so on). Applied on both create and rename.

**Alternatives** — Namespace tenant URLs under a fixed prefix such as `/t/{team}/…`; allow
any name and resolve conflicts by route ordering.

**Why** — Tenant slugs occupy the first URL segment (ADR-007), so a team named "settings"
would shadow the application's own routes. Relying on route registration order to resolve
that is fragile — it breaks the moment routes are reordered, and the failure is a
cross-tenant routing bug rather than an error. The static list additionally reserves words
we are likely to want later, so a future `/billing` route does not have to be abandoned
because a customer already claimed the name.

**Consequences** — This rule is load-bearing and must keep running on create and rename.
Adding a new top-level route means checking that no existing team already holds that slug.

---

## ADR-007 — Tenancy is scoped by team slug in the URL prefix

**Reconstructed** · **Status**: Accepted

**Decision** — Tenant-scoped routes carry the team slug as their first path segment
(`/{current_team}/dashboard`), guarded by `EnsureTeamMembership`, with `SetTeamUrlDefaults`
filling the parameter automatically. Visiting another team's prefix switches the user's
current team, provided they are a member.

**Alternatives** — Session-only tenant context with unprefixed URLs; a subdomain per tenant.

**Why** — The URL states which tenant is being viewed, so a shared or bookmarked link is
unambiguous. Under session-only context, the same URL shows different data to different
people, and a link pasted into a chat opens the wrong tenant's data for the reader — which
is both a support problem and a mis-action risk when the action is "update all sites on
this server". Subdomains give the same property but add DNS, TLS and cookie-scope
complexity that is not worth it at this stage.

**Consequences** — Every future tenant resource route belongs under the `/{current_team}/…`
prefix. Team slugs must not collide with route prefixes (ADR-008), and retired slugs are
never reissued (ADR-006). Currently only the dashboard uses the prefix; the team settings
routes use a `/settings/teams/{team}` shape instead, which is an inconsistency to resolve
before the pattern is copied further.

---

## ADR-006 — Slug uniqueness includes soft-deleted teams

**Reconstructed** · **Status**: Accepted

**Decision** — `GeneratesUniqueTeamSlugs` checks `withTrashed()`. A deleted team's slug is
retired permanently; a later team with the same name gets a numeric suffix.

**Alternatives** — Free the slug when a team is deleted.

**Why** — The slug is the tenant identifier in the URL. Reissuing it means old links,
bookmarks, emails and browser history pointing at the deleted tenant silently resolve to a
_different_ customer's tenant. That is a cross-tenant data exposure triggered by nothing
more than a stale bookmark. Permanently retiring the slug costs an occasional ugly
`acme-2` and removes the class of bug entirely.

**Consequences** — The `teams` table grows monotonically in slug namespace. Any future hard
delete or purge must keep the slug reserved, or reintroduce this hole.

---

## ADR-005 — Permissions are an enum, decoupled from roles

**Reconstructed** · **Status**: Accepted

**Decision** — `TeamPermission` enumerates capabilities; `TeamRole::permissions()` maps each
role to a set of them. All authorisation asks for a permission, never for a role name.
`TeamRole::assignable()` excludes Owner.

**Alternatives** — Compare role strings at each call site; adopt a package such as
spatie/laravel-permission.

**Why** — Role-string comparisons scatter the permission model across the codebase, so
adding a role or moving a capability becomes a search-and-replace with no compiler help and
no single place to review. Asking for permissions keeps the model in one file that can be
read as a specification. A full permission package is more machinery than a fixed
three-role model needs, and would put the rules in the database where they cannot be
reviewed in a diff.

**Consequences** — New capabilities are added as enum cases and mapped per role. Excluding
Owner from `assignable()` means ownership transfer needs its own deliberate flow — it
cannot happen through the member-role UI.

---

## ADR-004 — Every user gets a personal team at registration

**Reconstructed** · **Status**: Accepted

**Decision** — `CreateNewUser` creates a personal team (`is_personal = true`) inside the
registration transaction. Personal teams cannot be deleted or left.

**Alternatives** — Allow users to exist without a team and handle the empty state
throughout the application.

**Why** — Guaranteeing a tenant always exists removes null-team handling from every
downstream feature — every dashboard, every list, every redirect. It also gives a reliable
fallback when a user leaves or is removed from their last shared team, so they are never
stranded on a page with no valid tenant context. The cost is a slightly confusing concept
for users who only ever work in a shared team.

**Consequences** — Code may assume `currentTeam` or `personalTeam()` resolves for any
authenticated user. Whether "personal team" survives the naming decision on Teams is open —
see [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md).

---

## ADR-003 — The current team is stored on the user record

**Reconstructed** · **Status**: Accepted

**Decision** — `users.current_team_id`, a nullable FK with `nullOnDelete`, rather than a
session value.

**Alternatives** — Keep the current team in the session; derive it from the URL only.

**Why** — Team context survives logout, session expiry and moving between devices. A user
following an emailed invitation link on their phone arrives in the right tenant. The cost
is a database write on every team switch, which is negligible at the frequency team
switching actually occurs.

**Consequences** — Switching teams mutates the user row, so it is a `POST`, not a `GET`.
`EnsureTeamMembership` performing an implicit switch on prefix navigation is a write on
what looks like a read; acceptable, but it means team switching is not idempotent-safe for
prefetching.

---

## ADR-002 — Authentication is delegated to Fortify, with overridden responses

**Reconstructed** · **Status**: Accepted

**Decision** — Laravel Fortify provides registration, login, password reset, email
verification, 2FA (TOTP + recovery codes) and passkeys. Response contracts are overridden in
`app/Http/Responses/` to redirect to the team-prefixed dashboard.

**Alternatives** — Hand-rolled authentication; Laravel Breeze/Jetstream; Fortify with
default redirects.

**Why** — Authentication is the highest-consequence, most attacked, most subtly wrong part
of any application. Fortify is maintained by the framework team, receives security fixes,
and already implements the hard parts — 2FA, recovery codes, WebAuthn, password confirmation
and rate limiting — correctly. Writing this by hand would be strictly worse in exchange for
nothing. The response overrides are necessary because Fortify's defaults do not know about
tenant-prefixed URLs (ADR-007).

**Consequences** — Auth features are configured, not written. Custom behaviour goes through
Fortify's action and response contracts rather than by editing flows. Production password
policy is enforced centrally in `AppServiceProvider` (12 characters, mixed case, numbers,
symbols, breach-checked), relaxed in local and test environments so fixtures stay simple.

---

## ADR-001 — Inertia + React monolith rather than a separate API and SPA

**Reconstructed** · **Status**: Accepted

**Decision** — One Laravel application rendering React pages through Inertia, with Wayfinder
generating typed TypeScript callers for controllers and named routes.

**Alternatives** — A JSON API plus a standalone SPA; server-rendered Blade with Livewire.

**Why** — Inertia gives an SPA experience while keeping authorisation, validation and
routing in one place on the server. A separate API would mean maintaining two deployables,
duplicating the authorisation model at the API boundary, and — most relevant here — creating
a second, independently-reachable surface where tenant scoping could be got wrong. One
enforcement point for tenant isolation is worth a great deal on a platform whose core
promise is that one customer never sees another's servers. Wayfinder closes the remaining
gap, so route changes surface as TypeScript errors rather than runtime 404s.

**Consequences** — No public API exists, and adding one later means designing tenant
scoping for it deliberately rather than inheriting it. `resources/js/actions/` and
`resources/js/routes/` are generated and must never be hand-edited. PHP DTOs in `app/Data/`
and their TypeScript counterparts in `resources/js/types/` are paired by hand and must be
changed together.
