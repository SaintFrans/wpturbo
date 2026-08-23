# ADR-019 — Resources belong directly to their `Team`; cross-team sharing is deferred

**2026-08-17** · **Status**: Accepted

**Decision** — Resolves [Q5](../OPEN_QUESTIONS.md) and confirms ADR-017's ownership model
against two real competitors' designs. `Server`, `Site`, `Client` and `Domain` all carry a
`team_id` and are owned by exactly one `Team`, visible to every member of that team — the
same shape `Team` already has today, extended rather than replaced. Deleting a `Team` soft-
deletes its memberships, invitations, and owned resources together, so restoring the team is
restoring a coherent whole rather than an empty shell (closing the gap DATA_MODEL.md flagged
in `TeamController::destroy`). Deleting an individual resource (e.g. one `Site`) is a
separate, explicit, permission-gated hard delete, independent of team lifecycle.

**Alternatives considered** — A `RunCloud`-style split, researched directly against the
competitors named as inspiration for this product: a `Team` there is a pure visibility grant
(which resources a member can see) fully decoupled from `Role` (what they can do), letting
one resource be shared across multiple teams, with a default "All Access" team for solo
users. `Ploi`, by contrast, ships the same shape this ADR adopts — servers, sites, backups
and scripts each belong to exactly one team, filtered by "current team context" — and its own
roadmap notes visibility/permissions "were built as something of an afterthought," with sites
added after team setup needing manual permission attention.

**Why** — The Ploi shape is what is already built and tested in this codebase
(`current_team_id`, the team switcher, `EnsureTeamMembership`); adopting it for the hosting
domain costs nothing new. The RunCloud shape only pays for itself once a real need exists for
the _same_ resource to be worked on by two different teams with different permissions —
nothing in this product today creates that need, and building the grant-table and
Account-layer machinery speculatively is exactly the premature abstraction `CLAUDE.md` warns
against. Ploi's own admission that bolting sharing on later caused friction is a reason to
default resources to a visible, working owner now, not a reason to build the general case
upfront.

**Consequences**

- No new `Account` entity. `Team` remains both the tenancy boundary (ADR-007) and the
  resource owner.
- `Client` (ADR-017) is owned by `Team`, not by any higher entity — consistent with `Team`
  owning every other resource.
- If real usage later proves a resource needs multi-team visibility, the traceable path is
  additive: a `team_resource` grant table recording _additional_ teams with access, with
  `team_id` remaining the resource's "home" team. This does not require revisiting this ADR's
  core model, only extending it.
- `TeamController::destroy` must be changed to soft-delete memberships, invitations, and (once
  they exist) owned resources in the same operation as the team, rather than hard-deleting
  memberships first as it does today.
