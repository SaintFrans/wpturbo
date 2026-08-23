# ADR-029 — Recovering an abandoned organization is a manual, documented procedure

**2026-08-17** · **Status**: Accepted. Closes the involuntary case
[ADR-020](0020-ownership-can-be-transferred-the-database-enforces.md) left open.

**Decision** — There is no self-service route to take over an organization from an absent Owner.
Recovery is an operator procedure, written down in [SECURITY.md](../SECURITY.md) so it is executed
the same way every time rather than improvised. The procedure requires, in order: identity
verification of the requester; confirmation that they already hold Admin in that organization;
notification to the current Owner's address; a waiting period before the change takes effect;
and a record of who performed it and why.

**Alternatives** — An inactivity-triggered takeover an Admin can request after N days without an
Owner login; requiring every organization to hold a second administrator from creation.

**Why** — ADR-020 gives a departing Owner a way out, but not the case where they simply stop
responding — left the company, unreachable, died. That gap is real once an organization owns
live servers.

An automated takeover is the obvious fix and the wrong one at this stage. It is, by
construction, a mechanism for transferring control of an organization away from its Owner, so
every parameter in it is an attack surface: if inactivity detection is wrong, or the waiting
period is short, or the notification goes to an address the Owner no longer reads, it becomes a
path to hijacking an organization holding administrative access to customer infrastructure.
Building that correctly costs more than the problem is worth at a volume that will be a handful
of cases a year.

Requiring a second administrator was rejected because it contradicts
[ADR-025](0025-team-becomes-organization-the-personal-team-is-removed.md): not everyone
signing up is a company, and a sole trader has no second person to nominate.

**The honest limitation:** this is only as good as the operator process behind it, and there is
no operator function yet. Until there is, "documented procedure" means a known answer to a
question that will eventually be asked — not a capability that exists today. That is still
better than deciding it under pressure with a customer waiting.

**Consequences**

- The procedure is written into [SECURITY.md](../SECURITY.md). It is not code, and no ADR should be
  read as implying it is automated.
- Staff performing it have database-level access, which [SECURITY.md](../SECURITY.md) §1 already
  lists as explicitly out of scope for the threat model. This ADR does not change that; it does
  make the absence of an audit trail (gap G5) more pointed, since an ownership change is exactly
  the event you would want a record of.
- Revisit when either becomes true: manual handling stops scaling, or an audit log exists to
  back an automated flow. Not before.
