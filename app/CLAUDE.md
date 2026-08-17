# Backend conventions (`app/`)

Scoped guidance for PHP work. The root [CLAUDE.md](../CLAUDE.md) has the working method and
the security rule; this file covers how code in `app/` is structured.

> `app/` is organised **by Laravel type, with a subfolder per domain inside each type**
> ([ADR-026](../docs/DECISIONS.md), which reversed ADR-021's domain-first plan). So
> `app/Models/Organizations/Organization.php`, `app/Policies/Organizations/OrganizationPolicy.php`,
> and later `app/Actions/Sites/`, `app/Models/Servers/`.
>
> Files belonging to no single domain stay flat in their type folder: `User`, `Providers`,
> `Console`, the Fortify actions, Inertia middleware, and shared validation-rule traits.
>
> **Add the domain subfolder from the first file**, even when it is the only one — `Servers`,
> `Sites` and `Clients` are close behind, and the alternative is moving the same files twice.
>
> Two consequences of the subfolder that PHPStan is the only thing to catch: a model's factory
> must sit in the matching `Database\Factories\{Domain}` namespace, and short class names in
> `@property` docblocks need a real `use` import once the class leaves the file's own namespace.

## Where things go

| Directory           | Contains                                           | Notes                                                                                        |
| ------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `Actions/`          | Single-purpose operations with a `handle()` method | Where a mutation is non-trivial or reused. Wrap multi-table writes in `DB::transaction()`    |
| `Concerns/`         | Traits shared across models or requests            | `HasOrganizations` is the tenancy surface on `User`                                          |
| `Data/`             | `readonly` DTOs passed to Inertia                  | Constructor property promotion, no logic                                                     |
| `Enums/`            | Backed string enums                                | `TitleCase` keys, behaviour as methods on the enum                                           |
| `Http/Controllers/` | Thin controllers                                   | Authorise, delegate, render. No business logic                                               |
| `Http/Middleware/`  | Cross-cutting request concerns                     | `EnsureOrganizationMembership` is the tenant boundary                                        |
| `Http/Requests/`    | Validation and request authorisation               | Custom rules go in `Rules/`, not inline closures                                             |
| `Http/Responses/`   | Fortify response contract overrides                | Post-auth redirect targets                                                                   |
| `Models/`           | Eloquent models                                    | Full `@property` docblocks; `#[Fillable]` / `#[Hidden]` attributes                           |
| `Notifications/`    | Outbound notifications                             | Currently sent synchronously; ADR-023 requires `ShouldQueue` + a rate limiter, not yet built |
| `Policies/`         | Authorisation policies                             | Ask for a `OrganizationPermission`, never a role string                                      |
| `Rules/`            | Reusable validation rules                          | No reserved-name rule any more — see below                                                   |

There is no `Jobs/`, `Services/` or `Events/` directory yet. Adding one is a structural
decision — ask first.

### Route keys

Tenant resources are addressed by a random, immutable `public_id`, never by a sequential id and
never by a slug of the name ([ADR-027](../docs/DECISIONS.md)). `Organization` gets one from the
`GeneratesPublicId` trait; **reuse that trait** for `Site`, `Server` and `Client` rather than
inventing a second scheme.

Two rules come with it. The identifier is assigned in `creating` and has no `updating`
counterpart — renaming must never change a URL. And uniqueness is checked with the soft-delete
scope dropped, so a deleted record's identifier is never reissued to a different tenant. That
also keeps the trait usable by resources that hard-delete, where the scope was never registered.

Because the identifier is no longer derived from the name, names need no reserved-word
validation: `App\Rules\OrganizationName` was deleted and ADR-008 is retired. An organization may
legitimately be called "Settings".

## Non-negotiables

### Tenant scoping

Load tenant-owned resources **through the organization relationship**, never globally:

```php
// Correct — a missed membership yields a 404
$server = $organization->servers()->findOrFail($id);

// Wrong — relies on a check someone will eventually forget
$server = Server::findOrFail($id);
abort_unless($server->organization_id === $organization->id, 403);
```

Every tenant route belongs inside the `EnsureOrganizationMembership` group. Every tenant-owned
table carries the tenant key as a column.

### Authorisation

- Check a `OrganizationPermission` via `OrganizationPolicy` or `$user->hasOrganizationPermission()`. Never compare
  role strings.
- Authorise on **every** mutating request, even when the UI hides the button. The
  `OrganizationPermissions` DTO controls display; the policy controls access.
- Put authorisation in the form request's `authorize()` when there is a form request, or
  `Gate::authorize()` at the top of the controller method. Follow whichever the sibling
  methods already use.

### Data exposure

Anything passed to `Inertia::render()` or shared in `HandleInertiaRequests` reaches the
browser. Never put credentials, tokens or secrets there. Mark sensitive model columns
`#[Hidden]` — the whole `User` model is serialised into page props on every request.

## Style

Beyond the Boost rules in the root file:

- Explicit return types and parameter type hints everywhere.
- Constructor property promotion; no empty `__construct()`.
- PHPDoc blocks over inline comments. Array shapes documented in PHPDoc.
- Curly braces on every control structure.
- Descriptive names: `hasOrganizationPermission()`, not `can()`.
- `php artisan make:*` to create files, with `--no-interaction`.
- `vendor/bin/pint --dirty --format agent` after editing PHP.

## Testing

Every change is tested. Feature tests by default, in `tests/Feature/`, mirroring the
controller structure.

**Test the negative case.** For anything tenant-scoped, the test that matters is the one
proving a non-member gets a 403 or 404 — not the happy path. A feature is not covered
because the success case passes.

```bash
php artisan test --compact --filter=OrganizationInvitation
```

Use factories and their states. Do not create models by hand in tests.
