# Organizations domain — local conventions

The tenancy layer. This is the security boundary of the whole platform: every future
feature inherits its isolation from what happens here. Read
[docs/DATA_MODEL.md](../../../../docs/DATA_MODEL.md) and
[docs/SECURITY.md](../../../../docs/SECURITY.md) before changing anything in it.

> **The name "Organization" is provisional.** It may become agency accounts, client organisations,
> or something else, and the model may need a second level. This is undecided — see
> [docs/OPEN_QUESTIONS.md](../../../../docs/OPEN_QUESTIONS.md) (Q1). **Do not invent a name
> and do not refactor towards one.** If a task depends on the answer, stop and ask.

## The domain spans seven directories

Because `app/` is organised by type, organization code is not all here:

| Concern               | Location                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------- |
| Controllers           | `app/Http/Controllers/Organizations/`                                                       |
| Organization creation | `app/Actions/Organizations/CreateOrganization.php`                                          |
| User-side tenancy API | `app/Concerns/HasOrganizations.php`                                                         |
| Models                | `app/Models/{Organization,Membership,OrganizationInvitation}.php`                           |
| Roles and permissions | `app/Enums/{OrganizationRole,OrganizationPermission}.php`                                   |
| Authorisation         | `app/Policies/OrganizationPolicy.php`                                                       |
| Tenant boundary       | `app/Http/Middleware/EnsureOrganizationMembership.php`                                      |
| URL defaults          | `app/Http/Middleware/SetOrganizationUrlDefaults.php`                                        |
| Validation rules      | `app/Rules/{OrganizationName,UniqueOrganizationInvitation,ValidOrganizationInvitation}.php` |
| DTOs                  | `app/Data/{UserOrganization,OrganizationPermissions}.php`                                   |
| Frontend types        | `resources/js/types/organizations.ts`                                                       |

A change to roles or permissions usually touches the enum, the policy, the DTO **and** the
TypeScript type. Check all four.

## How tenant scoping works here

```
/{current_organization}/…  →  EnsureOrganizationMembership  →  403 unless a membership row exists
                                             →  switches current organization if it differs
```

`SetOrganizationUrlDefaults` runs on every web request and injects the current slug into
`URL::defaults()`, so `route('dashboard')` resolves without passing the organization.

Two route shapes are in use — `/{current_organization}/…` (auto-switches) and
`/settings/organizations/{organization}` (does not). Which one new routes should use is
[Q4](../../../../docs/OPEN_QUESTIONS.md). New **tenant resource** routes go under the
prefixed form.

## Rules specific to this domain

1. **Never bypass `EnsureOrganizationMembership`.** A organization route registered outside that group has
   no isolation whatsoever.
2. **Ask for permissions, not roles.** `$user->hasOrganizationPermission($organization, OrganizationPermission::X)`
   or `Gate::authorize('x', $organization)`. Never `if ($role === 'admin')`.
3. **A new capability is a new `OrganizationPermission` case**, mapped in `OrganizationRole::permissions()`,
   surfaced in `OrganizationPermissions`, and mirrored in `resources/js/types/organizations.ts`.
4. **Verify parent ownership on nested resources.** `OrganizationInvitationController::destroy`
   checks `$invitation->organization_id === $organization->id` before the policy runs. Nested resources are
   bound globally by route-model binding — the parent relationship is not checked for you.
5. **Never let `OrganizationName` validation be skipped.** Organization slugs occupy the first URL segment;
   without that rule a organization can shadow application routes (ADR-008).
6. **Slugs are never reissued.** Slug generation queries `withTrashed()` on purpose
   (ADR-006). Do not "optimise" that away.
7. **Owner is not assignable.** `OrganizationRole::assignable()` excludes it deliberately. Ownership
   transfer needs its own designed flow — which does not exist yet
   ([Q6](../../../../docs/OPEN_QUESTIONS.md)).
8. **Multi-table writes go in a transaction.** Organization creation, deletion and invitation
   acceptance all mutate several tables; a partial write leaves an ownerless organization or an
   orphaned membership.

## Known rough edges

Do not fix these silently — they are open questions with product implications:

- Organization soft-delete hard-deletes memberships, so a restored organization is ownerless ([Q5](../../../../docs/OPEN_QUESTIONS.md)).
- Nothing enforces exactly one Owner, and ownership cannot be transferred ([Q6](../../../../docs/OPEN_QUESTIONS.md)).
- Invitation emails are sent synchronously with no rate limit ([Q8](../../../../docs/OPEN_QUESTIONS.md)).
- `organizationRole()` queries per call, so `toUserOrganizations()` is N+1 over the user's organizations. Fine at
  current scale; worth eager-loading if organization counts grow.

## Testing

`tests/Feature/Organizations/` — `OrganizationTest`, `OrganizationMemberTest`, `OrganizationInvitationTest`,
`PruneExpiredOrganizationInvitationsTest`.

Any change here needs the **negative** tests, not just the happy path:

- a non-member gets 403 on the organization-prefixed route;
- a Member cannot perform an Admin action;
- an Admin cannot change roles, remove members, or delete the organization;
- an invitation cannot be accepted by a user whose email does not match;
- an invitation belonging to organization A cannot be cancelled through organization B's URL.

```bash
php artisan test --compact --filter=Organizations
```
