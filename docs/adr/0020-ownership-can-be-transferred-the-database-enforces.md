# ADR-020 — Ownership can be transferred; the database enforces exactly one Owner

**2026-08-17** · **Status**: Accepted, **completed by [ADR-029](0029-recovering-an-abandoned-organization-is-a-manual.md)**

> This entry covers the voluntary transfer. The involuntary case — an Owner who disappears
> without handing over — is answered by ADR-029: a documented operator procedure, deliberately
> not a self-service takeover. Note also that ADR-028 does **not** loosen this: Owner stays out
> of `assignable()`, and an Admin can never promote anyone to Admin or Owner.

**Decision** — Resolves [Q6](../OPEN_QUESTIONS.md). `TeamRole::assignable()` will include Owner
in one context only: a dedicated "transfer ownership" action, distinct from the general
member-role editor. The transfer is a single transaction: the current Owner becomes Admin,
the chosen target (who must already be an Admin) becomes Owner. A database constraint
enforces at most one Owner per team; combined with the existing `TeamPolicy` rule that blocks
the sole Owner from leaving or being removed, this guarantees exactly one Owner always
exists once a team has any members at all.

**Alternatives** — Leave ownership untransferable, as today; allow shared/multiple Owners.

**Why** — An owner who wants to step back currently has no route to do so, and an abandoned
team has no path to a new Owner — a real operational gap once a team owns live servers and
sites, not a theoretical one. Restricting the source pool to existing Admins (rather than any
Member) means a transfer is always to someone who has already been trusted with the team's
administrative permissions, not a cold handoff to an untested member.

**Consequences**

- The transfer action is a new, explicit endpoint — not a side effect of the existing
  member-role update form, which still excludes Owner from its options.
- The database constraint (partial unique index: one `owner` role per `team_id`) makes a
  zero- or multiple-owner team unrepresentable, closing the gap `Team::owner()`'s
  `first()` lookup was quietly relying on.
- Transfer requires the target to already hold Admin — promoting a Member to Owner directly
  is not supported; promote to Admin first.
