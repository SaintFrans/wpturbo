# Organizations domain — local conventions

The tenancy layer. This is the security boundary of the whole platform: every future
feature inherits its isolation from what happens here. Read
[docs/DATA_MODEL.md](../../../../docs/DATA_MODEL.md) and
[docs/SECURITY.md](../../../../docs/SECURITY.md) before changing anything in it.

`Organization` is the settled tenancy boundary — see the "Organizations, Clients, and Sites —
settled" section of the root [CLAUDE.md](../../../../CLAUDE.md) and
[ADR-025](../../../../docs/DECISIONS.md) through [ADR-031](../../../../docs/DECISIONS.md). Do not
re-litigate the name or reopen a second tenancy level. Raise it again only if new information
genuinely contradicts one of those ADRs.

## The domain is spread across many type folders

Because `app/` is organised by Laravel type with a subfolder per domain inside each
([ADR-026](../../../../docs/DECISIONS.md)), organization code is not all here:

| Concern               | Location                                                                                                                                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Controllers           | `app/Http/Controllers/Organizations/` — `OrganizationController`, `OrganizationMemberController`, `OrganizationInvitationController`, `AuditLogController`                                                                    |
| Organization creation | `app/Actions/Organizations/CreateOrganization.php`, `EnsureUserHasOrganization.php`                                                                                                                                           |
| User-side tenancy API | `app/Concerns/Organizations/HasOrganizations.php`                                                                                                                                                                             |
| Handle generation     | `app/Concerns/Organizations/GeneratesHandle.php` — reused by `Site`, `Server`, `Client` (ADR-030)                                                                                                                             |
| Models                | `app/Models/Organizations/{Organization,Membership,OrganizationInvitation}.php`                                                                                                                                               |
| Roles and permissions | `app/Enums/Organizations/{OrganizationRole,OrganizationPermission}.php`                                                                                                                                                       |
| Authorisation         | `app/Policies/Organizations/OrganizationPolicy.php`                                                                                                                                                                           |
| Tenant boundary       | `app/Http/Middleware/EnsureOrganizationMembership.php`                                                                                                                                                                        |
| URL defaults          | `app/Http/Middleware/SetOrganizationUrlDefaults.php`                                                                                                                                                                          |
| Requests              | `app/Http/Requests/Organizations/*.php`                                                                                                                                                                                       |
| Validation rules      | `app/Rules/Organizations/{OrganizationHandle,UniqueOrganizationInvitation,ValidOrganizationInvitation}.php`                                                                                                                   |
| Notifications         | `app/Notifications/Organizations/OrganizationInvitation.php` — queued ([ADR-023](../../../../docs/DECISIONS.md))                                                                                                              |
| DTOs                  | `app/Data/Organizations/{UserOrganization,OrganizationPermissions}.php`                                                                                                                                                       |
| Frontend types        | `resources/js/types/organizations.ts`                                                                                                                                                                                         |
| Audit log             | `app/Models/Audit/AuditLogEntry.php`, `app/Enums/Audit/AuditAction.php`, `app/Actions/Audit/RecordAuditEntry.php` — its own domain, since `Server` and `Site` will write to it too ([ADR-032](../../../../docs/DECISIONS.md)) |

A change to roles or permissions usually touches the enum, the policy, the DTO **and** the
TypeScript type. Check all four.

## How tenant scoping works here

```
/org/{organization}/…  →  EnsureOrganizationMembership  →  403 unless a membership row exists
                                                          →  scopes this request only
```

`EnsureOrganizationMembership` resolves the organization from the `{organization}` handle, aborts
403 unless the authenticated user is a member, and optionally enforces a minimum role via its
`$minimumRole` parameter — unused by any route today. **It does not switch the user's stored
current organization** ([ADR-025](../../../../docs/DECISIONS.md), phase 3): a read must not
perform a write, and visiting a colleague's link used to silently repoint every other tab. Only
`organizations.switch` (a `POST`) changes `current_organization_id`.

`SetOrganizationUrlDefaults` runs on every web request and injects the organization named by the
_route_ — not the user's stored one — into `URL::defaults()`, so links rendered on
`/org/{other}/…` correctly point back at `{other}` rather than the user's own organization.

There is one route shape for everything belonging to an organization — resources and
administration alike — under `/org/{organization}/…` ([ADR-031](../../../../docs/DECISIONS.md)).
The literal `org/` segment is what makes this safe: a handle can never shadow an application
route, so there is no reserved-word list to keep running. New **tenant resource** routes
(`Server`, `Site`, `Client`) belong under this same prefix, inside the
`EnsureOrganizationMembership` group.

## Rules specific to this domain

1. **Never bypass `EnsureOrganizationMembership`.** An organization route registered outside that
   group has no isolation whatsoever.
2. **Ask for permissions, not roles.** `$user->hasOrganizationPermission($organization, OrganizationPermission::X)`
   or `Gate::authorize('x', $organization)`. Never `if ($role === 'admin')`.
3. **A new capability is a new `OrganizationPermission` case**, mapped in `OrganizationRole::permissions()`,
   surfaced in `OrganizationPermissions`, and mirrored in `resources/js/types/organizations.ts`.
4. **Verify parent ownership on nested resources.** `OrganizationInvitationController::destroy`
   checks `$invitation->organization_id === $organization->id` before the policy runs. A route
   parameter bound by id or handle is not checked against its parent for you.
5. **Never let `OrganizationHandle` validation be skipped.** It enforces shape (a slug) and
   permanent non-reuse across the live column, soft-deleted rows and `organization_handles`
   ([ADR-006](../../../../docs/DECISIONS.md), [ADR-030](../../../../docs/DECISIONS.md)) — not
   reserved words. That list existed once (ADR-008) and was retired for good by
   [ADR-031](../../../../docs/DECISIONS.md): behind the literal `org/` segment a handle can no
   longer shadow a route, so there is nothing left to reserve.
6. **Handles are never reissued.** `GeneratesHandle::handleIsUnavailable()` checks the live
   column, soft-deleted rows, _and_ `organization_handles` — do not "optimise" away any of the
   three.
7. **Owner is excluded from `OrganizationRole::assignableBy()`.** Ownership transfer needs its own
   flow, decided but not yet built ([G3](../../../../docs/SECURITY.md) — see Known rough edges
   below).
8. **Multi-table writes go in a transaction.** Organization creation, deletion and invitation
   acceptance all mutate several tables; a partial write leaves an ownerless organization or an
   orphaned membership.
9. **A new membership or invitation event gets an audit entry.** Inject `RecordAuditEntry` and
   call `->handle()` after the mutation succeeds — capture anything you need from the target
   _before_ deleting it, since invitations and memberships are typically force-deleted in the
   same request that audits them ([ADR-032](../../../../docs/DECISIONS.md)). This is not "add
   logging to everything" — it is specifically membership and invitation lifecycle events.

## Known rough edges

- Nothing enforces exactly one Owner, and ownership cannot be transferred (G3 in
  [docs/SECURITY.md](../../../../docs/SECURITY.md), decided by ADR-020/ADR-029, deliberately not
  yet built — see [docs/MVP_PLAN.md](../../../../docs/MVP_PLAN.md)). Do not fix this silently; it
  is sequenced, not forgotten.
- `organizationRole()` queries per call, so `toUserOrganizations()` is N+1 over the user's organizations. Fine at
  current scale; worth eager-loading if organization counts grow.
- The retention purge ADR-036 requires (30 days for deleted organizations, 24 months for audit
  entries) is decided but not built — no scheduled task exists yet.
- The "Audit log" settings tab is shown to every member; only the page itself is Owner/Admin-only
  (ADR-032's implementation note explains why — `OrganizationSettingsLayout` receives no page
  props to gate on). A Member who clicks it gets a 403, not a hidden tab.

## Testing

`tests/Feature/Organizations/` — `OrganizationTest`, `OrganizationMemberTest`, `OrganizationInvitationTest`,
`PruneExpiredOrganizationInvitationsTest`, `AuditLogTest`.

Any change here needs the **negative** tests, not just the happy path:

- a non-member gets 403 on the organization-prefixed route;
- a Member cannot perform an Admin action;
- an Admin cannot change roles, remove members, or delete the organization;
- a Member cannot view the audit log;
- an invitation cannot be accepted by a user whose email does not match;
- an invitation belonging to organization A cannot be cancelled through organization B's URL.

```bash
php artisan test --compact --filter=Organizations
```
