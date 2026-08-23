# ADR-017 — Clients are a grouping entity inside a Team, not a second tenancy level

**2026-08-17** · **Status**: Accepted, **partially reversed by [ADR-025](0025-team-becomes-organization-the-personal-team-is-removed.md)**

> Two changes. `Team` is renamed to `Organization` throughout this entry. And the free-form
> naming guidance — an agency creating several teams named by function, `Front-end`,
> `Back-end`, `QA` — is **withdrawn**: it cannot work alongside ADR-019, which gives each
> resource exactly one owning tenant. Everything this ADR decides about `Client` stands
> unchanged.

**Decision** — `Team` remains the sole tenancy boundary and stays free-form: an agency
creates as many Teams as it wants, named however it likes (functional groupings such as
"Front-end", "Back-end", "QA", "DevOps" are an explicit, supported use, following Forge's
convention). This resolves [Q1](../OPEN_QUESTIONS.md) — there is no second tenancy level, and
"Team" is not renamed.

A new `Client` entity is added _inside_ a Team: a lightweight record (name, contact details)
owned by a Team, with no membership, login or permission model of its own. `Site` gets a
nullable `client_id` FK scoped to the same Team; domains and mailboxes will get the same FK
when they exist. This follows the WPMUDEV Hub pattern — sites are tagged to a client for
organisation and reporting, and later for recurring billing and ticketing — without touching
the tenancy boundary.

**Alternatives** — A second tenancy level where Client sits above or below Team and owns
servers/sites directly (the two-level model Q1 raised as a possibility); folding "client"
into Team itself by convention only.

**Why** — The actual requirement is Forge-style free-naming teams (colleagues grouped
however an agency likes, not necessarily one-per-client) _plus_ WPMUDEV-style client tagging
for billing and reporting. A second tenancy level would force "one tenant per client" on
every agency, which directly contradicts wanting teams named by function rather than by
client. Modelling Client as an owned, non-tenancy entity inside Team gets the
grouping/billing/ticketing benefit at a fraction of the cost of a second enforcement layer,
and leaves ADR-005 (permissions) and ADR-007 (team-scoped URLs) completely untouched.

**Consequences**

- `Team` keeps its current meaning, model and name. No rename, no restructuring.
- `Client` is a new tenant-owned table: `team_id` FK, `cascadeOnDelete`, following the
  modelling constraints in [DATA_MODEL.md](../DATA_MODEL.md).
- `Site.client_id` (and later `Domain.client_id`, `Mailbox.client_id`) is nullable — a site
  need not belong to a client.
- Client is authorised through the same team-permission model as everything else (ADR-005);
  there is no client-level login or role in this design. A client portal with its own login
  is a distinct, deliberate future feature, not implied here.
- Recurring billing and ticketing, the motivating future uses, are out of scope for this
  ADR — it only settles the grouping shape they will attach to.
