<laravel-boost-guidelines>
=== foundation rules ===

# Laravel Boost Guidelines

The Laravel Boost guidelines are specifically curated by Laravel maintainers for this application. These guidelines should be followed closely to ensure the best experience when building Laravel applications.

## Foundational Context

This application is a Laravel application and its main Laravel ecosystems package & versions are below. You are an expert with them all. Ensure you abide by these specific packages & versions.

- php - 8.5
- inertiajs/inertia-laravel (INERTIA_LARAVEL) - v3
- laravel/fortify (FORTIFY) - v1
- laravel/framework (LARAVEL) - v13
- laravel/prompts (PROMPTS) - v0
- laravel/wayfinder (WAYFINDER) - v0
- larastan/larastan (LARASTAN) - v3
- laravel/boost (BOOST) - v2
- laravel/mcp (MCP) - v0
- laravel/pail (PAIL) - v1
- laravel/pint (PINT) - v1
- laravel/sail (SAIL) - v1
- pestphp/pest (PEST) - v4
- phpunit/phpunit (PHPUNIT) - v12
- @inertiajs/react (INERTIA_REACT) - v3
- react (REACT) - v19
- tailwindcss (TAILWINDCSS) - v4
- @laravel/vite-plugin-wayfinder (WAYFINDER_VITE) - v0
- eslint (ESLINT) - v9
- prettier (PRETTIER) - v3

## Skills Activation

This project has domain-specific skills available in `**/skills/**`. You MUST activate the relevant skill whenever you work in that domain—don't wait until you're stuck.

## Conventions

- You must follow all existing code conventions used in this application. When creating or editing a file, check sibling files for the correct structure, approach, and naming.
- Use descriptive names for variables and methods. For example, `isRegisteredForDiscounts`, not `discount()`.
- Check for existing components to reuse before writing a new one.

## Verification Scripts

- Do not create verification scripts or tinker when tests cover that functionality and prove they work. Unit and feature tests are more important.

## Application Structure & Architecture

- Stick to existing directory structure; don't create new base folders without approval.
- Do not change the application's dependencies without approval.

## Frontend Bundling

- If the user doesn't see a frontend change reflected in the UI, it could mean they need to run `npm run build`, `npm run dev`, or `composer run dev`. Ask them.

## Documentation Files

- You must only create documentation files if explicitly requested by the user.

## Replies

- Be concise in your explanations - focus on what's important rather than explaining obvious details.

=== boost rules ===

# Laravel Boost

## Tools

- Laravel Boost is an MCP server with tools designed specifically for this application. Prefer Boost tools over manual alternatives like shell commands or file reads.
- Use `database-query` to run read-only queries against the database instead of writing raw SQL in tinker.
- Use `database-schema` to inspect table structure before writing migrations or models.
- Use `get-absolute-url` to resolve the correct scheme, domain, and port for project URLs. Always use this before sharing a URL with the user.
- Use `browser-logs` to read browser logs, errors, and exceptions. Only recent logs are useful, ignore old entries.

## Searching Documentation (IMPORTANT)

- Always use `search-docs` before making code changes. Do not skip this step. It returns version-specific docs based on installed packages automatically.
- Pass a `packages` array to scope results when you know which packages are relevant.
- Use multiple broad, topic-based queries: `['rate limiting', 'routing rate limiting', 'routing']`. Expect the most relevant results first.
- Do not add package names to queries because package info is already shared. Use `test resource table`, not `filament 4 test resource table`.

### Search Syntax

1. Use words for auto-stemmed AND logic: `rate limit` matches both "rate" AND "limit".
2. Use `"quoted phrases"` for exact position matching: `"infinite scroll"` requires adjacent words in order.
3. Combine words and phrases for mixed queries: `middleware "rate limit"`.
4. Use multiple queries for OR logic: `queries=["authentication", "middleware"]`.

## Artisan

- Run Artisan commands directly via the command line (e.g., `php artisan route:list`). Use `php artisan list` to discover available commands and `php artisan [command] --help` to check parameters.
- Inspect routes with `php artisan route:list`. Filter with: `--method=GET`, `--name=users`, `--path=api`, `--except-vendor`, `--only-vendor`.
- Read configuration values using dot notation: `php artisan config:show app.name`, `php artisan config:show database.default`. Or read config files directly from the `config/` directory.

## Tinker

- Execute PHP in app context for debugging and testing code. Do not create models without user approval, prefer tests with factories instead. Prefer existing Artisan commands over custom tinker code.
- Always use single quotes to prevent shell expansion: `php artisan tinker --execute 'Your::code();'`
    - Double quotes for PHP strings inside: `php artisan tinker --execute 'User::where("active", true)->count();'`

=== php rules ===

# PHP

- Always use curly braces for control structures, even for single-line bodies.
- Use PHP 8 constructor property promotion: `public function __construct(public GitHub $github) { }`. Do not leave empty zero-parameter `__construct()` methods unless the constructor is private.
- Use explicit return type declarations and type hints for all method parameters: `function isAccessible(User $user, ?string $path = null): bool`
- Use TitleCase for Enum keys: `FavoritePerson`, `BestLake`, `Monthly`.
- Prefer PHPDoc blocks over inline comments. Only add inline comments for exceptionally complex logic.
- Use array shape type definitions in PHPDoc blocks.

=== deployments rules ===

# Deployment

- Laravel can be deployed using [Laravel Cloud](https://cloud.laravel.com/), which is the fastest way to deploy and scale production Laravel applications.

=== tests rules ===

# Test Enforcement

- Every change must be programmatically tested. Write a new test or update an existing test, then run the affected tests to make sure they pass.
- Run the minimum number of tests needed to ensure code quality and speed. Use `php artisan test --compact` with a specific filename or filter.

=== inertia-laravel/core rules ===

# Inertia

- Inertia creates fully client-side rendered SPAs without modern SPA complexity, leveraging existing server-side patterns.
- Components live in `resources/js/pages` (unless specified in `vite.config.js`). Use `Inertia::render()` for server-side routing instead of Blade views.
- ALWAYS use `search-docs` tool for version-specific Inertia documentation and updated code examples.
- IMPORTANT: Activate `inertia-react-development` when working with Inertia client-side patterns.

# Inertia v3

- Use all Inertia features from v1, v2, and v3. Check the documentation before making changes to ensure the correct approach.
- New v3 features: standalone HTTP requests (`useHttp` hook), optimistic updates with automatic rollback, layout props (`useLayoutProps` hook), instant visits, simplified SSR via `@inertiajs/vite` plugin, custom exception handling for error pages.
- Carried over from v2: deferred props, infinite scroll, merging props, polling, prefetching, once props, flash data.
- When using deferred props, add an empty state with a pulsing or animated skeleton.
- Axios has been removed. Use the built-in XHR client with interceptors, or install Axios separately if needed.
- `Inertia::lazy()` / `LazyProp` has been removed. Use `Inertia::optional()` instead.
- Prop types (`Inertia::optional()`, `Inertia::defer()`, `Inertia::merge()`) work inside nested arrays with dot-notation paths.
- SSR works automatically in Vite dev mode with `@inertiajs/vite` - no separate Node.js server needed during development.
- Event renames: `invalid` is now `httpException`, `exception` is now `networkError`.
- `router.cancel()` replaced by `router.cancelAll()`.
- The `future` configuration namespace has been removed - all v2 future options are now always enabled.

=== laravel/core rules ===

# Do Things the Laravel Way

- Use `php artisan make:` commands to create new files (i.e. migrations, controllers, models, etc.). You can list available Artisan commands using `php artisan list` and check their parameters with `php artisan [command] --help`.
- If you're creating a generic PHP class, use `php artisan make:class`.
- Pass `--no-interaction` to all Artisan commands to ensure they work without user input. You should also pass the correct `--options` to ensure correct behavior.

### Model Creation

- When creating new models, create useful factories and seeders for them too. Ask the user if they need any other things, using `php artisan make:model --help` to check the available options.

## APIs & Eloquent Resources

- For APIs, default to using Eloquent API Resources and API versioning unless existing API routes do not, then you should follow existing application convention.

## URL Generation

- When generating links to other pages, prefer named routes and the `route()` function.

## Testing

- When creating models for tests, use the factories for the models. Check if the factory has custom states that can be used before manually setting up the model.
- Faker: Use methods such as `$this->faker->word()` or `fake()->randomDigit()`. Follow existing conventions whether to use `$this->faker` or `fake()`.
- When creating tests, make use of `php artisan make:test [options] {name}` to create a feature test, and pass `--unit` to create a unit test. Most tests should be feature tests.

## Vite Error

- If you receive an "Illuminate\Foundation\ViteException: Unable to locate file in Vite manifest" error, you can run `npm run build` or ask the user to run `npm run dev` or `composer run dev`.

=== wayfinder/core rules ===

# Laravel Wayfinder

Use Wayfinder to generate TypeScript functions for Laravel routes. Import from `@/actions/` (controllers) or `@/routes/` (named routes).

=== pint/core rules ===

# Laravel Pint Code Formatter

- If you have modified any PHP files, you must run `vendor/bin/pint --dirty --format agent` before finalizing changes to ensure your code matches the project's expected style.
- Do not run `vendor/bin/pint --test --format agent`, simply run `vendor/bin/pint --format agent` to fix any formatting issues.

=== pest/core rules ===

## Pest

- This project uses Pest for testing. Create tests: `php artisan make:test --pest {name}`.
- The `{name}` argument should not include the test suite directory. Use `php artisan make:test --pest SomeFeatureTest` instead of `php artisan make:test --pest Feature/SomeFeatureTest`.
- Run tests: `php artisan test --compact` or filter: `php artisan test --compact --filter=testName`.
- Do NOT delete tests without approval.

=== inertia-react/core rules ===

# Inertia + React

- IMPORTANT: Activate `inertia-react-development` when working with Inertia React client-side patterns.

</laravel-boost-guidelines>

---

<!--
  Everything ABOVE this line is generated by Laravel Boost and is rewritten by
  `boost:update` on every `composer update`. Never edit inside the
  <laravel-boost-guidelines> tags — your changes will be destroyed.
  Everything BELOW this line is project-specific and hand-maintained.
-->

# Hestri — project guidance

## What we are building

A control plane for managed and semi-managed WordPress hosting, for **agencies** that manage
sites on behalf of their own clients. Two tiers are intended: customers bring their own
servers that the platform manages (first), and a fully managed tier on our own
infrastructure (later). Management happens through a Go agent on each server that connects
outbound over NATS JetStream.

**Almost none of that exists yet.** What is built is the account, authentication and team
layer. There is no Server, Site or Agent model, no queued work, no NATS. Do not assume any
hosting-domain code exists — verify before referencing it. See [README.md](README.md) and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Architecture principles

1. **Tenant isolation is the platform's core promise.** One agency must never see or affect
   another's servers, sites or data. Scope at the query, never after loading.
2. **One enforcement point.** Authorisation, validation and tenant scoping live on the
   server, in one place. This is why the application is an Inertia monolith rather than an
   API plus SPA (ADR-001).
3. **Ask for permissions, not roles.** Authorisation checks a `TeamPermission`, never a role
   string (ADR-005).
4. **The tenant is in the URL.** Tenant-scoped routes carry the team slug as their first
   path segment, guarded by `EnsureTeamMembership` (ADR-007).
5. **Security wins over functionality.** Always — see the rule below.

## Where the documentation lives

| Document                                         | Read it when                                                                |
| ------------------------------------------------ | --------------------------------------------------------------------------- |
| [README.md](README.md)                           | You need the overview and current status                                    |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)     | Touching structure, routing, tenancy or the frontend/backend seam           |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md)         | Touching models, migrations or DTOs                                         |
| [docs/DECISIONS.md](docs/DECISIONS.md)           | Before changing something that looks arbitrary — it probably is not         |
| [docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md) | **Always check.** If your task touches an open question, stop and ask       |
| [docs/SECURITY.md](docs/SECURITY.md)             | Every task. The rules in §5 apply whether or not the task mentions security |

Scoped guidance: [app/CLAUDE.md](app/CLAUDE.md),
[app/Http/Controllers/Teams/CLAUDE.md](app/Http/Controllers/Teams/CLAUDE.md),
[resources/js/CLAUDE.md](resources/js/CLAUDE.md).

## Working method — follow this for every task

Every feature, bugfix and refactor. Make steps 1–4 visible in your reply; do not skip step 6.

1. **Situation** — what exists around this already, citing the relevant docs and files.
2. **Proposal** — what you will build or change, in a few sentences.
3. **Security consideration** — walk through it explicitly, using
   [docs/SECURITY.md](docs/SECURITY.md) §5. State the conclusion even when it is "no
   particular risk". The value is in having looked.
4. **Documentation impact** — which files need updating.
5. **Implementation** — including tests. Every change is programmatically tested.
6. **Update the documentation** — in the same change as the code, never as a follow-up task.

**A feature is not finished until its documentation is correct again.** A stale `CLAUDE.md`
or architecture document is worse than none, because it invites trust it has not earned.

## Security wins over functionality

This is a hard rule, not a preference. Full reasoning in [docs/SECURITY.md](docs/SECURITY.md).

- Given a choice between a simpler or faster implementation and a safer one, build the safer
  one — even when it is more work, even when nobody asked for it.
- Applies with particular force to: authorisation between tenants, servers and customers;
  anything touching the agent or server connections; secrets and credentials; and anything
  that could expose one tenant's data to another.
- When the safer approach makes a feature slower, narrower or less convenient, **say so
  explicitly**. Never absorb that silently.
- Record any trade-off with a non-trivial security implication in
  [docs/SECURITY.md](docs/SECURITY.md) and [docs/DECISIONS.md](docs/DECISIONS.md).

## When to ask instead of deciding

Stop and ask — with the options and your own recommendation — when:

- the decision affects the data model in a way that is hard to reverse (tenant scoping, or
  core entities like Teams, Servers, Sites);
- there is a security/usability trade-off whose answer depends on a product choice that is
  not written down;
- anything in [docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md) becomes relevant to the task
  in hand;
- two reasonable implementations have structurally different consequences for how the
  platform scales later.

When in doubt, ask. Do not proceed on an assumption to save time.

## Organizations, Clients, and Sites — settled

Decided, see [ADR-025](docs/DECISIONS.md), [ADR-017](docs/DECISIONS.md) and
[ADR-018](docs/DECISIONS.md):

- **The tenancy boundary is `Organization`.** It is being renamed from `Team` — same single
  boundary, no second tenancy level, no layer inside it. A user may belong to several
  organizations, and that is a first-class scenario (a freelancer with their own practice plus
  one or more agencies), **not** a way to subdivide one company's work. The earlier guidance to
  name teams by function — `Front-end`, `Back-end`, `QA` — is **withdrawn**: it cannot work
  alongside ADR-019, which gives every resource exactly one owning tenant.
- **There is no personal organization.** `is_personal` is gone. Registration creates a normal
  organization named after the user, renameable from settings. Every user still always has at
  least one: you cannot leave or delete your last one, and `EnsureUserHasOrganization` creates one
  for you if your last membership is removed by someone else.
- **`Client` is a new entity owned by an `Organization`**, not a tenancy boundary. It has no
  membership or login of its own. `Site` (and later `Domain`, `Mailbox`) carries a nullable
  `client_id` for grouping, reporting, and future billing/ticketing.
- **The hosted resource is `Site`**, with a required `type` column (`wordpress` at launch).
  Multi-process types get child `SiteService` rows; single-process types have none.

Four more decisions are accepted and equally unimplemented:

- **Tenant routes are `/org/{organization}/…`** ([ADR-031](docs/DECISIONS.md)). The literal
  `org/` segment keeps the handle namespace free, so no reserved-word list is needed and
  `/settings/…` is exclusively personal. There is one route parameter: `{organization}`.
- **The URL identifier is a `handle`** ([ADR-030](docs/DECISIONS.md)), seeded from the name once
  at creation and then independent of it. Renaming never changes a URL; changing the handle is a
  separate, explicit action that does break existing links. A handle is never reissued —
  uniqueness spans the live column, soft-deleted rows and `organization_handles`. Reuse
  `GeneratesHandle` for `Site`, `Server` and `Client`.
- **Admins manage members ranking below their own role** ([ADR-028](docs/DECISIONS.md)) —
  Members only, never another Admin or the Owner, and never inviting above Member.
- **Recovering an abandoned organization is a manual, documented procedure**
  ([ADR-029](docs/DECISIONS.md)), not a self-service takeover.
- **Per-member resource visibility is deliberately still open** ([Q13](docs/OPEN_QUESTIONS.md)).
  Every member sees everything in their organization. If you are about to write a resource query
  for `Site` or `Server`, read Q13 first — that is the moment the assumption sets.

**Nearly all of this is implemented.** The rename and the handle change landed on 2026-08-17
(phases 1–5 of [docs/ORGANIZATION_RENAME.md](docs/ORGANIZATION_RENAME.md)); `composer ci:check`
is green on 113 tests. One phase remains: **Admins still cannot manage members** (phase 6,
[ADR-028](docs/DECISIONS.md), tracked as gap G9).

Do the rest before `Site`, `Server` or `Client` exist; every new domain multiplies the work. The
plan carries the remaining steps, the security review, and a list of the six things the plan
itself got wrong the first time.

Do not re-litigate these. Raise it again only if new information genuinely contradicts one
of the ADRs above.

## Practical notes

- **This is a git repository**, on `main`. Use it — commit meaningful changes, don't rely on
  the decision log alone.
- `CLAUDE.md` and `AGENTS.md` are kept identical, and both carry **two generated blocks**:
  the Boost guidelines at the top (rewritten by `boost:update`) and the Vite+ section at the
  bottom (owned by `vp`). Hand-written project guidance goes strictly between them.
- `resources/js/actions/` and `resources/js/routes/` are Wayfinder output — never hand-edit.
- PHP DTOs in `app/Data/` and TypeScript types in `resources/js/types/` are paired by hand.
  Change both together.
- **The frontend toolchain is Vite+ (ADR-012).** Oxlint replaced ESLint, Oxfmt replaced
  Prettier, and both are configured inside `vite.config.ts`. Ignore any instruction above
  that refers to ESLint, Prettier or `npm run …` — the Boost block is regenerated from
  installed packages and is stale on this point until the next `composer update`.

## Checks before calling a change done

```bash
vendor/bin/pint --dirty --format agent
```

```bash
composer ci:check
```

`ci:check` is what the GitHub workflow runs: Oxlint, Oxfmt, `tsc`, Pint, PHPStan and Pest.
It must pass before a change is done.

Call PHPStan through `composer types:check`, never as `vendor/bin/phpstan analyse` — it
needs `--memory-limit=1G` and otherwise crashes with an error that does not mention memory.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->
