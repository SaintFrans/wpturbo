# Data model

_Last verified against the migrations and models: 2026-08-18._

Six tables carry the domain today: `users`, `organizations`, `organization_handles`,
`organization_members`, `organization_invitations`, `audit_log_entries`. Everything else in the
database is framework scaffolding (cache, jobs, sessions, passkeys, password reset tokens).

There is **no** entity for servers, sites, agents, deployments or billing. The hosting domain is
unmodelled.

## Entity map

```
     ┌─────────────────────────┐           ┌──────────────────────┐
     │          User           │           │     Organization     │
     ├─────────────────────────┤           ├──────────────────────┤
     │ id                      │           │ id                   │
     │ name                    │◀──┐   ┌──▶│ name                 │
     │ email                   │   │   │   │ handle ◀─────────────┼── unique, in the URL
     │ password                │   │   │   │ deleted_at           │
     │ 2FA columns             │   │   │   └──────────────────────┘
     │ current_organization_id ├───┼───┘        ▲            ▲
     └─────────────────────────┘   │            │            │
                 ▲                 │            │            │
                 │  ┌──────────────┴───────┐    │   ┌────────┴─────────────┐
                 └──┤      Membership      ├────┘   │ organization_handles │
                    │ organization_members │        ├──────────────────────┤
                    ├──────────────────────┤        │ handle  (unique)     │
                    │ organization_id      │        │ organization_id      │
                    │ user_id              │        └──────────────────────┘
                    │ role                 │  UNIQUE(organization_id, user_id)
                    └──────────────────────┘  owner | admin | member

                          ┌──────────────────────────┐
                          │ OrganizationInvitation   │
                          ├──────────────────────────┤
        Organization ◀────┤ organization_id          │
        User         ◀────┤ invited_by               │
                          │ code   (unique)          │ ← the route key
                          │ email                    │
                          │ role                     │
                          │ expires_at               │
                          │ accepted_at              │
                          └──────────────────────────┘
```

## Entities

### User

`users`, extended by the `HasOrganizations` concern
(`App\Concerns\Organizations\HasOrganizations`).

| Column                                                                      | Notes                                          |
| --------------------------------------------------------------------------- | ---------------------------------------------- |
| `name`, `email`, `password`                                                 | `password` is cast `hashed`                    |
| `email_verified_at`                                                         | Fortify email verification                     |
| `two_factor_secret`, `two_factor_recovery_codes`, `two_factor_confirmed_at` | Fortify 2FA                                    |
| `current_organization_id`                                                   | FK → `organizations`, nullable, `nullOnDelete` |

`password`, `two_factor_secret`, `two_factor_recovery_codes` and `remember_token` are marked
`#[Hidden]`, which matters because `HandleInertiaRequests` shares the whole user model as a page
prop on every request.

`User` stays flat in `app/Models/` — it belongs to no domain ([ADR-026](DECISIONS.md)).

**Why `current_organization_id` lives on the user, not in the session.** Organization context
survives logout, device changes and email links. A user following an invitation link from their
phone lands in the right tenant. The cost is a write on every switch; that is acceptable at the
frequency switching actually happens.

**Only an explicit switch writes this column.** Visiting `/org/{handle}/…` scopes that request and
nothing more, so following a colleague's link does not repoint the reader's other tabs
([ADR-025](DECISIONS.md)). A read performing a write was the problem; `organizations.switch` is a
`POST` and is the one route that changes it.

### Organization

`organizations`. Soft-deleted. Route key is `handle`, not `id`.

| Column       | Notes                                                                   |
| ------------ | ----------------------------------------------------------------------- |
| `name`       | Free text. Required, max 255 — no reserved-word check                   |
| `handle`     | **Unique.** Seeded from the name at creation, never changed by a rename |
| `deleted_at` | Soft delete                                                             |

**Why the handle is the route key.** It is the tenant identifier in the URL
(`/org/acme-agency/dashboard`). Exposing sequential integer IDs would leak how many customers
exist and invite enumeration. The handle also keeps the URL readable, which matters when agency
staff share links internally.

**Why the name is not validated against reserved words.** It used to be, because the slug derived
from it occupied the first URL segment. Since [ADR-031](DECISIONS.md) every tenant route sits
behind a literal `org/` segment, so a handle cannot shadow an application route and a name cannot
shadow anything at all. An organization may legitimately be called "Settings". Only the handle is
validated, by `App\Rules\Organizations\OrganizationHandle`, and only for shape and availability.

**Why renaming never changes the handle.** `Organization::booted()` seeds the handle in `creating`
and has no `updating` counterpart. Before [ADR-030](DECISIONS.md) the slug was regenerated on
rename, which silently invalidated every bookmark, shared link and mail archive the moment someone
renamed their organization. Changing the handle is now a separate, explicit action on the General
settings tab, warned about in the UI.

**Why a handle is never reissued.** `GeneratesHandle` checks three sources: the live column,
soft-deleted rows, and `organization_handles`. If a retired handle were reissued, links and
bookmarks pointing at the old tenant would silently resolve to a _different_ tenant's data — a
cross-tenant leak triggered by nothing more than a stale bookmark ([ADR-006](DECISIONS.md)).

**Why every user gets an organization at registration.** `CreateNewUser` creates one inside the
registration transaction, named after the user with no suffix. A user is therefore never in a
state of having no tenant, which removes an entire class of null-tenant edge cases from every
downstream feature.

**There is no personal organization.** The one created at registration is ordinary — renameable,
and deletable once a second exists. The invariant is held by two rules instead of a flag
([ADR-025](DECISIONS.md)):

- **Voluntary** — `OrganizationPolicy` refuses to let a user leave or delete their _last_
  organization.
- **Involuntary** — an owner can remove someone, and an organization can be deleted out from
  under its members. Neither can reasonably be forbidden, so
  `App\Actions\Organizations\EnsureUserHasOrganization` restores the invariant afterwards,
  creating an organization named after the user. It only ever creates something they own; it never
  grants access to anything that existed.

Note that both policy conditions guard **two** things: the last-organization rule _and_, in
`leave`, the sole owner. They are unrelated and both must hold.

**Known asymmetry, resolved but not yet implemented.** `Organization` uses `SoftDeletes`, but
`OrganizationController::destroy` hard-deletes memberships and invitations before soft-deleting
the organization. A restored organization would come back with no members and no owner.
[ADR-019](DECISIONS.md) settles this: they should be soft-deleted together, so a restore is
coherent.

### organization_handles

Every handle an organization has ever held, including the current one. Rows are never deleted.

| Column            | Notes                             |
| ----------------- | --------------------------------- |
| `handle`          | **Unique** across the whole table |
| `organization_id` | FK, `cascadeOnDelete`             |

**Why this table exists.** A mutable handle releases its old value. Without a record, another
organization could claim `acme` and inherit every stale bookmark pointing at the first one — the
hazard ADR-006 exists to prevent, arriving through a door ADR-006 never anticipated. It is also
the seam where handle redirects would live, if they are ever wanted.

### Membership

`organization_members`. An Eloquent `Pivot` model with its own auto-incrementing key. The class is
`App\Models\Organizations\Membership` — the name is domain-neutral and survived the rename.

| Column                       | Notes                                                      |
| ---------------------------- | ---------------------------------------------------------- |
| `organization_id`, `user_id` | Both `cascadeOnDelete`. `UNIQUE(organization_id, user_id)` |
| `role`                       | Cast to the `OrganizationRole` enum                        |

**Why a pivot model rather than a plain pivot table.** The role is domain data, not a join detail.
Modelling it lets `Membership` be queried, cast and type-hinted directly
(`$user->organizationMemberships()`) rather than reaching through `->pivot` everywhere.

**Why the unique constraint is at the database level.** Duplicate memberships would give a user two
roles in one organization, and `organizationRole()` returns `first()` — so the effective permission
would depend on row order. The constraint makes that state unrepresentable rather than merely
unlikely.

**Not yet enforced:** nothing guarantees exactly one Owner per organization.
`Organization::owner()` returns the first member whose role is `owner`. Nothing at the database
level prevents zero owners or several. [ADR-020](DECISIONS.md) settles that a partial unique index
and a transfer-ownership flow are both needed; neither is built.

### OrganizationInvitation

`organization_invitations`. Route key is `id` — see below for why that is not `code_hash`.

| Column                          | Notes                                                                  |
| ------------------------------- | ---------------------------------------------------------------------- |
| `code_hash`                     | SHA-256 digest of a `Str::random(64)` code generated on create. Unique |
| `organization_id`, `invited_by` | FKs, `cascadeOnDelete`                                                 |
| `email`                         | The invitee. Compared case-insensitively on accept                     |
| `role`                          | Cast to `OrganizationRole`                                             |
| `expires_at`                    | Set to `now()->addDays(3)` on create                                   |
| `accepted_at`                   | Null while pending                                                     |

**The plaintext code is never stored** ([ADR-033](DECISIONS.md)). It exists only in memory on the
`OrganizationInvitation` instance that just created it (`$invitation->plainCode`, a non-persisted
property) and in the URL emailed to the invitee. A database read — an operator, a stolen dump —
therefore yields no usable invitation link, only digests that cannot be reversed into one.

**Why the code is not the general route key.** Only one lookup is genuinely reached by someone who
is not authenticated yet: the login/register page reading `?invitation=` from the emailed link,
resolved in `FortifyServiceProvider` by hashing the incoming value and querying `code_hash`. Every
other invitation route — `invitations.accept`, `invitations.decline`,
`organizations.invitations.destroy` — is only ever hit by an already-authenticated user, and what
actually authorises those was always the check below, not the code's secrecy. They bind by `id`.

**The code alone is not sufficient authority, for the one route that still uses it.**
`ValidOrganizationInvitation` additionally requires that the authenticated user's email matches
the invitation's, case-insensitively. A leaked invitation link cannot be redeemed by whoever finds
it — they would also need control of the invited mailbox. Deliberate; see
[SECURITY.md](SECURITY.md) and [ADR-009](DECISIONS.md).

**Why invitations expire and are pruned.** Three days, with a daily scheduled prune in
`routes/console.php`. An unbounded pending invitation is a standing grant of access to a tenant,
held by an address that may change hands.

### AuditLogEntry

`audit_log_entries` ([ADR-032](DECISIONS.md)). `App\Models\Audit\AuditLogEntry` — its own domain,
`Audit`, since it will be written to by every future domain (`Server`, `Site`), not just
`Organization`. Append-only: no `updated_at` column, and nothing in the application updates a row.

| Column                     | Notes                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| `organization_id`          | **No foreign key.** Indexed, but must outlive the organization's eventual hard purge (ADR-036)    |
| `actor_id`                 | FK → `users`, nullable, `nullOnDelete`. Null for operator actions (ADR-029) and, later, the agent |
| `action`                   | Cast to the `AuditAction` enum, e.g. `invitation.created`, `member.removed`                       |
| `target_type`, `target_id` | What the action was done to. No foreign key, for the same reason as `organization_id`             |
| `target_label`             | A snapshot of the target's identifying name/email, taken at write time                            |
| `context`                  | Small JSON detail (e.g. a role transition). Never a payload — see below                           |
| `ip_address`               | Nullable, 45 chars (IPv6-safe)                                                                    |
| `created_at`               | The only timestamp — there is no `updated_at`                                                     |

**No foreign key on `organization_id` or `target_id`, unlike every other tenant-owned table.** This
is the one deliberate exception noted in [SECURITY.md](SECURITY.md) §5 rule 2, and it exists for a
reason specific to this table: entries must survive the organization's eventual hard purge, and the
target is routinely already force-deleted by the very action being recorded — cancelling an
invitation deletes it in the same request that writes the entry describing it. `target_label`
exists because of this: the target usually cannot be resolved by the time anyone reads the log.

**Eight events are recorded today**: an invitation created, cancelled, accepted or declined; a
member's role changed, a member removed, a member leaving voluntarily; and an organization
deleted. The last two — a voluntary departure and a declined invitation — were added during
implementation; ADR-032 named the others.

**Read access is Owner and Admin only** — a `ViewAuditLog` permission, the one deliberate exception
to [ADR-037](DECISIONS.md)'s "every member sees everything." This is a record of administrative
and destructive action, not a resource a member needs to see to do their job.

**Append-only is a convention, not a database guarantee.** The model exposes no update path and
nothing in the application writes one. Enforcing it at the database level is a deployment concern,
out of scope here.

## Roles and permissions

Roles are an enum (`App\Enums\Organizations\OrganizationRole`), not strings in the database schema,
and permissions are a separate enum (`App\Enums\Organizations\OrganizationPermission`) mapped from
role to permission set.

| Permission            | Owner | Admin | Member |
| --------------------- | :---: | :---: | :----: |
| `organization:update` |  ✅   |  ✅   |   —    |
| `organization:delete` |  ✅   |   —   |   —    |
| `member:add`          |  ✅   |  ✅¹  |   —    |
| `member:update`       |  ✅   |  ✅¹  |   —    |
| `member:remove`       |  ✅   |  ✅¹  |   —    |
| `invitation:create`   |  ✅   |  ✅¹  |   —    |
| `invitation:cancel`   |  ✅   |  ✅   |   —    |
| `audit_log:view`      |  ✅   |  ✅   |   —    |

¹ Only against a role ranking **strictly below** the actor's own ([ADR-028](DECISIONS.md)).

**Why permissions are separate from roles.** Checks in policies and controllers ask "does this user
hold `member:remove`?", never "is this user an admin?". Adding a role, or moving a capability
between roles, is then a one-line change in `OrganizationRole::permissions()` instead of a
search-and-replace across the codebase.

**Why Admins can manage Members but nothing above them.** Until [ADR-028](DECISIONS.md) only the
Owner could revoke access, so an unreachable Owner meant a departing employee kept theirs — the
safest-looking permission map produced the least safe outcome. Widening it is bounded by one
comparison, `OrganizationRole::outranks()`, which blocks self-promotion, removing the Owner and
minting a peer Admin without a special case for each.

The bound lives in `OrganizationPolicy`, not in the permission map, so the enum keeps reading as a
plain specification. **It is applied to the role, not just the action:** `updateMember` checks
both the member's current role and the role they would gain, and `inviteMember` checks the invited
role. Checking only the action is what let any Admin invite a new Owner until this landed
(G11 in [SECURITY.md](SECURITY.md)).

`assignableBy($actor)` returns the roles an actor may hand out. Owner never appears, because a
role does not outrank itself — ADR-020's transfer flow stays the only route to ownership.

`OrganizationRole::level()` also supports `isAtLeast()`, used by the
`EnsureOrganizationMembership` middleware's optional minimum-role parameter. That parameter is
currently unused by any route.

## Data exposed to the frontend

Two readonly DTOs in `app/Data/Organizations/` shape what crosses into React:

- `UserOrganization` — id, name, handle, isPersonal, role, roleLabel, isCurrent
- `OrganizationPermissions` — eight booleans, one per `OrganizationPermission`

`HandleInertiaRequests` shares `currentOrganization` and `organizations` as lazy props on every
page.

**Why booleans rather than the role.** The frontend renders on capability
(`permissions.canDeleteOrganization`), never on role name. The UI cannot then drift out of sync
with the backend's permission map. It also keeps the frontend honest: these booleans decide what is
_shown_; the policy decides what is _allowed_, and the policy is checked again on every mutating
request.

Their TypeScript counterparts live in `resources/js/types/organizations.ts` and are maintained by
hand. **Changing a DTO means changing that file in the same commit.**

Note the existing inconsistency: the DTOs serialise camelCase (`isPersonal`, `handle`), while
hand-built controller arrays use snake_case for some keys (`role_label`). Match whatever the
endpoint you are touching already emits rather than "fixing" it in passing.

## Modelling constraints for what comes next

When Servers and Sites are added:

1. Every tenant-owned table gets an `organization_id` foreign key. Ownership is a column, never
   something inferred from a chain of joins.
2. Access is scoped at query time via the organization relationship, never by loading and then
   filtering in PHP.
3. Route keys for tenant resources are non-sequential, for the same enumeration reasons the
   organization handle is. [ADR-030](DECISIONS.md) settles this with one shared implementation:
   the `GeneratesHandle` trait built for `Organization` is reused by `Site`, `Server` and `Client`
   rather than each table re-deciding.
4. Anything holding a credential to reach a customer server is encrypted at rest, and is never
   exposed through an Inertia prop.

These are consequences of the tenant-isolation rule in [SECURITY.md](SECURITY.md), not independent
preferences.

**Every member sees everything in their organization, by design** ([ADR-037](DECISIONS.md)).
`Client`, `Server` and `Site` queries are scoped by `organization_id` alone — no per-member or
per-client visibility layer. What varies by role is capability, not visibility: destructive or
sensitive actions (`site:delete`, `client:delete`, `server:delete`, …) are added to
`OrganizationPermission` as each entity is built, following the existing role→permission model
(ADR-005, ADR-028), not a new grant table.

Two of the entities coming next are already decided, though not yet built — see
[ADR-017](DECISIONS.md) and [ADR-018](DECISIONS.md):

- **`Client`** — owned by an `Organization`, not a tenancy level. `Site` (and later `Domain`,
  `Mailbox`) carries a nullable `client_id` for grouping and future billing/ticketing.
- **`Site`** — the hosted resource, anchored to a domain, with a required `type` column.
  Multi-process types (e.g. `docker_compose`) get child `SiteService` rows; `wordpress` and other
  single-process types have none.
