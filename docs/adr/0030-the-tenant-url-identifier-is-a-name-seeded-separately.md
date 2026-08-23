# ADR-030 — The tenant URL identifier is a name-seeded, separately editable handle

**2026-08-17** · **Status**: Accepted. **Supersedes [ADR-027](0027-the-tenant-url-identifier-is-a-random-immutable-public.md)**;
revives [ADR-008](0008-team-names-are-validated-against-reserved-route.md) in modified form.

**Decision** — `organizations.public_id` becomes `organizations.handle`. It is **seeded from the
name once, at creation** (`Str::slug`, numeric suffix on collision) and then leads its own life:

1. **Renaming never touches it.** There is no `updating` hook keyed on the name.
2. **It can be changed**, through its own field on the settings screen, validated separately from
   the name.
3. **It is never reissued.** A new `organization_handles` table records every handle a tenant has
   ever held; uniqueness is checked against it as well as against the live column and
   soft-deleted rows.

Reserved-word validation returns, but on the **handle**, not the name. An organization may be
called "Settings"; its handle may not be `settings`.

**Alternatives** — Keep ADR-027's random `public_id`; seed from the name but make the handle
immutable, avoiding the history table.

**Why — and this reverses an argument I made badly.** ADR-027 traded away URL readability, which
[ADR-007](0007-tenancy-is-scoped-by-team-slug-in-the-url-prefix.md) and DATA_MODEL.md both
valued, and justified it largely on enumeration: that `/some-agency/` could be probed to learn
whether an agency is a customer. **That was wrong.** `EnsureOrganizationMembership` aborts with a
single 403 covering "no user", "no such organization" and "not a member", and unauthenticated
requests are redirected to login before reaching it. The three cases are indistinguishable, so
there is no enumeration channel to close. What remains true — the organization's name is visible
in shared links, browser history and referrer headers — concerns a name that is on the agency's
own website. That is not worth an unreadable URL.

The real defect ADR-027 fixed was never the readable slug. It was the **coupling**: the slug was
regenerated on rename, so renaming silently invalidated every bookmark, shared link and mail
archive. Laravel Forge, which this product's users already use, solves exactly that by
decoupling — the name seeds the handle once, and the handle is edited separately when it needs to
be. That keeps the fix and returns the readability.

**Why the history table, which is the real cost.** Once a handle is mutable, changing it releases
the old one. If another organization could then claim `acme`, every stale bookmark to `/acme/…`
would begin resolving to a different tenant — precisely the cross-tenant hazard
[ADR-006](0006-slug-uniqueness-includes-soft-deleted-teams.md) exists to prevent, reintroduced
through a new door. `organization_handles` closes it, and later gives redirects for free.

An immutable name-seeded handle was the cheaper alternative and would have avoided that table
entirely. It was rejected for one reason: a collision leaves you permanently stuck on `acme-2`
with no way to fix it, and the fix is the whole point of Forge's second field.

**Consequences**

- **Stated cost:** changing a handle _does_ break existing links. Unlike the old behaviour this is
  explicit, user-initiated and warned about in the UI, rather than a side effect of renaming.
  Nothing redirects yet — `organization_handles` is the seam where that would live.
- `App\Concerns\Organizations\GeneratesPublicId` becomes `GeneratesHandle`. It exposes
  `handleIsUnavailable()` publicly so the validation rule and the generator ask one question with
  one answer.
- **ADR-008 returns as `App\Rules\Organizations\OrganizationHandle`**, with its reserved-word list
  restored from history. It is a better rule than the original: ADR-008 constrained the
  organization's _name_, which was always the wrong field. Names are now free text.
- **ADR-006 is unchanged in substance and strengthened in reach**: uniqueness spans the live
  column, soft-deleted rows, and every historical handle.
- ADR-027's other claim survives: the identifier is public and is never an authorisation factor.
  A readable handle makes that more obviously true, not less.
- Handles are recorded on every save, so the table is written on create and on change alike.
- The same shape is what `Site`, `Server` and `Client` should use if they want readable keys.
