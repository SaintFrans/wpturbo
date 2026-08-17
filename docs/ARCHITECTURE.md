# Architecture

_Last verified against the codebase: 2026-08-15._

This document separates **what is built** from **what is intended**. Every section labels
which it is. Intended architecture is written down so decisions are not re-litigated, not
because it exists.

> **Partly stale — read this first.** On 2026-08-17 the tenancy boundary was renamed from `Team`
> to `Organization` ([ADR-025](DECISIONS.md)), `app/` was laid out per
> [ADR-026](DECISIONS.md), and the URL identifier became a random immutable `public_id`
> ([ADR-027](DECISIONS.md)). **Sections 2 to 5 below still use the old `Team` vocabulary and have
> not been rewritten yet.** Read every "team" as "organization" and every "slug" as `public_id`.
>
> Three accepted decisions remain unimplemented: removing `is_personal` and the implicit
> organization switch, and moving organization administration inside the URL prefix (all
> ADR-025), plus [ADR-028](DECISIONS.md) on Admin member management and
> [ADR-029](DECISIONS.md) on owner recovery. Status per phase is in
> [ORGANIZATION_RENAME.md](ORGANIZATION_RENAME.md) §1.

## 1. System overview

```
┌──────────────────────────────────────────────────┐
│  Control plane  (BUILT — auth & tenancy only)    │
│  Laravel 13 · Inertia v3 · React 19 · TypeScript │
│                                                  │
│  Users → Teams → (Servers → Sites)               │
│                   ^^^^^^^^^^^^^^^ not built      │
└────────────────────┬─────────────────────────────┘
                     │  NATS JetStream  (INTENDED — no code, no dependency)
                     │  outbound-only from the customer's side
┌────────────────────┴─────────────────────────────┐
│  Go agent on the customer's server (NOT STARTED) │
│  updates · installs · monitoring · reporting     │
└──────────────────────────────────────────────────┘
```

Only the top box exists, and only its left half.

## 2. Control plane (BUILT)

A monolithic Laravel application serving a React SPA through Inertia. There is no separate
API tier and no separate frontend build target: Inertia renders React pages from
controllers, and Wayfinder generates typed TypeScript callers for those controllers.

### Stack

| Layer            | Choice                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------- |
| Framework        | Laravel 13 (`^13.17`), PHP `^8.3` — CI runs 8.5                                          |
| View / transport | Inertia v3 (`inertia-laravel ^3.0`, `@inertiajs/react ^3.0`)                             |
| UI               | React 19 with the React Compiler, TypeScript, Tailwind 4, shadcn on React Aria (ADR-015) |
| Route typing     | Laravel Wayfinder → `resources/js/actions/` and `resources/js/routes/`                   |
| Auth             | Laravel Fortify + `@laravel/passkeys`                                                    |
| Build            | Vite+ (`vp`) 0.2.9 over Vite, pnpm 11, Node 24                                           |
| Tests            | Pest 4 (93 tests, backend only; ADR-024 adds scoped browser coverage, not yet built)     |
| Static analysis  | Larastan / PHPStan (`phpstan.neon`), Oxlint type-aware linting                           |
| Formatting       | Pint (PHP), Oxfmt (TS/React; ignore list in `fmt.ignorePatterns`)                        |

### The frontend toolchain is Vite+ (ADR-012)

`vp` is the entry point for everything frontend. Oxlint replaced ESLint and Oxfmt replaced
Prettier; `eslint.config.js`, `.prettierrc` and `.prettierignore` no longer exist. Their
configuration now lives **inside `vite.config.ts`**, in three top-level keys alongside
`plugins`:

| Key      | Replaces                          | Notes                                                                                                                           |
| -------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `lint`   | `eslint.config.js`                | Oxlint rules, plugins, ignore patterns, and a large generated `globals` map. `options.typeAware` and `options.typeCheck` are on |
| `fmt`    | `.prettierrc` + `.prettierignore` | Formatting options and `ignorePatterns`                                                                                         |
| `staged` | —                                 | `'*': 'vp check --fix'`, run by the pre-commit hook                                                                             |

Two consequences worth knowing before editing that file:

- `vite.config.ts` is now ~1400 lines, most of it a generated browser-globals list. The
  hand-relevant parts are the `fmt` block, the `rules` block, and `plugins` at the very
  bottom.
- The Vite plugin array is wrapped in `lazyPlugins(() => [...])` so that `vp check`, `vp lint`
  and `vp fmt` do not have to instantiate the Laravel, Inertia, React, Tailwind and
  Wayfinder plugins. **Keep new plugins inside that callback**, or the lint and format
  commands slow down and can break.

Type-aware linting is only possible because `baseUrl` was removed from `tsconfig.json`
during the migration (it is deprecated in TypeScript 6 and removed in 7). Path aliasing
still works through `paths: { "@/*": ["./resources/js/*"] }`. **Do not reintroduce
`baseUrl`** — it would silently disable type-aware lint rules.

### Commands

| Task               | Command                                       |
| ------------------ | --------------------------------------------- |
| Install            | `vp install`                                  |
| Run the app        | `vp run dev` or `composer dev` — full stack   |
| Vite alone         | `vp dev`                                      |
| Build              | `vp build`                                    |
| Lint               | `vp lint .`                                   |
| Format             | `vp fmt resources/` — add `--check` to verify |
| Type check         | `vp run types:check` (`tsc --noEmit`)         |
| Everything at once | `vp check` (add `--fix`)                      |

`vp <name>` runs a Vite+ built-in; `vp run <name>` runs a `package.json` script. The names
collide — `vp lint` is the built-in, `vp run lint` is the project script that wraps it. When
in doubt about which you want, check `package.json`.

### Code organisation

`app/` is organised **by Laravel type, not by domain**:

```
app/
  Actions/       Fortify/  Teams/        single-purpose operations
  Concerns/      HasTeams, validation-rule traits
  Data/          readonly DTOs passed to Inertia (TeamPermissions, UserTeam)
  Enums/         TeamRole, TeamPermission
  Http/
    Controllers/ Settings/  Teams/
    Middleware/  EnsureTeamMembership, SetTeamUrlDefaults, HandleInertiaRequests
    Requests/    form requests carrying validation and authorisation
    Responses/   Fortify response overrides (post-login redirect targets)
  Models/        Team, Membership, TeamInvitation, User
  Notifications/ Teams/
  Policies/      TeamPolicy
  Rules/         TeamName, UniqueTeamInvitation, ValidTeamInvitation
```

There are no `app/Jobs`, `app/Services`, or `app/Events` directories. Nothing is queued
anywhere in the application, despite `QUEUE_CONNECTION=database` being configured.

**This is now the actual layout** ([ADR-026](DECISIONS.md), which reversed ADR-021's domain-first
plan). The tree above is the pre-rename state; today every domain-owned file sits in a subfolder
of its type folder:

```
app/
  Actions/Organizations/        CreateOrganization
  Concerns/Organizations/       HasOrganizations, GeneratesPublicId
  Data/Organizations/           UserOrganization, OrganizationPermissions
  Enums/Organizations/          OrganizationRole, OrganizationPermission
  Http/Controllers/Organizations/
  Http/Requests/Organizations/
  Models/Organizations/         Organization, Membership, OrganizationInvitation
  Notifications/Organizations/
  Policies/Organizations/       OrganizationPolicy
  Rules/Organizations/          UniqueOrganizationInvitation, ValidOrganizationInvitation
```

`User`, `Providers`, `Console`, the Fortify actions, Inertia middleware and shared
validation-rule traits stay flat — they belong to no domain. Factories follow the model
namespace, so they live in `database/factories/Organizations/`.

### Frontend structure

```
resources/js/
  pages/        Inertia page components (auth/, settings/, teams/, dashboard, welcome)
  layouts/      app/ (header nav — ADR-016), auth/, settings/ shells
  components/   feature components (modals, team-switcher, section-nav) + ui/ (shadcn primitives)
  hooks/        appearance, clipboard, two-factor, mobile detection
  types/        shared TS types, incl. teams.ts mirroring the PHP DTOs
  actions/      GENERATED by Wayfinder — never edit by hand
  routes/       GENERATED by Wayfinder — never edit by hand
```

`resources/js/types/teams.ts` is hand-maintained and mirrors `app/Data/UserTeam.php` and
`app/Data/TeamPermissions.php`. The two sides are **not** generated from a single source,
so they drift silently. Changing a DTO means changing the TypeScript type in the same
commit.

## 3. Tenancy model (BUILT)

Tenancy is **URL-prefix scoped by team slug**, enforced by middleware.

### How a request is scoped

```
GET /acme-agency/dashboard
     └──────┬──────┘
        {current_team} route parameter
                │
                ▼
   EnsureTeamMembership middleware
     1. resolve the team from the {current_team} or {team} route parameter
     2. abort 403 unless the authenticated user is a member of it
     3. optionally enforce a minimum role (middleware parameter)
     4. if the URL team differs from the user's current team, switch to it
```

`SetTeamUrlDefaults` runs on every web request and pushes the current team's slug into
`URL::defaults()`, so `route('dashboard')` resolves without passing the team explicitly.

### The two route shapes

There are currently **two different scoping conventions in use**, and it matters:

| Shape         | Example                     | Parameter      | Where                 |
| ------------- | --------------------------- | -------------- | --------------------- |
| Team-prefixed | `/{current_team}/dashboard` | `current_team` | `routes/web.php`      |
| Team-suffixed | `/settings/teams/{team}`    | `team`         | `routes/settings.php` |

Only the prefixed form triggers the automatic team switch. Only **one** route uses the
prefixed form today: the dashboard. Every future tenant-scoped resource — servers, sites —
should use the prefixed form, so the URL always states which tenant the user is looking at.

**This split is being removed.** [ADR-025](DECISIONS.md) collapses it: organization
administration moves inside the prefix at `/{current_organization}/settings/…`, `/settings/…`
becomes purely personal, and only the organization list-and-create page stays outside. The
automatic switch is removed at the same time — the URL will scope the request without
persisting the user's current organization. See
[ORGANIZATION_RENAME.md](ORGANIZATION_RENAME.md) §5 and §6.

### Team name collisions with route prefixes

Because team slugs occupy the first URL segment, a team named "settings" would shadow the
settings routes. `App\Rules\TeamName` blocks this by rejecting any name that slugs to an
existing route prefix, plus a long static list of reserved words (`admin`, `api`, `billing`,
HTTP status codes, and so on). This rule is load-bearing: it must keep running on both
create and rename.

Slugs are generated from the name and regenerated on rename, with a numeric suffix for
collisions. `withTrashed()` is included in the uniqueness check, so a soft-deleted team's
slug is never reissued.

**This subsection is obsolete — it describes code that no longer exists.** Under
[ADR-027](DECISIONS.md), implemented 2026-08-17, the first URL segment is a random, immutable
twelve-character `public_id`, not a name-derived slug. A random token cannot shadow a route
literal, so `App\Rules\OrganizationName` was deleted along with its reserved-word list, and
organization names are now free text — an organization may be called "Settings".

Two behaviours went with it: the `-2` collision suffix, and the regeneration-on-rename that
silently broke every existing link when someone renamed their organization. `Organization` now
assigns `public_id` in `creating` only, with no `updating` counterpart.

ADR-006's rule survives in `GeneratesPublicId`, and must: it is what stops a stale bookmark
resolving to a different tenant. It is expressed as `withoutGlobalScope(SoftDeletingScope::class)`
rather than `withTrashed()`, so the trait is equally usable by tenant resources that hard-delete —
`Site`, `Server` and `Client` are meant to reuse it.

## 4. Authentication (BUILT)

Laravel Fortify with all major features enabled:

- Registration, login, password reset, email verification
- Two-factor authentication (TOTP with QR code, plus recovery codes)
- Passkeys / WebAuthn via `@laravel/passkeys`, with a `.well-known/passkey-endpoints` route

Rate limiters, defined in `FortifyServiceProvider`:

| Limiter         | Limit  | Keyed by                           |
| --------------- | ------ | ---------------------------------- |
| `login`         | 5/min  | lowercased username + IP           |
| `two-factor`    | 5/min  | the pending login session ID       |
| `passkeys`      | 10/min | credential ID (or session ID) + IP |
| password update | 6/min  | route middleware `throttle:6,1`    |

Fortify response classes are overridden in `app/Http/Responses/` so that after login,
registration, 2FA challenge or email verification, the user lands on their current team's
prefixed dashboard rather than a bare `/dashboard`.

Registration creates a personal team for the new user in the same database transaction
(`CreateNewUser` → `CreateTeam`), so a user is never left without a tenant.

[ADR-025](DECISIONS.md) keeps that invariant but removes `is_personal`: the organization
created at registration is a normal one, named after the user and renameable. The guarantee is
enforced instead by blocking a user from leaving their last organization, and creating one if
their last membership is removed by someone else. No organization-name field is added to the
registration form — not everyone signing up is a company.

Password policy tightens in production only (`AppServiceProvider::configureDefaults`):
12 characters, mixed case, numbers, symbols, and a check against known breach corpora. In
local and test environments there is no policy, to keep factories and fixtures simple.

## 5. Data flow, today (BUILT)

Everything is synchronous request/response. There is no queue worker, no background job,
and no event bus.

```
Browser ──Inertia visit──▶ Controller ──▶ Model / Action ──▶ Database
   ◀────── Inertia page props (React component + data) ──────┘
```

The one scheduled task is in `routes/console.php`: a daily closure that deletes expired
team invitations.

The one outbound side effect is the invitation email, sent **inline during the HTTP
request** via `Notification::route('mail', …)`. It is not queued, so a slow or failing mail
server directly slows or fails the invite request. [ADR-023](DECISIONS.md) settles that this
should be rate-limited and queued; not yet implemented.

## 6. Agent and transport (INTENDED — not built)

None of this exists in the repository. It is recorded here as design intent.

- A **Go agent** runs on each managed server.
- The agent connects **outbound** to the control plane. The control plane never dials in.
  This means customers open no inbound firewall port, and the platform holds no SSH keys
  into customer infrastructure — which is the single most important security property of
  the design.
- Transport is **NATS JetStream**, chosen for durable, at-least-once message delivery: a
  server that is offline during an update instruction should still receive it on reconnect.
- The agent's responsibilities: WordPress core/plugin/theme updates, site installation,
  and health/monitoring reporting.

Everything about this is still open: agent identity and enrolment, credential rotation,
subject naming and per-tenant isolation on NATS, command authorisation, and how results
flow back into the control plane. These are recorded in
[OPEN_QUESTIONS.md](OPEN_QUESTIONS.md) and must be settled — with their security
implications written into [SECURITY.md](SECURITY.md) — before any agent code is written.

## 7. Infrastructure and environments

Local development uses SQLite by default. `database`-backed session, cache and queue
drivers are configured, and mail is written to the log.

A pre-commit hook (`.vite-hooks/pre-commit` → `vp staged`) runs `vp check --fix` over
staged files, so formatting, linting and type checking happen before a commit lands rather
than in review.

### CI

`.github/workflows/tests.yml` runs on push to `main` and on pull requests:

1. `shivammathur/setup-php` — PHP 8.5 with Composer.
2. `voidzero-dev/setup-vp` — installs Vite+, Node 24 and the package manager in one step,
   with dependency caching. It replaces the old `setup-node` step; no separate pnpm setup or
   manual cache configuration is needed.
3. `composer setup` — install, `.env`, key, migrate, `vp install`, `vp build`.
4. `composer ci:check` — `vp lint .`, `vp fmt --check .`, `vp run types:check`, then Pint,
   PHPStan and Pest.

Both composer scripts drive `vp` directly. They previously called `npm`, which fails with
`EBADDEVENGINES` because `package.json` declares `devEngines.packageManager: pnpm` —
repointing them at `vp` fixed that (ADR-012).

Actions are pinned to commit SHAs with the release tag in a trailing comment, and Dependabot
is configured for the `github-actions` ecosystem, so the pins stay current.

`composer ci:check` passes end to end locally, as does `vp build`.

**PHPStan needs `--memory-limit=1G`.** Larastan's analysis exceeds PHP's default 128M and the
parallel worker crashes with a bare "process crashed" message that does not name memory as
the cause. The limit is set in the `types:check` composer script; run PHPStan through that
script rather than calling the binary directly.

This is a git repository on `main`; the decision log and the "update docs in the same
change" rule in `CLAUDE.md` have actual history to attach to.

## 8. Constraints that shape future work

1. **Tenant isolation is a hard boundary.** Every query touching a tenant-owned resource
   must be scoped through the team, not filtered after loading. See
   [SECURITY.md](SECURITY.md).
2. **The team slug is in the URL.** Any new tenant resource route belongs under the
   `/{current_team}/…` prefix.
3. **Wayfinder output is generated.** Never hand-edit `resources/js/actions/` or
   `resources/js/routes/`; change the route or controller and regenerate.
4. **PHP DTOs and TypeScript types are manually paired.** Change both together.
5. **`CLAUDE.md` and `AGENTS.md` contain two generated blocks.** The
   `<laravel-boost-guidelines>` section at the top is rewritten by `boost:update` on every
   `composer update`; the `<!--VITE PLUS START--> … <!--VITE PLUS END-->` section at the
   bottom is owned by `vp`. Project-specific guidance lives strictly between the two.
6. **Frontend tooling config lives in `vite.config.ts`.** Lint and format rules are the
   `lint` and `fmt` keys, not separate dotfiles. New Vite plugins go inside the
   `lazyPlugins(() => [...])` callback.
7. **Do not reintroduce `baseUrl` in `tsconfig.json`.** It would disable type-aware
   linting, and it is removed in TypeScript 7.
