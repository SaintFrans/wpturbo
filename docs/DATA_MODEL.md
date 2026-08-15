# Data model

_Last verified against the migrations and models: 2026-08-15._

Four tables carry the domain today: `users`, `teams`, `team_members`, `team_invitations`.
Everything else in the database is framework scaffolding (cache, jobs, sessions, passkeys,
password reset tokens).

There is **no** entity for servers, sites, agents, deployments or billing. The hosting
domain is unmodelled.

## Entity map

```
        ┌───────────┐                        ┌───────────┐
        │   User    │                        │   Team    │
        ├───────────┤                        ├───────────┤
        │ id        │                        │ id        │
        │ name      │◀───┐              ┌───▶│ name      │
        │ email     │    │              │    │ slug ◀────┼── unique, appears in the URL
        │ password  │    │              │    │is_personal│
        │ 2FA cols  │    │              │    │ deleted_at│
        │current_team_id ┼──────────────┘    └───────────┘
        └───────────┘    │                        ▲
              ▲          │  ┌──────────────┐      │
              │          └──┤  Membership  ├──────┘
              └─────────────┤ team_members │
                            ├──────────────┤
                            │ team_id      │
                            │ user_id      │  UNIQUE(team_id, user_id)
                            │ role         │  owner | admin | member
                            └──────────────┘

                            ┌──────────────────┐
                            │ TeamInvitation   │
                            ├──────────────────┤
       Team ◀───────────────┤ team_id          │
       User ◀───────────────┤ invited_by       │
                            │ code   (unique)  │ ← the route key
                            │ email            │
                            │ role             │
                            │ expires_at       │
                            │ accepted_at      │
                            └──────────────────┘
```

## Entities

### User

`users`, extended by the `HasTeams` concern.

| Column                                                                      | Notes                                  |
| --------------------------------------------------------------------------- | -------------------------------------- |
| `name`, `email`, `password`                                                 | `password` is cast `hashed`            |
| `email_verified_at`                                                         | Fortify email verification             |
| `two_factor_secret`, `two_factor_recovery_codes`, `two_factor_confirmed_at` | Fortify 2FA                            |
| `current_team_id`                                                           | FK → `teams`, nullable, `nullOnDelete` |

`password`, `two_factor_secret`, `two_factor_recovery_codes` and `remember_token` are
marked `#[Hidden]`, which matters because `HandleInertiaRequests` shares the whole user
model as a page prop on every request.

**Why `current_team_id` lives on the user, not in the session.** Team context survives
logout, device changes and email links. A user following an invitation link from their
phone lands in the right tenant. The cost is a write on every team switch; that is
acceptable at the frequency team switching actually happens.

### Team

`teams`. Soft-deleted. Route key is `slug`, not `id`.

| Column        | Notes                                                      |
| ------------- | ---------------------------------------------------------- |
| `name`        | Validated by `App\Rules\TeamName`                          |
| `slug`        | **Unique.** Generated from the name, regenerated on rename |
| `is_personal` | Marks the team created automatically at registration       |
| `deleted_at`  | Soft delete                                                |

**Why the slug is the route key.** The slug is the tenant identifier in the URL
(`/acme-agency/dashboard`). Exposing sequential integer IDs in tenant URLs would leak how
many customers exist and invite enumeration. The slug also makes the URL readable, which
matters when agency staff share links internally.

**Why slug uniqueness includes soft-deleted teams.** `GeneratesUniqueTeamSlugs` queries
`withTrashed()`. If a deleted team's slug were reissued, links and bookmarks pointing at
the old tenant would silently resolve to a _different_ tenant's data. That is a
cross-tenant leak, so the slug is permanently retired.

**Why every user gets a personal team.** `CreateNewUser` creates one inside the
registration transaction. A user is therefore never in a state of having no tenant, which
removes an entire class of null-team edge cases from every downstream feature. Personal
teams cannot be deleted or left (`TeamPolicy::delete`, `TeamPolicy::leave`), so a user
always retains a fallback tenant.

**Known asymmetry.** `Team` uses `SoftDeletes`, but `TeamController::destroy` hard-deletes
the team's memberships and invitations before soft-deleting the team. A restored team would
come back with no members and no owner. Either the delete should be a hard delete, or the
memberships should be soft-deleted alongside it. Unresolved — see
[OPEN_QUESTIONS.md](OPEN_QUESTIONS.md).

### Membership

`team_members`. An Eloquent `Pivot` model with its own auto-incrementing key.

| Column               | Notes                                              |
| -------------------- | -------------------------------------------------- |
| `team_id`, `user_id` | Both `cascadeOnDelete`. `UNIQUE(team_id, user_id)` |
| `role`               | Cast to the `TeamRole` enum                        |

**Why a pivot model rather than a plain pivot table.** The role is domain data, not a join
detail. Modelling it lets `Membership` be queried, cast and type-hinted directly
(`$user->teamMemberships()`), rather than reaching through `->pivot` everywhere.

**Why the unique constraint is at the database level.** Duplicate memberships would give a
user two roles on one team, and `teamRole()` returns `first()` — so the effective
permission would depend on row order. The constraint makes that state unrepresentable
rather than merely unlikely.

**Not enforced:** there is no constraint guaranteeing exactly one Owner per team.
`Team::owner()` returns the first member whose role is `owner`. Nothing at the database
level prevents zero owners or several. See [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md).

### TeamInvitation

`team_invitations`. Route key is `code`.

| Column                  | Notes                                                         |
| ----------------------- | ------------------------------------------------------------- |
| `code`                  | `Str::random(64)`, unique, generated on create. The route key |
| `team_id`, `invited_by` | FKs, `cascadeOnDelete`                                        |
| `email`                 | The invitee. Compared case-insensitively on accept            |
| `role`                  | Cast to `TeamRole`                                            |
| `expires_at`            | Set to `now()->addDays(3)` on create                          |
| `accepted_at`           | Null while pending                                            |

**Why the code is the route key.** An invitation URL must be usable by someone who does not
yet have an account, so it cannot be behind normal authorisation at discovery time. A
64-character random code makes the URL itself unguessable.

**The code alone is not sufficient authority.** `ValidTeamInvitation` additionally requires
that the authenticated user's email matches the invitation's email, case-insensitively. So
a leaked invitation link cannot be redeemed by whoever finds it — they would also need
control of the invited mailbox. This is deliberate; see [SECURITY.md](SECURITY.md).

**Why invitations expire and are pruned.** Three days, with a daily scheduled prune in
`routes/console.php`. An unbounded pending invitation is a standing grant of access to a
tenant, held by an address that may change hands.

## Roles and permissions

Roles are an enum (`App\Enums\TeamRole`), not strings in the database schema, and
permissions are a separate enum (`App\Enums\TeamPermission`) mapped from role to permission
set.

| Permission          | Owner | Admin | Member |
| ------------------- | :---: | :---: | :----: |
| `team:update`       |  ✅   |  ✅   |   —    |
| `team:delete`       |  ✅   |   —   |   —    |
| `member:add`        |  ✅   |   —   |   —    |
| `member:update`     |  ✅   |   —   |   —    |
| `member:remove`     |  ✅   |   —   |   —    |
| `invitation:create` |  ✅   |  ✅   |   —    |
| `invitation:cancel` |  ✅   |  ✅   |   —    |

**Why permissions are separate from roles.** Checks in policies and controllers ask "does
this user hold `member:remove`?", never "is this user an admin?". Adding a role, or moving
a capability between roles, is then a one-line change in `TeamRole::permissions()` instead
of a search-and-replace across the codebase.

**Why Admins can invite but not manage members.** An Admin can grow the team but cannot
change anyone's role or remove anyone — including cannot escalate themselves. Membership
control stays with the Owner. `TeamRole::assignable()` also excludes Owner from the
assignable list, so ownership cannot be granted through the member-role UI at all.

`TeamRole::level()` (Owner 3, Admin 2, Member 1) supports `isAtLeast()`, used by the
`EnsureTeamMembership` middleware's optional minimum-role parameter. That parameter is
currently unused by any route.

## Data exposed to the frontend

Two readonly DTOs in `app/Data/` shape what crosses into React:

- `UserTeam` — id, name, slug, isPersonal, role, roleLabel, isCurrent
- `TeamPermissions` — seven booleans, one per `TeamPermission`

`HandleInertiaRequests` shares `currentTeam` and `teams` as lazy props on every page.

**Why booleans rather than the role.** The frontend renders on capability
(`permissions.canDeleteTeam`), never on role name. The UI cannot then drift out of sync
with the backend's permission map. It also keeps the frontend honest: these booleans decide
what is _shown_; the policy decides what is _allowed_, and the policy is checked again on
every mutating request.

Their TypeScript counterparts live in `resources/js/types/teams.ts` and are maintained by
hand. **Changing a DTO means changing that file in the same commit.**

## Modelling constraints for what comes next

When Servers and Sites are added:

1. Every tenant-owned table gets a `team_id` foreign key. Ownership is a column, never
   something inferred from a chain of joins.
2. Access is scoped at query time via the team relationship, never by loading and then
   filtering in PHP.
3. Route keys for tenant resources should be non-sequential for the same enumeration
   reasons the team slug is.
4. Anything holding a credential to reach a customer server is encrypted at rest, and is
   never exposed through an Inertia prop.

These are consequences of the tenant-isolation rule in [SECURITY.md](SECURITY.md), not
independent preferences.
