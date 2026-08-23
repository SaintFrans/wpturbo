# ADR-025 — `Team` becomes `Organization`; the personal team is removed

**2026-08-17** · **Status**: Accepted. **Supersedes [ADR-004](0004-every-user-gets-a-personal-team-at-registration.md)**;
partially reverses [ADR-017](0017-clients-are-a-grouping-entity-inside-a-team-not-a.md);
amends [ADR-003](0003-the-current-team-is-stored-on-the-user-record.md),
[ADR-016](0016-top-navigation-for-areas-contextual-navigation-for.md) and
[ADR-022](0022-tenant-resources-use-the-current-team-prefix-team.md).

**Decision** — The tenancy boundary is renamed from `Team` to `Organization` throughout: model,
table, enums, DTOs, middleware, routes, URL segment and frontend types. Three things change
with it, and they are the reason this is an ADR rather than a rename commit:

1. **`is_personal` is removed.** There is no special first team. Registration creates a normal
   organization named after the user, renameable from settings like any other.
2. **A user can belong to several organizations, and this is a first-class scenario**, not a
   grouping mechanism. The intended case is a person who genuinely works for more than one
   organization — a freelancer with their own practice plus one or more agencies — switching
   without logging out.
3. **Visiting an organization-prefixed URL no longer writes `current_organization_id`.** The
   URL scopes that request only; the stored current organization changes on an explicit
   switch, or on landing at `/`.

**Alternatives** — Keep the name `Team` and only remove the personal-team concept; rename to
`Account`; keep `Team` as a layer _inside_ `Organization`, as Laravel Forge does.

**Why** — `Team` was never a second layer: it is already the tenancy boundary, the resource
owner and the permission scope. The name was the problem, and it caused two concrete
failures.

First, it invited [ADR-017](0017-clients-are-a-grouping-entity-inside-a-team-not-a.md)'s
guidance to name teams by function — `Front-end`, `Back-end`, `QA`. That guidance is
unworkable against [ADR-019](0019-resources-belong-directly-to-their-team-cross-team.md),
which gives each resource exactly one owning team: a site that both front-end and back-end
work on cannot sit in both. Under "organization", the question does not arise — an
organization is an organization, and grouping inside it is what `Client` is for.

Second, "team" made the personal team read as a feature rather than an implementation detail.
In practice every user carried a permanently visible, undeletable tenant they never asked
for, and — because it was the current organization on first login — the likely home of the
first server or site created by accident.

`Organization` is also what Laravel Forge calls the same concept, which matters for a product
whose users are already Forge and Ploi customers.

**`Account` was rejected on a naming collision**, not on substance: users read "account" as
"my account" — profile, password, billing — so `/settings/account` (the person) would sit
beside `Account` (the tenant) at exactly the point where this rename is buying clarity.

**Keeping a `Team` layer inside `Organization`, as Forge does, was rejected as premature.**
The needs it would serve are better served by what already exists or is already decided:
grouping by `Client` (ADR-017), and capability by `OrganizationRole` (ADR-005). The one need
neither covers — restricting a member to a subset of resources — is a visibility problem, and
the traceable path for it is scoping a membership to a set of clients, not a second grouping
entity. That remained undecided at the time — resolved by [ADR-037](0037-every-member-sees-everything-in-their-organization.md).

**Why zero organizations is not a valid state.** A user's last membership can disappear
without their involvement: an owner removes them, or the organization is deleted. Two
defences, replacing the single `is_personal` special case:

- **Voluntary** — a user cannot leave or delete their last organization.
- **Involuntary** — if a user's last membership disappears anyway, an organization is created
  for them, named after them.

Allowing a zero-organization state with an onboarding screen was considered and rejected. It
would have been defensible — the URL prefix (ADR-007) means the null case collapses to a
single middleware guard rather than spreading through every feature — but it trades a
guaranteed invariant for a screen, and every downstream feature would have to be written
against a tenant that might not be there. The auto-create keeps ADR-004's actual benefit
(code may assume a current organization resolves) while dropping the part users saw.

**Consequences**

- The full rename map, file inventory, semantic changes and execution order were tracked in a
  now-deleted execution plan; all six phases landed and are folded into ARCHITECTURE.md and
  DATA_MODEL.md. This ADR records _why_.
- **ADR-004 is superseded.** `is_personal` and `personalTeam()` are gone. Code may still
  assume a current organization resolves for any authenticated user — that invariant is
  preserved, by different means.
- **ADR-017 is partially reversed.** The free-form and functional organization-naming guidance
  is withdrawn: an organization is one organization, normally one per real-world entity. The
  `Client` entity, and everything else ADR-017 decided about it, is unchanged.
- **ADR-022 is simplified.** Its two-shape rule and the "does the tenant _have_ it, or does the
  user _configure_ it" test are no longer needed. Everything belonging to the organization,
  members included, lives under `/{current_organization}/…`. `/settings/…` becomes purely
  personal: profile, security, appearance. The one exception is the organization list-and-create
  page, which belongs to no single tenant and stays outside the prefix.
- **ADR-016 is amended in one place.** The switcher stays in row one beside the logo, as
  originally specified — multi-organization membership is now an endorsed scenario, so the
  switcher is discoverability, not clutter. Nothing else in ADR-016 changes; the renaming of
  its "Teams" language is editorial.
- **ADR-003 is amended** by point 3 above. `current_organization_id` still lives on the user
  row and still survives logout and device changes; only the implicit write on prefix
  navigation is removed. Following a shared link no longer repoints the reader's other tabs.
- ADR-005, ADR-006, ADR-007, ADR-008, ADR-009, ADR-019, ADR-020 and ADR-023 are unaffected in
  substance by _this_ entry. They are renamed, not reconsidered — though ADR-005 is later
  amended by ADR-028, and ADR-006/007/008 by ADR-027.
- **Do this before `Site`, `Server` and `Client` exist.** Today the rename touches roughly 90
  files across one fully tested feature, with no production data, so the migrations are
  rewritten rather than stacked. Each new domain multiplies that.
