# Architecture

_Last verified against the codebase: 2026-08-18._

This document separates **what is built** from **what is intended**. Every section labels
which it is. Intended architecture is written down so decisions are not re-litigated, not
because it exists.

The `Team` → `Organization` rename (ADR-025 through ADR-031) is fully implemented; nothing from
it is outstanding.

## 1. System overview

```
┌──────────────────────────────────────────────────┐
│  Control plane  (BUILT — auth & tenancy only)    │
│  Laravel 13 · Inertia v3 · React 19 · TypeScript │
│                                                  │
│  Users → Organizations → (Servers → Sites)       │
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
| Tests            | Pest 4 (105 tests, backend only; ADR-024 adds scoped browser coverage, not yet built)    |
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

`app/` is organised **by Laravel type, with a subfolder per domain inside each type**
([ADR-026](DECISIONS.md), which reversed ADR-021's domain-first plan):

```
app/
  Actions/          Fortify/  Organizations/     single-purpose operations
  Concerns/         Organizations/ (HasOrganizations, GeneratesHandle) + validation-rule traits
  Data/             Organizations/ (UserOrganization, OrganizationPermissions)
  Enums/            Organizations/ (OrganizationRole, OrganizationPermission)
  Http/
    Controllers/    Settings/  Organizations/
    Middleware/     EnsureOrganizationMembership, SetOrganizationUrlDefaults, HandleInertiaRequests
    Requests/       Settings/  Organizations/
    Responses/      Fortify response overrides (post-login redirect targets)
  Models/           User + Organizations/ (Organization, Membership, OrganizationInvitation)
  Notifications/    Organizations/
  Policies/         Organizations/ (OrganizationPolicy)
  Rules/            Organizations/ (OrganizationHandle, UniqueOrganizationInvitation, ValidOrganizationInvitation)
```

`User`, `Providers`, `Console`, the Fortify actions, Inertia middleware and shared
validation-rule traits stay flat — they belong to no domain. Factories follow the model namespace,
so `Organization`'s lives in `database/factories/Organizations/`; getting that wrong is invisible
to `tsc`, Pint and Pest, and surfaces only when a factory cannot be resolved.

**Add the domain subfolder from the first file of a new domain**, even when it is the only one.
`Servers`, `Sites` and `Clients` are close behind, and the alternative is moving the same files
twice.

There are no `app/Jobs`, `app/Services`, or `app/Events` directories. Nothing is queued anywhere in
the application, despite `QUEUE_CONNECTION=database` being configured.

### Frontend structure

```
resources/js/
  pages/        Inertia page components (auth/, settings/, organizations/settings/, dashboard, welcome)
  layouts/      app/ (header nav — ADR-016), auth/, settings/ (Account), organizations/ (Settings area)
  components/   feature components (modals, organization-switcher, section-nav) + ui/ (shadcn primitives)
  hooks/        appearance, clipboard, two-factor, mobile detection
  types/        shared TS types, incl. organizations.ts mirroring the PHP DTOs
  actions/      GENERATED by Wayfinder — never edit by hand
  routes/       GENERATED by Wayfinder — never edit by hand
```

Layouts are resolved centrally in `app.tsx` by page name, so a page does not import its own shell.
`organizations/settings/*` gets the Settings area shell; `settings/*` gets the Account shell.

`resources/js/types/organizations.ts` is hand-maintained and mirrors
`app/Data/Organizations/UserOrganization.php` and `OrganizationPermissions.php`. The two sides are
**not** generated from a single source, so they drift silently. Changing a DTO means changing the
TypeScript type in the same commit.

**Regenerating Wayfinder by hand needs `--with-form`.** `vite.config.ts` sets
`formVariants: true`, so `php artisan wayfinder:generate` without that flag silently drops every
`.form` helper and breaks unrelated pages.

## 3. Tenancy model (BUILT)

Tenancy is **URL-prefix scoped by organization handle**, enforced by middleware. Since
[ADR-031](DECISIONS.md) the shape is `/org/{organization}/…`.

### How a request is scoped

```
GET /org/acme-agency/dashboard
         └────┬────┘
        {organization} route parameter
                │
                ▼
   EnsureOrganizationMembership middleware
     1. resolve the organization from the {organization} route parameter
     2. abort 403 unless the authenticated user is a member of it
     3. optionally enforce a minimum role (middleware parameter, unused today)
```

The 403 in step 2 covers three cases — no user, no such organization, and not a member — and they
are **deliberately indistinguishable**. That is what stops the URL being probed to discover which
agencies are customers, and it is why a readable handle costs nothing in privacy terms.

`SetOrganizationUrlDefaults` runs on every web request and pushes the current organization's
handle into `URL::defaults()`, so `route('dashboard')` resolves without passing it explicitly.
Two other places set the same default and must stay in step: `RedirectsToCurrentOrganization` and
`HasOrganizations::switchOrganization()`. There is exactly one parameter name, `organization`.

**Step 4 is scheduled for removal** ([ADR-025](DECISIONS.md), phase 3). A read currently performs
a write: following a colleague's link to another organization silently repoints your current
organization in every other tab. Since phase 4 put organization _settings_ behind the same prefix,
this now fires on more routes than it used to.

### The route shape

One shape, applied without exception:

| Scope         | Example                                                                     |
| ------------- | --------------------------------------------------------------------------- |
| Tenant-scoped | `/org/{organization}/dashboard`, `/org/{organization}/settings`             |
| Personal      | `/settings/profile`, `/settings/security`                                   |
| Neither       | `/org` (redirects into your own organization), `/invitations/{code}/accept` |

Every future tenant resource — servers, sites, clients — goes under `/org/{organization}/…`, inside
the `EnsureOrganizationMembership` group. Registering a tenant route outside that group is the one
way to lose tenant isolation.

`/invitations/…` is the deliberate exception: the recipient is not a member yet, so the route
cannot carry an organization prefix.

### Why the handle cannot collide with a route

Because the literal `org/` segment separates them. That is the whole point of
[ADR-031](DECISIONS.md): before it, a handle occupied the first URL segment and an organization
called "Settings" would have shadowed the application's own routes, which is why a reserved-word
list existed and had to keep running on both create and rename. With the prefix, that condition
cannot arise, the list is deleted rather than maintained, and `/org/settings/dashboard` is an
ordinary URL.

`App\Rules\Organizations\OrganizationHandle` still validates shape and availability. Handles are
seeded from the name at creation, never regenerated on rename, and never reissued — uniqueness
spans the live column, soft-deleted rows and `organization_handles` ([ADR-030](DECISIONS.md),
[ADR-006](DECISIONS.md)). See [DATA_MODEL.md](DATA_MODEL.md) for the reasoning.

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
registration, 2FA challenge or email verification, the user lands on their current organization's
prefixed dashboard (`/org/{handle}/dashboard`) rather than a bare `/dashboard`.

Registration creates an organization for the new user in the same database transaction
(`CreateNewUser` → `CreateOrganization`), named after the user with no suffix, so a user is never
left without a tenant. No organization-name field is added to the registration form — not everyone
signing up is a company.

That organization is ordinary — there is no personal-organization flag. The
always-one-organization invariant is held by policy (you cannot leave or delete your last one)
plus `EnsureUserHasOrganization`, which creates a replacement when someone else removes your last
membership ([ADR-025](DECISIONS.md)).

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
organization invitations.

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

1. **Tenant isolation is a hard boundary.** Every query touching a tenant-owned resource must be
   scoped through the organization relationship, not filtered after loading. See
   [SECURITY.md](SECURITY.md).
2. **The organization handle is in the URL.** Any new tenant resource route belongs under the
   `/org/{organization}/…` prefix, inside the `EnsureOrganizationMembership` group.
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
