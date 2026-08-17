# `Team` → `Organization` — execution plan

_Written 2026-08-17. **Phases 1, 4 and 5 executed 2026-08-17.** Phases 2, 3 and 6 remain._

The reasoning is in [ADR-025](DECISIONS.md) through [ADR-029](DECISIONS.md). This document is
the _what to change_, in an order that can be verified at each step.

**Do the rest before `Site`, `Server` and `Client` exist.** Every new domain multiplies the
work.

> **Executed so far.** `Team` is `Organization` everywhere — model, tables, enums, DTOs,
> middleware, routes, URL segment, frontend types — laid out per [ADR-026](DECISIONS.md), and
> the URL identifier is a `handle` per [ADR-030](DECISIONS.md), and every tenant route sits
> behind `org/` per [ADR-031](DECISIONS.md). Suite: 103 passing, `composer ci:check` green.
>
> **Still true of the code, and deliberately so:** `is_personal` still exists (phase 2), visiting
> a prefixed URL still switches the current organization (phase 3), and Admins still cannot manage
> members (phase 6).

---

## 1. Phases

Six phases. Each is independently verifiable, and each should be its own commit. **Do not merge
them into one pass** — phase 1 is mechanical and its whole value is that the test suite proves
nothing changed, which you lose the moment behaviour changes in the same commit.

| Phase | Change                                                 | ADR     | Status                            |
| ----- | ------------------------------------------------------ | ------- | --------------------------------- |
| 1     | Pure rename, plus the folder move                      | 025/026 | **Done** 2026-08-17               |
| 2     | Remove `is_personal`, add the auto-create fallback     | 025     | Open                              |
| 3     | Remove the implicit organization switch                | 025     | Open                              |
| 4     | Move organization administration inside the URL prefix | 025/031 | **Done** 2026-08-17               |
| 5     | `slug` → name-seeded, editable `handle`                | 030     | **Done** 2026-08-17, with phase 1 |
| 6     | Admins manage members below their own role             | 028     | Open                              |

Every phase after 1 is separable. If you want the rename landed and nothing else, phase 1 alone
is a coherent stopping point.

**Phase 5 can be pulled forward into phase 1** if you prefer. It touches the same migration and
the same model, so doing both at once saves a second `migrate:fresh` — at the cost of phase 1 no
longer being purely mechanical. Recommended only if you are executing all six in one sitting.

Phase 6 is independent of the rename entirely and could be done first, against the current
`Team` names, if member management is urgent.

---

## 2. Naming map

### Identifiers

| Now                         | Becomes                                     |
| --------------------------- | ------------------------------------------- |
| `Team`                      | `Organization`                              |
| `TeamInvitation`            | `OrganizationInvitation`                    |
| `TeamRole`                  | `OrganizationRole`                          |
| `TeamPermission`            | `OrganizationPermission`                    |
| `TeamPolicy`                | `OrganizationPolicy`                        |
| `TeamName` (rule)           | `OrganizationName`                          |
| `UniqueTeamInvitation`      | `UniqueOrganizationInvitation`              |
| `ValidTeamInvitation`       | `ValidOrganizationInvitation`               |
| `UserTeam` (DTO)            | `UserOrganization`                          |
| `TeamPermissions` (DTO)     | `OrganizationPermissions`                   |
| `HasTeams`                  | `HasOrganizations`                          |
| `GeneratesUniqueTeamSlugs`  | `GeneratesUniqueOrganizationSlugs`          |
| `EnsureTeamMembership`      | `EnsureOrganizationMembership`              |
| `SetTeamUrlDefaults`        | `SetOrganizationUrlDefaults`                |
| `RedirectsToCurrentTeam`    | `RedirectsToCurrentOrganization`            |
| `CreateTeam`                | `CreateOrganization`                        |
| `hasTeamPermission()`       | `hasOrganizationPermission()`               |
| `belongsToTeam()`           | `belongsToOrganization()`                   |
| `switchTeam()`              | `switchOrganization()`                      |
| `ownsTeam()` / `teamRole()` | `ownsOrganization()` / `organizationRole()` |

`Membership` keeps its name — it is already domain-neutral.

### Database

| Now                     | Becomes                          |
| ----------------------- | -------------------------------- |
| `teams`                 | `organizations`                  |
| `team_members`          | `organization_members`           |
| `team_invitations`      | `organization_invitations`       |
| `*.team_id`             | `*.organization_id`              |
| `users.current_team_id` | `users.current_organization_id`  |
| `teams.is_personal`     | **dropped** (phase 2)            |
| `teams.slug`            | `organizations.handle` (phase 5) |

### Routes and permissions

| Now                   | Becomes                    |
| --------------------- | -------------------------- |
| `{current_team}`      | `{current_organization}`   |
| `{team}`              | `{organization}`           |
| `teams.*` route names | `organizations.*`          |
| `team:update` etc.    | `organization:update` etc. |

### Spelling

`organization` (US) in code, database, URLs and TypeScript — matches Laravel Forge and the
wider ecosystem. Prose in `docs/` keeps the existing British style (`organisation`,
`authorisation`). Dutch UI copy uses "organisatie".

---

## 3. Phase 1 — mechanical rename

### 3.1 The substitution

Applied in this order, the replacements compose and cover almost every case:

1. `Teams` → `Organizations`
2. `Team` → `Organization`
3. `teams` → `organizations`
4. `team` → `organization`
5. `TEAM` → `ORGANIZATION`

Order matters: rule 3 must run before rule 4, and rule 1 before rule 2, or you get
`Organizations` mangled into `Organizationss`. Verified against the identifier list above —
`current_team_id`, `team_members`, `hasTeamPermission` and `toUserTeams` all resolve
correctly by composition.

Scope: `app/`, `database/`, `routes/`, `tests/`, `resources/js/` **excluding**
`resources/js/actions/` and `resources/js/routes/`, which are Wayfinder output — delete those
two directories and regenerate.

After substituting, grep for `[Tt]eam` across the tree. The only surviving hits should be in
`docs/`, where historical ADR text is deliberately left as written.

### 3.2 Files to rename (`git mv`, so history follows)

**PHP — 52 files contain `team`; these 28 change name or location:**

```
app/Actions/Teams/CreateTeam.php                → app/Actions/Organizations/CreateOrganization.php
app/Concerns/GeneratesUniqueTeamSlugs.php       → app/Concerns/Organizations/GeneratesUniqueOrganizationSlugs.php
app/Concerns/HasTeams.php                       → app/Concerns/Organizations/HasOrganizations.php
app/Data/TeamPermissions.php                    → app/Data/Organizations/OrganizationPermissions.php
app/Data/UserTeam.php                           → app/Data/Organizations/UserOrganization.php
app/Enums/TeamPermission.php                    → app/Enums/Organizations/OrganizationPermission.php
app/Enums/TeamRole.php                          → app/Enums/Organizations/OrganizationRole.php
app/Http/Controllers/Teams/TeamController.php   → app/Http/Controllers/Organizations/OrganizationController.php
app/Http/Controllers/Teams/TeamInvitationController.php → …/Organizations/OrganizationInvitationController.php
app/Http/Controllers/Teams/TeamMemberController.php     → …/Organizations/OrganizationMemberController.php
app/Http/Middleware/EnsureTeamMembership.php    → app/Http/Middleware/EnsureOrganizationMembership.php
app/Http/Middleware/SetTeamUrlDefaults.php      → app/Http/Middleware/SetOrganizationUrlDefaults.php
app/Http/Requests/Teams/*.php                   → app/Http/Requests/Organizations/*.php   (5 files)
app/Http/Responses/Concerns/RedirectsToCurrentTeam.php → …/RedirectsToCurrentOrganization.php
app/Models/Team.php                             → app/Models/Organizations/Organization.php
app/Models/TeamInvitation.php                   → app/Models/Organizations/OrganizationInvitation.php
app/Models/Membership.php                       → app/Models/Organizations/Membership.php
app/Notifications/Teams/TeamInvitation.php      → app/Notifications/Organizations/OrganizationInvitation.php
app/Policies/TeamPolicy.php                     → app/Policies/Organizations/OrganizationPolicy.php
app/Rules/TeamName.php                          → app/Rules/Organizations/OrganizationName.php
app/Rules/UniqueTeamInvitation.php              → app/Rules/Organizations/UniqueOrganizationInvitation.php
app/Rules/ValidTeamInvitation.php               → app/Rules/Organizations/ValidOrganizationInvitation.php
database/factories/TeamFactory.php              → database/factories/OrganizationFactory.php
database/factories/TeamInvitationFactory.php    → database/factories/OrganizationInvitationFactory.php
tests/Feature/Teams/*.php                       → tests/Feature/Organizations/*.php        (4 files)
```

`app/Models/User.php` stays flat — it belongs to no domain (ADR-026). Its `HasTeams` trait
import changes to `App\Concerns\Organizations\HasOrganizations`.

**Frontend — 24 hand-written files contain `team`; these change name or location:**

```
resources/js/components/create-team-modal.tsx     → create-organization-modal.tsx
resources/js/components/delete-team-modal.tsx     → delete-organization-modal.tsx
resources/js/components/leave-team-modal.tsx      → leave-organization-modal.tsx
resources/js/components/team-invitation-alert.tsx → organization-invitation-alert.tsx
resources/js/components/team-switcher.tsx         → organization-switcher.tsx
resources/js/pages/teams/                         → resources/js/pages/organizations/
resources/js/types/teams.ts                       → resources/js/types/organizations.ts
```

The remaining 17 (`app-header`, `nav-user`, `dashboard`, the four member/invitation modals,
`types/index.ts`, `types/global.d.ts`, …) change content only.

**Generated — delete and regenerate, never hand-edit:**

```
resources/js/actions/App/Http/Controllers/Teams/
resources/js/routes/teams/
```

### 3.3 Migrations

No production data exists, so **rewrite the two migration files in place** rather than adding
rename migrations:

```
database/migrations/2026_01_27_000001_create_teams_table.php
  → 2026_01_27_000001_create_organizations_table.php
    creates organizations, organization_members, organization_invitations

database/migrations/2026_01_27_000002_add_current_team_id_to_users_table.php
  → 2026_01_27_000002_add_current_organization_id_to_users_table.php
```

Keep `is_personal` in phase 1 and drop it in phase 2, so phase 1 stays purely mechanical.

Anyone with an existing local database runs `php artisan migrate:fresh`. Note this in the
commit message — it is the one step that is not automatic for other machines.

### 3.4 Reserved names

`OrganizationName` keeps ADR-008's reserved-word list unchanged in phase 1. **Phase 5 removes it
onto the **handle**** ([ADR-030](DECISIONS.md)) — the list survives, the field it guards changes.

### 3.4b What this plan got wrong — corrections from executing it

Recorded because phases 2, 3, 4 and 6 will hit the same edges.

1. **`bootstrap/` and `config/` were missing from the substitution scope in §3.1.** They must be
   included: `bootstrap/app.php` registers `SetTeamUrlDefaults` in the middleware stack, and
   nothing else catches it — the failure is 30 tests aborting with
   `Target class [App\Http\Middleware\SetTeamUrlDefaults] does not exist`.
2. **Factories must move too.** Laravel resolves a model's factory from the model's namespace, so
   `App\Models\Organizations\Organization` looks for `Database\Factories\Organizations\OrganizationFactory`.
   Moving the models without moving the factories breaks every test that uses one. They now live
   in `database/factories/Organizations/`.
3. **Short class names in docblocks do not follow a file move.** `app/Models/User.php` carries
   `@property-read Organization|null $currentOrganization`; with `Organization` no longer in
   `App\Models`, that silently resolves to a non-existent class. `tsc`, Pint and Pest all stay
   green — only PHPStan catches it, and it surfaces as 15 errors across six unrelated files.
   The same applies to the three models that referenced `User` without an import.
4. **Run the substitution through `xargs`, not a shell `for` loop.** This project's shell is zsh,
   which does not word-split an unquoted variable, so `for f in $files` passes the entire list as
   one filename. It fails quietly enough to look like it worked.
5. **The Vite manifest must be rebuilt.** Page components moved from `pages/teams/` to
   `pages/organizations/`, so any test rendering one gets a 500 from
   `ViteException: Unable to locate file in Vite manifest` until `vp build` runs.
6. **Watch payload key casing.** `DashboardController` builds its invitation payload by hand; the
   sweep turned `'slug'` into `'handle'` while the frontend type expected camelCase. The DTOs
   are camelCase and the hand-built arrays must match them.

### 3.5 Verification

```bash
php artisan migrate:fresh && php artisan test --compact
```

The suite should pass with **no assertion logic changed** — only identifiers. If a test needed
its behaviour rewritten, something non-mechanical slipped into this phase; find it before
continuing.

Then:

```bash
php artisan wayfinder:generate && vendor/bin/pint --dirty --format agent && composer ci:check
```

---

## 4. Phase 2 — remove `is_personal`, add the fallback

### 4.1 What `is_personal` currently does

Nine places depend on it. All nine must be resolved, not deleted:

| File                                        | Current use                                              |
| ------------------------------------------- | -------------------------------------------------------- |
| `Organization` model                        | `$fillable`, `$casts`, docblock property                 |
| `OrganizationPolicy::leave` (~line 48)      | `! $team->is_personal && …`                              |
| `OrganizationPolicy::delete` (~line 98)     | `! $team->is_personal && …`                              |
| `HasOrganizations::personalTeam()`          | the lookup itself                                        |
| `CreateOrganization::handle()`              | `$isPersonal` parameter                                  |
| `CreateNewUser`                             | `handle($user, $user->name."'s Team", isPersonal: true)` |
| `RedirectsToCurrentOrganization`            | `$user->currentTeam ?? $user->personalTeam()`            |
| `OrganizationMemberController::destroy`     | `switchTeam($user->personalTeam())`                      |
| `OrganizationController::destroy`           | `switchTeam($affectedUser->personalTeam())`              |
| `OrganizationController::edit`              | `'isPersonal' => $team->is_personal`                     |
| `UserOrganization` DTO + `organizations.ts` | `isPersonal` field                                       |
| `pages/organizations/index.tsx`, `edit.tsx` | three `isPersonal` branches                              |

### 4.2 The replacement

**Registration.** `CreateNewUser` creates an organization named after the user — `$user->name`,
with no suffix. `'s Team` reads wrong under the new term, and per ADR-025 no organization-name
field is added to the registration form: not everyone signing up is a company.

**`CreateOrganization`** loses its `$isPersonal` parameter entirely.

**New action — `App\Actions\Organizations\EnsureUserHasOrganization`:**

```
handle(User $user): Organization
    return the user's fallback organization if one exists,
    otherwise create one named after the user and return it
```

This is the involuntary defence. Call it from both places where a user can lose their last
membership: `OrganizationMemberController::destroy` and `OrganizationController::destroy`.
Both currently call `switchTeam($user->personalTeam())` and would otherwise switch to `null`.

**`HasOrganizations`** drops `personalTeam()`. `fallbackOrganization()` already exists and does
the right thing — keep it, and let `EnsureUserHasOrganization` build on it.

**`OrganizationPolicy`** — replace both `! $team->is_personal` conditions with a last-organization
check. This is the voluntary defence:

```
leave():   $user->organizations()->count() > 1
             && $user->belongsToOrganization($organization)
             && ! $user->ownsOrganization($organization)

delete():  $user->organizations()->count() > 1
             && $user->hasOrganizationPermission($organization, DeleteOrganization)
```

**Do not simply delete the `is_personal` clause** — that would widen both permissions. The
policy currently blocks two things at once (personal teams, and the sole owner), and only the
first is being replaced.

**DTO and types.** Drop `isPersonal` from `UserOrganization`, `organizations.ts`, and the three
branches in `pages/organizations/`. The organization list no longer distinguishes a personal
organization; every row is a normal organization.

### 4.3 Tests to add

- A user's first organization is named after them and is deletable once they have a second.
- A user cannot leave their last organization (403).
- A user cannot delete their last organization (403).
- A user removed from their last organization by an owner ends up with a fresh organization,
  and `current_organization_id` points at it.
- All members of a deleted organization end up with a valid current organization.

### 4.4 Note on ownership

ADR-020's rule is separate and still stands: the sole owner cannot leave regardless of how
many organizations they belong to. Neither the database constraint nor the transfer flow it
describes is built yet — do not assume it here.

---

## 5. Phase 3 — remove the implicit switch

`EnsureOrganizationMembership` currently writes on read:

```php
if ($request->route('current_team') && ! $user->isCurrentTeam($team)) {
    $user->switchTeam($team);
}
```

Remove it. The middleware keeps resolving the organization from the URL, keeps the 403 for
non-members, and keeps the optional minimum-role check. What it stops doing is persisting
`current_organization_id`.

The organization is then scoped **per request** from the URL. Two things must still work, so
check both:

1. `SetOrganizationUrlDefaults` must push the _URL's_ organization into `URL::defaults()` for
   that request, not the stored one — otherwise links rendered on the page point at the wrong
   organization.
2. `current_organization_id` is written on an explicit switch (`organizations.switch`, already
   a `POST`) and when landing at `/` without a prefix.

**Test to add:** a user whose current organization is A visits a URL under organization B, gets
a 200, and their `current_organization_id` is still A afterwards.

This is what stops a shared link from repointing the reader's other tabs — the freelance/agency
scenario ADR-025 is built around.

---

## 6. Phase 4 — organization administration moves inside the prefix

Per ADR-025's simplification of ADR-022, extended by [ADR-031](DECISIONS.md). **Done 2026-08-17.**

### 6.1 The route table as built

| Route                                                          | Name                                      |
| -------------------------------------------------------------- | ----------------------------------------- |
| `GET/POST /org`                                                | `organizations.index` / `.store`          |
| `GET /org/{organization}/dashboard`                            | `dashboard`                               |
| `POST /org/{organization}/switch`                              | `organizations.switch`                    |
| `GET/PATCH/DELETE /org/{organization}/settings`                | `organizations.edit`/`.update`/`.destroy` |
| `DELETE /org/{organization}/settings/leave`                    | `organizations.leave`                     |
| `PATCH/DELETE /org/{organization}/settings/members/{user}`     | `organizations.members.*`                 |
| `POST /org/{organization}/settings/invitations`                | `organizations.invitations.store`         |
| `DELETE /org/{organization}/settings/invitations/{invitation}` | `organizations.invitations.destroy`       |

`/settings/…` now holds only `profile`, `security` and `appearance`. `invitations.accept` and
`invitations.decline` stay top-level: the recipient is not a member yet and cannot carry a prefix.

### 6.2 What the plan did not anticipate

- **`{current_organization}` was removed entirely.** The two parameter names only existed because
  administration lived outside the prefix. One name, one URL default. Three places set that
  default and all three had to change — `SetOrganizationUrlDefaults`,
  `RedirectsToCurrentOrganization` **and** `HasOrganizations::switchOrganization()`. The last one
  is easy to miss and produces `Missing required parameter for [Route: dashboard]` in six
  unrelated tests.
- **The reserved-word list was deleted rather than extended.** The plan said to add
  `organizations` to it; ADR-031 removed the need for a list at all.
- **The Organizations entry left the settings navigation** for the avatar menu — `/settings/…` is
  personal now, so listing organizations there no longer made sense.
- **A behaviour change came free with the prefix:** organization settings pages now switch your
  current organization, because every tenant route is prefixed. Phase 3 removes that.
- Tests asserting literal redirect URLs (`EmailVerificationTest`) needed the `/org` prefix; tests
  using `route()` by name did not.

## 7. Phase 5 — `slug` becomes a name-seeded, editable `handle`

Per [ADR-030](DECISIONS.md). **Done 2026-08-17.** ADR-027's random `public_id` shipped first and
was reversed the same day; what landed is described here.

### 7.1 What changed

- Column `organizations.slug` → `organizations.handle`, seeded via `Str::slug($name)` at creation
  with a numeric suffix on collision.
- New table `organization_handles` — every handle a tenant has ever held. Written on every save.
- `Organization::booted()`'s `updating` hook is **deleted**: renaming never touches the handle.
- `GeneratesUniqueOrganizationSlugs` → `App\Concerns\Organizations\GeneratesHandle`, which
  exposes `handleIsUnavailable()` publicly so the generator and the validation rule ask one
  question with one answer.
- `App\Rules\Organizations\OrganizationHandle` holds the reserved-word list restored from
  `1260c98`, now applied to the handle rather than the name.
- `handle` is fillable, sent by the settings form, and validated ignoring the organization's own
  current value.

### 7.2 Tests

Eight, replacing the four that asserted the old slug behaviour. The two that matter most:
renaming leaves the handle untouched, and a handle released by an edit cannot be claimed by
another organization.

---

## 8. Phase 6 — Admins manage members below their own role

Per [ADR-028](DECISIONS.md). Independent of the rename; can be done first if urgent.

### 8.1 The change

`OrganizationRole::permissions()` grants Admin `member:add`, `member:update`, `member:remove` and
`invitation:create` in addition to what it already has. `organization:delete` stays Owner-only.

The rank constraint goes in `OrganizationPolicy`, **not** in the permission map — ADR-005's point
is that the enum reads as a specification, and a level comparison baked into it would break that.
Add to `updateMember`, `removeMember` and `inviteMember`:

> the actor's `OrganizationRole::level()` must be **strictly greater** than the level of the role
> being affected.

`OrganizationRole::level()` already exists (Owner 3, Admin 2, Member 1) and is currently unused
by any route.

### 8.2 The part that is easy to miss

`inviteMember` must validate the **invited role**, not just the action. An Admin issuing an
invitation with `role: admin` is the escalation path this phase closes; checking only "may this
user invite?" leaves it wide open. The check belongs in
`CreateOrganizationInvitationRequest` as well as the policy, since the role arrives as user input.

### 8.3 Tests — all negative except the last

- An Admin cannot remove another Admin (403).
- An Admin cannot remove the Owner (403).
- An Admin cannot change another Admin's role (403).
- An Admin cannot promote a Member to Admin or Owner (403).
- An Admin cannot invite someone as Admin or Owner (422 or 403).
- An Admin **can** remove a Member, and can invite someone as a Member.

### 8.4 Documentation

[SECURITY.md](SECURITY.md) §3 "Privilege boundaries" currently states the opposite of this phase
— that Admins cannot change roles or remove members. Rewrite it in the same change; leaving it is
worse than having no note at all.

---

## 9. Security review of this change

Per `CLAUDE.md`, stated even where the conclusion is "no new risk".

| Concern                                   | Assessment                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A missed rename leaves a route unguarded  | The main risk. Middleware alias, route group and middleware class must move in one commit. Mitigated by the existing non-member 403 tests — keep them, do not skip.                                                                                                                                                                                                                                             |
| `is_personal` removal widens permissions  | Real, and specific: the clause in `OrganizationPolicy::leave` and `::delete` guards two things. §4.2 replaces rather than deletes it.                                                                                                                                                                                                                                                                           |
| Auto-create runs on someone else's action | `EnsureUserHasOrganization` fires when an owner removes a member. It creates an organization owned by the _removed_ user, never grants access to anything existing.                                                                                                                                                                                                                                             |
| Per-request scoping (phase 3)             | Narrows an implicit write; it does not widen read access. Membership is still checked on every request by the same middleware.                                                                                                                                                                                                                                                                                  |
| Route move (phase 4)                      | Both groups keep `EnsureOrganizationMembership`. Verify with `php artisan route:list` that no organization route sits outside the group.                                                                                                                                                                                                                                                                        |
| Name-seeded `handle` (phase 5)            | **The security claim originally made here was wrong.** It said a readable identifier lets `/some-agency/` be probed to discover customers; `EnsureOrganizationMembership` returns one indistinguishable 403 for "no such organization" and "not a member", so there is no such channel. What matters instead: a handle is never reissued, across the live column, soft-deleted rows and `organization_handles`. |
| Dropping the reserved-word list (phase 5) | Safe **only** because the identifier is no longer name-derived. If name-derived identifiers ever return, ADR-008 must return with them. Verify by naming an organization `Settings` and confirming routes still resolve.                                                                                                                                                                                        |
| Admin member management (phase 6)         | A deliberate widening, bounded by the rank rule. The escalation path is the _invited role_, not the action — see §8.2. Every test in §8.3 is a negative test; they are the control.                                                                                                                                                                                                                             |
| Tenant isolation model                    | Unchanged. ADR-007 and ADR-009 are renamed, not reconsidered; ADR-006's rule survives phase 5 in a new form.                                                                                                                                                                                                                                                                                                    |

**Test the negative case** (SECURITY.md §5.10): the tests proving a non-member gets a 403 are
the ones that matter here. If any of them needs its logic rewritten during phase 1, treat that
as a signal that the rename changed behaviour.

---

## 10. Documentation to update in the same change

Per ADR-011, in the same commit as the code — not afterwards.

| File                                   | What changes                                                                                                                                                                             |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/ARCHITECTURE.md`                 | §2 code organisation (ADR-026 tree), §3 tenancy model **and the whole "name collisions with route prefixes" subsection, which phase 5 makes obsolete**, §4 registration, §8 constraint 2 |
| `docs/DATA_MODEL.md`                   | Entity map, all three tables, `is_personal` removal, `slug` → `handle` and its rationale, the new `organization_handles` table, the permission table (ADR-028), DTO names                |
| `docs/SECURITY.md`                     | §2 assumption 1, §3 tenant isolation, **§3 privilege boundaries — currently states the opposite of ADR-028**, §5 rules 2 and 3, and the ADR-029 recovery procedure                       |
| `docs/OPEN_QUESTIONS.md`               | Q11, Q12 and Q13 already added; check nothing new is opened                                                                                                                              |
| `README.md`                            | Status section wording                                                                                                                                                                   |
| `CLAUDE.md` / `AGENTS.md`              | Between the two generated blocks only — never inside them (ADR-010, ADR-012)                                                                                                             |
| `app/CLAUDE.md`                        | Folder-structure guidance per ADR-026                                                                                                                                                    |
| `app/Http/Controllers/Teams/CLAUDE.md` | Moves with its directory to `app/Http/Controllers/Organizations/CLAUDE.md`                                                                                                               |
| `resources/js/CLAUDE.md`               | Type and component names                                                                                                                                                                 |
| This file                              | Delete once executed — it describes work, not the system                                                                                                                                 |

The three docs carrying a `_Last verified against the codebase_ date` need that date updated,
or the line becomes a claim the file no longer earns.

---

## 11. Checklist

**Phase 1 — rename** ✅ done 2026-08-17

**Phase 2 — `is_personal`**

- [ ] All twelve call sites in §4.1 resolved
- [ ] `EnsureUserHasOrganization` added and called from both destroy paths
- [ ] Both policy conditions replaced, not deleted
- [ ] `is_personal` dropped from the migration, DTO and TypeScript type together
- [ ] The five tests in §4.3 added

**Phase 3 — implicit switch**

- [ ] Switch block removed from the middleware
- [ ] `SetOrganizationUrlDefaults` verified against the URL's organization
- [ ] Cross-organization visit test added

**Phase 4 — routes** ✅ done 2026-08-17, with the `org/` prefix from ADR-031

**Phase 5 — `handle`** ✅ done 2026-08-17, executed with phase 1; revised same day per ADR-030

**Phase 6 — Admin member management**

- [ ] Four permissions granted to Admin in `OrganizationRole::permissions()`
- [ ] Rank check added to `updateMember`, `removeMember`, `inviteMember` in the policy
- [ ] Invited **role** validated against the actor's level, in the form request too (§8.2)
- [ ] The six tests in §8.3 added
- [ ] SECURITY.md §3 privilege boundaries rewritten — it currently says the opposite

**Close-out**

- [ ] Documentation in §8 updated in the same change
- [ ] This file deleted
