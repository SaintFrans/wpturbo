# ADR-027 — The tenant URL identifier is a random, immutable public ID

**2026-08-17** · **Status**: **Superseded by [ADR-030](0030-the-tenant-url-identifier-is-a-name-seeded-separately.md)**

> Reversed the same day, after implementation. **Its central argument does not hold:** the claim
> that a name-derived identifier lets an attacker probe `/some-agency/` to discover customers is
> false, because `EnsureOrganizationMembership` returns one indistinguishable 403 for "no such
> organization" and "not a member". The readability this entry traded away was therefore paid for
> with a benefit that did not exist. What it got right — that renaming must never change the URL,
> and that an identifier is never reissued — is carried forward by ADR-030.

**Original decision** — Supersedes the slug-generation half of
[ADR-006](0006-slug-uniqueness-includes-soft-deleted-teams.md); retires
[ADR-008](0008-team-names-are-validated-against-reserved-route.md); amends
[ADR-007](0007-tenancy-is-scoped-by-team-slug-in-the-url-prefix.md).

**Decision** — The first URL segment stops being a slug derived from the organization's name and
becomes a randomly generated, opaque, **immutable** public identifier: `/k7m3xq9v2rft/sites/12`.
It is generated once at creation, never derived from anything, and never changes — renaming an
organization does not touch it, and there is no action that does.

The column is renamed `slug` → `public_id`, since "slug" would be a lie about what it holds.
Format: twelve lowercase alphanumeric characters from an alphabet excluding visually ambiguous
ones (`0`/`o`, `1`/`l`/`i`), so it survives being read aloud, copied by hand or pasted into a
support ticket.

**Alternatives** — Freeze the name-derived slug at creation, with an explicit opt-in action to
change it (the option originally recommended); keep regenerating it on rename, as today;
sequential integer IDs.

**Why** — Today `Organization::booted()` regenerates the slug on rename, so renaming an
organization silently invalidates every bookmark, every link shared in Slack and every URL in
mail history. That is the exact failure ADR-006 was written to prevent, reintroduced by a button
in the settings screen.

Freezing a name-derived slug fixes that, but keeps three other problems. A random identifier
removes all four at once:

1. **Links cannot break on rename** — not by policy, but by construction. There is no code path
   that changes the identifier, so there is nothing to get wrong later.
2. **The `acme-2` collision suffix disappears.** Two organizations may share a name freely.
   `GeneratesUniqueOrganizationSlugs`, with its slug-parsing and numeric-suffix logic, collapses
   into generate-and-retry-on-collision.
3. **Organization names become genuinely free text.** ADR-008 exists only because a name-derived
   slug occupies the first URL segment, so an organization called "Settings" would shadow the
   application's own routes. A twelve-character random token cannot collide with any route
   literal, so the reserved-word list and the whole class of bug it guards against stop existing.
4. **The customer's name leaves the URL.** This is the part worth the most. Today every URL
   contains the agency's name, which means the identifier is guessable: anyone can probe
   `/some-agency/` and learn from the response whether that agency is a customer. A random
   identifier removes that inference entirely — a property DATA_MODEL.md already argued for when
   it rejected sequential IDs, applied consistently rather than half-way.

**Stated cost — this is a real loss, not a free win.** URLs stop being human-readable.
[ADR-007](0007-tenancy-is-scoped-by-team-slug-in-the-url-prefix.md) and DATA_MODEL.md both
explicitly valued readability, on the grounds that agency staff share links internally, and
`/k7m3xq9v2rft/sites/12` tells a reader nothing about which organization they are about to open.

That cost is accepted because the property ADR-007 actually needed is _unambiguity_ — one URL
resolves to exactly one tenant, so a shared link never shows the reader someone else's data —
and that is fully preserved. Readability was a convenience layered on top. The organization
switcher and the page header still name the organization on arrival, so a reader who opens the
link is not confused; they simply cannot tell in advance from the URL alone.

**Consequences**

- `organizations.slug` → `organizations.public_id`: unique, generated on create, **immutable
  thereafter**. No rename path, no redirect table, no reserved slugs to maintain.
- **ADR-006's reasoning is preserved and its cost disappears.** The uniqueness check keeps
  `withTrashed()`, so a deleted organization's identifier is never reissued and a stale bookmark
  can never resolve to a different tenant. What goes away is the "occasional ugly `acme-2`" that
  entry accepted as the price.
- **ADR-008 is retired.** `OrganizationName` keeps ordinary validation — length, character set,
  required — but the reserved-word list and the route-prefix collision check are removed, because
  the condition that made them load-bearing no longer exists. Note the inversion: validation moves
  from _user input_ to _generated output_, and the generator has nothing to validate against.
- **The same generator is reused for `Site`, `Server` and `Client` route keys**, settling
  DATA_MODEL.md's "route keys for tenant resources should be non-sequential" constraint with one
  shared implementation rather than a rule each new table has to remember.
- The generator retries on collision against `withTrashed()`. At twelve characters over a
  thirty-ish character alphabet, a collision is a formality, but the retry is one line and makes
  the guarantee absolute rather than probabilistic.
- Existing local databases must be rebuilt. There is no production data, so no backfill migration
  is written.
