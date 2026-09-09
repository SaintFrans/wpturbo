# ADR-016 — Top navigation for areas, contextual navigation for resources

**2026-08-15** · **Status**: Accepted, **amended by [ADR-025](0025-team-becomes-organization-the-personal-team-is-removed.md)**, **[ADR-042](0042-one-menu-bar-and-a-real-sidebar-for-resource-sections.md)** and **[ADR-046](0046-settings-is-one-area-with-a-group-per-scope.md)**

> **Account settings and organization settings merged into one Settings area on 2026-09-07
> ([ADR-046](0046-settings-is-one-area-with-a-group-per-scope.md)), its fifth position on this
> question.** Still not an area pill, still two URL spaces — but one destination, one account-menu
> row, and a sidebar with a group per scope. Read "Account settings are still not an area" below as
> "Settings is still not an area".

> **Settings left the area pills on 2026-09-07, its fourth position on this question.** It is
> tenant-scoped and stays at `/org/{organization}/settings`, but the link to it now lives in the
> account menu rather than in row two. The bar carries only Overview and Clients. In the same
> change, row one's separate tenant switcher and account menu were merged into one button —
> `AccountMenu` in `app-header.tsx` — showing the active organization and opening a menu that
> carries both the person and the organizations you belong to. Row one below should be read as
> "logo, account menu" rather than "logo, tenant switcher, account menu".
>
> **The shapes changed on 2026-09-07 ([ADR-042](0042-one-menu-bar-and-a-real-sidebar-for-resource-sections.md)).**
> The two rows below are now **one menu bar** — identity, areas, search and account in a single
> row — and the second level is shadcn's `Sidebar` on the left rather than a sticky column of
> links. Read "row two" below as "the areas in the menu bar", and `SectionNav` as the sidebar
> menu it now renders. The two-level rule itself is unchanged and is the part that matters.

> **Two amendments, both implemented 2026-08-17.**
>
> **Organization settings became an area.** Row two now holds Overview and Settings, and the
> bullet below saying team administration keeps no top-level slot is reversed. This is the third
> position on that question, so the reasoning matters more than the answer: the earlier reversal
> was correct _while_ team administration lived at `/settings/teams/…`, an account-level location.
> [ADR-031](0031-tenant-routes-sit-behind-a-literal-org-segment.md) moved it to
> `/org/{organization}/settings`, which makes it tenant-scoped — and this ADR's own rule is that
> tenant-scoped areas go in row two. The location changed, so the answer changed with it.
>
> Its sections — General and Members today, Roles and Billing later — are a `SectionNav`, exactly
> as this entry prescribes.
>
> **The organizations list page was removed rather than relocated.** Creating an organization
> happens in the header switcher and deleting one on its General tab, which left the list with
> nothing to do; `/org` redirects into the user's own organization instead. This is why the empty
> state that ADR-016 lists as a reusable component has one fewer consumer than expected.
>
> **Account settings are still not an area**, and are now named "Account" rather than "Settings",
> since "Settings" is what the organization area is called. It carries Profile and Security.
> Appearance left it for a theme toggle in the avatar menu — a per-device display preference is
> not a settings page, and putting it in the menu makes it reachable from anywhere.
>
> The switcher in row one is confirmed rather than changed: multi-organization membership is an
> endorsed scenario. All "team" language below reads as "organization"; that part is editorial.

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
- The section nav is the reusable second level. Settings is its first consumer and the working
  reference. It moved into `layouts/section-layout.tsx` with the sidebar it fills (ADR-045).
- The shell follows Laravel Forge's proportions — a 1920px container, `px-4 sm:px-8`
  gutters, a 16.5 unit header row, tabs with a sliding underline, and content in an inset
  panel with a hairline ring. Those proportions are expressed with **this project's existing
  tokens** (`bg-sidebar`, `ring-sidebar-border`, `bg-accent`), not with a parallel set of
  semantic colours copied from Forge. Adopting Forge's token vocabulary would have meant
  maintaining two design systems at once.
- `NavTabs` and `EmptyState` are built as reusable components rather than markup inside the
  dashboard, because every server and application list will need them. `AppFooter` and the
  `AppContent` panel that stood beside them here are gone (ADR-042, ADR-045).
- This settles [Q4](../OPEN_QUESTIONS.md): tenant resources are routed
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
  decision — see [OPEN_QUESTIONS.md](../OPEN_QUESTIONS.md) (Q10). Nothing here should be read
  as approving a `sites` table.
