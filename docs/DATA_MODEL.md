# Data model

_Last verified against the migrations and models: 2026-08-15._

> **Pending rename.** [ADR-025](DECISIONS.md) renames `Team` to `Organization` and removes
> `is_personal`. Not implemented — the tables below are what the migrations actually create
> today. The target names and the migration rewrite are in
> [ORGANIZATION_RENAME.md](ORGANIZATION_RENAME.md) §2 and §3.3; the `is_personal` removal,
> including the nine call sites that depend on it, is §4.
>
> Summary of what changes here: `teams` → `organizations`, `team_members` →
> `organization_members`, `team_invitations` → `organization_invitations`, `team_id` →
> `organization_id`, `users.current_team_id` → `users.current_organization_id`, and
> `teams.is_personal` is dropped. `Membership` keeps its name.
>
> Two further changes land in the same plan: [ADR-027](DECISIONS.md) replaces `slug` with a
> random immutable `public_id`, and [ADR-028](DECISIONS.md) revises the permission table — Admin
> gains member management, bounded to roles below its own. Both are flagged in place below.

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

**Replaced by [ADR-027](DECISIONS.md), not yet implemented.** `slug` becomes `public_id`: a
random twelve-character token, generated once and **immutable**. The non-sequential argument
above is kept and strengthened — a name-derived slug still leaks *which* customers exist, even if
not how many, so `/some-agency/` could be probed. The readability argument is dropped, and that
is a genuine loss, accepted deliberately: what the URL must guarantee is that it resolves to
exactly one tenant, and that survives. It also removes the bug this table's `slug` row does not
mention — `Organization::booted()` currently regenerates the slug on **rename**, silently
breaking every existing link.

**Why slug uniqueness includes soft-deleted teams.** `GeneratesUniqueTeamSlugs` queries
`withTrashed()`. If a deleted team's slug were reissued, links and bookmarks pointing at
the old tenant would silently resolve to a _different_ tenant's data. That is a
cross-tenant leak, so the slug is permanently retired.

**Why every user gets a personal team.** `CreateNewUser` creates one inside the
registration transaction. A user is therefore never in a state of having no tenant, which
removes an entire class of null-team edge cases from every downstream feature. Personal
teams cannot be deleted or left (`TeamPolicy::delete`, `TeamPolicy::leave`), so a user
always retains a fallback tenant.

**Superseded by [ADR-025](DECISIONS.md), not yet implemented.** The invariant is kept; the
mechanism changes. `is_personal` is dropped, and the guarantee is enforced by two rules
instead: a user cannot leave or delete their last organization (the voluntary case), and a
user whose last membership is removed by an owner gets a new organization created for them
(the involuntary case, which cannot be blocked). The consequence for downstream code is
unchanged — a current organization always resolves for an authenticated user.

**Known asymmetry, resolved but not yet implemented.** `Team` uses `SoftDeletes`, but
`TeamController::destroy` hard-deletes the team's memberships and invitations before
soft-deleting the team. A restored team would come back with no members and no owner.
[ADR-019](DECISIONS.md) settles this: memberships, invitations and owned resources should be
soft-deleted alongside the team, so a restore is coherent. The controller has not been
updated yet.

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

**Not yet enforced:** there is no constraint guaranteeing exactly one Owner per team.
`Team::owner()` returns the first member whose role is `owner`. Nothing at the database
level prevents zero owners or several. [ADR-020](DECISIONS.md) settles that a database
constraint and a transfer-ownership flow are both needed; neither is built yet.

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

**Revised by [ADR-028](DECISIONS.md), not yet implemented.** Admin gains `member:add`,
`member:update`, `member:remove` and `invitation:create`, each bounded to roles ranking
**strictly below the actor's own** — so an Admin manages Members and nothing else. The bound
lives in `OrganizationPolicy` via `TeamRole::level()` (Owner 3, Admin 2, Member 1), which exists
today and is used by nothing. `assignable()` still excludes Owner, so the sentence above about
ownership remains true. See ADR-028 for the revised table.

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
   reasons the team slug is. [ADR-027](DECISIONS.md) settles this with one shared
   implementation: the `GeneratesPublicId` trait built for `Organization` is reused by `Site`,
   `Server` and `Client`, rather than each table re-deciding.
4. Anything holding a credential to reach a customer server is encrypted at rest, and is
   never exposed through an Inertia prop.

These are consequences of the tenant-isolation rule in [SECURITY.md](SECURITY.md), not
independent preferences.

Two of the entities coming next are already decided, though not yet built — see
[ADR-017](DECISIONS.md) and [ADR-018](DECISIONS.md):

- **`Client`** — owned by a `Team`, not a tenancy level. `Site` (and later `Domain`,
  `Mailbox`) carries a nullable `client_id` for grouping and future billing/ticketing.
- **`Site`** — the hosted resource, anchored to a domain, with a required `type` column.
  Multi-process types (e.g. `docker_compose`) get child `SiteService` rows; `wordpress` and
  other single-process types have none.
