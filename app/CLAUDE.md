# Backend conventions (`app/`)

Scoped guidance for PHP work. The root [CLAUDE.md](../CLAUDE.md) has the working method and
the security rule; this file covers how code in `app/` is structured.

> `app/` is organised **by Laravel type, not by domain**. Whether to move to domain folders
> once Servers and Sites arrive is unresolved — see
> [docs/OPEN_QUESTIONS.md](../docs/OPEN_QUESTIONS.md) (Q3). Do not create a domain folder
> without asking.

## Where things go

| Directory           | Contains                                           | Notes                                                                                     |
| ------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `Actions/`          | Single-purpose operations with a `handle()` method | Where a mutation is non-trivial or reused. Wrap multi-table writes in `DB::transaction()` |
| `Concerns/`         | Traits shared across models or requests            | `HasTeams` is the tenancy surface on `User`                                               |
| `Data/`             | `readonly` DTOs passed to Inertia                  | Constructor property promotion, no logic                                                  |
| `Enums/`            | Backed string enums                                | `TitleCase` keys, behaviour as methods on the enum                                        |
| `Http/Controllers/` | Thin controllers                                   | Authorise, delegate, render. No business logic                                            |
| `Http/Middleware/`  | Cross-cutting request concerns                     | `EnsureTeamMembership` is the tenant boundary                                             |
| `Http/Requests/`    | Validation and request authorisation               | Custom rules go in `Rules/`, not inline closures                                          |
| `Http/Responses/`   | Fortify response contract overrides                | Post-auth redirect targets                                                                |
| `Models/`           | Eloquent models                                    | Full `@property` docblocks; `#[Fillable]` / `#[Hidden]` attributes                        |
| `Notifications/`    | Outbound notifications                             | Currently sent synchronously — see Q8                                                     |
| `Policies/`         | Authorisation policies                             | Ask for a `TeamPermission`, never a role string                                           |
| `Rules/`            | Reusable validation rules                          |                                                                                           |

There is no `Jobs/`, `Services/` or `Events/` directory yet. Adding one is a structural
decision — ask first.

## Non-negotiables

### Tenant scoping

Load tenant-owned resources **through the team relationship**, never globally:

```php
// Correct — a missed membership yields a 404
$server = $team->servers()->findOrFail($id);

// Wrong — relies on a check someone will eventually forget
$server = Server::findOrFail($id);
abort_unless($server->team_id === $team->id, 403);
```

Every tenant route belongs inside the `EnsureTeamMembership` group. Every tenant-owned
table carries the tenant key as a column.

### Authorisation

- Check a `TeamPermission` via `TeamPolicy` or `$user->hasTeamPermission()`. Never compare
  role strings.
- Authorise on **every** mutating request, even when the UI hides the button. The
  `TeamPermissions` DTO controls display; the policy controls access.
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
- Descriptive names: `hasTeamPermission()`, not `can()`.
- `php artisan make:*` to create files, with `--no-interaction`.
- `vendor/bin/pint --dirty --format agent` after editing PHP.

## Testing

Every change is tested. Feature tests by default, in `tests/Feature/`, mirroring the
controller structure.

**Test the negative case.** For anything tenant-scoped, the test that matters is the one
proving a non-member gets a 403 or 404 — not the happy path. A feature is not covered
because the success case passes.

```bash
php artisan test --compact --filter=TeamInvitation
```

Use factories and their states. Do not create models by hand in tests.
