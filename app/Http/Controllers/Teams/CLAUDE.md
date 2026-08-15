# Teams domain — local conventions

The tenancy layer. This is the security boundary of the whole platform: every future
feature inherits its isolation from what happens here. Read
[docs/DATA_MODEL.md](../../../../docs/DATA_MODEL.md) and
[docs/SECURITY.md](../../../../docs/SECURITY.md) before changing anything in it.

> **The name "Team" is provisional.** It may become agency accounts, client organisations,
> or something else, and the model may need a second level. This is undecided — see
> [docs/OPEN_QUESTIONS.md](../../../../docs/OPEN_QUESTIONS.md) (Q1). **Do not invent a name
> and do not refactor towards one.** If a task depends on the answer, stop and ask.

## The domain spans seven directories

Because `app/` is organised by type, team code is not all here:

| Concern               | Location                                                            |
| --------------------- | ------------------------------------------------------------------- |
| Controllers           | `app/Http/Controllers/Teams/`                                       |
| Team creation         | `app/Actions/Teams/CreateTeam.php`                                  |
| User-side tenancy API | `app/Concerns/HasTeams.php`                                         |
| Models                | `app/Models/{Team,Membership,TeamInvitation}.php`                   |
| Roles and permissions | `app/Enums/{TeamRole,TeamPermission}.php`                           |
| Authorisation         | `app/Policies/TeamPolicy.php`                                       |
| Tenant boundary       | `app/Http/Middleware/EnsureTeamMembership.php`                      |
| URL defaults          | `app/Http/Middleware/SetTeamUrlDefaults.php`                        |
| Validation rules      | `app/Rules/{TeamName,UniqueTeamInvitation,ValidTeamInvitation}.php` |
| DTOs                  | `app/Data/{UserTeam,TeamPermissions}.php`                           |
| Frontend types        | `resources/js/types/teams.ts`                                       |

A change to roles or permissions usually touches the enum, the policy, the DTO **and** the
TypeScript type. Check all four.

## How tenant scoping works here

```
/{current_team}/…  →  EnsureTeamMembership  →  403 unless a membership row exists
                                             →  switches current team if it differs
```

`SetTeamUrlDefaults` runs on every web request and injects the current slug into
`URL::defaults()`, so `route('dashboard')` resolves without passing the team.

Two route shapes are in use — `/{current_team}/…` (auto-switches) and
`/settings/teams/{team}` (does not). Which one new routes should use is
[Q4](../../../../docs/OPEN_QUESTIONS.md). New **tenant resource** routes go under the
prefixed form.

## Rules specific to this domain

1. **Never bypass `EnsureTeamMembership`.** A team route registered outside that group has
   no isolation whatsoever.
2. **Ask for permissions, not roles.** `$user->hasTeamPermission($team, TeamPermission::X)`
   or `Gate::authorize('x', $team)`. Never `if ($role === 'admin')`.
3. **A new capability is a new `TeamPermission` case**, mapped in `TeamRole::permissions()`,
   surfaced in `TeamPermissions`, and mirrored in `resources/js/types/teams.ts`.
4. **Verify parent ownership on nested resources.** `TeamInvitationController::destroy`
   checks `$invitation->team_id === $team->id` before the policy runs. Nested resources are
   bound globally by route-model binding — the parent relationship is not checked for you.
5. **Never let `TeamName` validation be skipped.** Team slugs occupy the first URL segment;
   without that rule a team can shadow application routes (ADR-008).
6. **Slugs are never reissued.** Slug generation queries `withTrashed()` on purpose
   (ADR-006). Do not "optimise" that away.
7. **Owner is not assignable.** `TeamRole::assignable()` excludes it deliberately. Ownership
   transfer needs its own designed flow — which does not exist yet
   ([Q6](../../../../docs/OPEN_QUESTIONS.md)).
8. **Multi-table writes go in a transaction.** Team creation, deletion and invitation
   acceptance all mutate several tables; a partial write leaves an ownerless team or an
   orphaned membership.

## Known rough edges

Do not fix these silently — they are open questions with product implications:

- Team soft-delete hard-deletes memberships, so a restored team is ownerless ([Q5](../../../../docs/OPEN_QUESTIONS.md)).
- Nothing enforces exactly one Owner, and ownership cannot be transferred ([Q6](../../../../docs/OPEN_QUESTIONS.md)).
- Invitation emails are sent synchronously with no rate limit ([Q8](../../../../docs/OPEN_QUESTIONS.md)).
- `teamRole()` queries per call, so `toUserTeams()` is N+1 over the user's teams. Fine at
  current scale; worth eager-loading if team counts grow.

## Testing

`tests/Feature/Teams/` — `TeamTest`, `TeamMemberTest`, `TeamInvitationTest`,
`PruneExpiredTeamInvitationsTest`.

Any change here needs the **negative** tests, not just the happy path:

- a non-member gets 403 on the team-prefixed route;
- a Member cannot perform an Admin action;
- an Admin cannot change roles, remove members, or delete the team;
- an invitation cannot be accepted by a user whose email does not match;
- an invitation belonging to team A cannot be cancelled through team B's URL.

```bash
php artisan test --compact --filter=Teams
```
