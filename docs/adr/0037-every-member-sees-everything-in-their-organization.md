# ADR-037 — Every member sees everything in their organization; visibility is not scoped

**2026-08-18** · **Status**: Accepted. Resolves [Q13](../OPEN_QUESTIONS.md) (question removed).

**Decision** — Every member of an organization continues to see every `Client`, `Server` and
`Site` it owns. There is no per-member or per-client visibility restriction, now or as a near-term
plan. What varies by role is capability, never visibility: as `Client`, `Server` and `Site` are
built, destructive and sensitive actions on them (`site:delete`, `client:delete`,
`server:delete`, …) become new `OrganizationPermission` cases, mapped per role exactly like
`member:remove` and `organization:delete` are today.

**Alternatives** — Scoping a membership to a subset of clients, the "traceable shape" Q13 left open
if the need ever appeared; a general visibility/sharing grant table, the RunCloud shape
[ADR-019](0019-resources-belong-directly-to-their-team-cross-team.md)
already rejected for ownership.

**Why** — The need this would answer — an agency wanting to keep a freelancer or junior off a
sensitive client — has not appeared, and what agencies actually ask for is narrower: stopping the
wrong person from _deleting_ a site or a client, not hiding it from their dashboard. That is a
capability question, and the platform already has a mechanism for it
([ADR-005](0005-permissions-are-an-enum-decoupled-from-roles.md),
[ADR-028](0028-admins-manage-members-below-their-own-role.md)). Building a visibility layer to
answer a capability need would be exactly the premature abstraction ADR-019 already warned
against, aimed at the wrong problem besides.

**Consequences**

- `Client::query()`, `Server::query()` and `Site::query()` are scoped by `organization_id` alone,
  the same as every other tenant-owned table ([SECURITY.md](../SECURITY.md) §5 rule 1). No scope
  helper, no membership indirection.
- New destructive or sensitive actions on these entities are added to `OrganizationPermission` as
  each entity is built, not deferred to a future visibility feature.
- This closes Q13 for good, not provisionally. If a real customer need for restricted visibility
  appears later, that is a new ADR weighing a new, concrete requirement — not a reopening of this
  one.
