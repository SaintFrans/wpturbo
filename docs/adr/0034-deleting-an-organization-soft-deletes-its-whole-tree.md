# ADR-034 — Deleting an organization soft-deletes its whole tree; restore is manual

**2026-08-18** · **Status**: Accepted. Implements
[ADR-019](0019-resources-belong-directly-to-their-team-cross-team.md)'s
deletion clause; closes [G4](../SECURITY.md).

**Decision** — `OrganizationController::destroy` soft-deletes memberships and invitations
alongside the organization, rather than hard-deleting them first. Owned resources join that set
as they are built. There is **no restore button**: recovery is an operator procedure, like
[ADR-029](0029-recovering-an-abandoned-organization-is-a-manual.md)'s
ownership transfer.

**Alternatives** — Add a retention window with automatic purge; drop soft-delete altogether and
delete for real.

**Why** — Today the asymmetry makes soft-delete worse than useless: the organization row survives
while its memberships do not, so restoring it produces something with no members and no owner —
an artefact nobody can reach or clean up. Either the tree survives together or nothing should.

Dropping soft-delete was the honest alternative and was rejected for one reason: deletion here is
irreversible destruction of a tenant's history at a moment when the person clicking has typed the
organization's name to confirm and may still be wrong. Keeping the rows costs almost nothing and
buys a recovery path that a support conversation can actually use.

**No restore UI** because a restore is exactly as consequential as a takeover: it puts data back
under someone's control, and the person asking is often the person who deleted it. That deserves
the same out-of-band verification ADR-029 specifies, and it is far too rare to justify a screen.

**Consequences**

- `Membership` and `OrganizationInvitation` gain `SoftDeletes`; every query touching them must
  keep excluding trashed rows, which Eloquent does by default — the risk is
  `withTrashed()` creeping into a query that should not have it.
- **Individual removals stay hard deletes**, which ADR-019 already required and which
  implementation showed is also load-bearing: `organization_members` has
  `UNIQUE(organization_id, user_id)`, so a lingering soft-deleted row would stop the same person
  from ever being re-added. Leaving, being removed, cancelling an invitation and pruning an
  expired one all use `forceDelete()`.
- Handle retirement is unaffected: `organization_handles` was already permanent and independent
  of soft-delete state.
- **The audit record of a deletion must not be deleted with it** — see
  [ADR-032](0032-an-append-only-audit-log-built-now-while-there-are.md).
- **Retention is 30 days.** Soft-deleted organizations would otherwise accumulate forever, which
  is a privacy and data-minimisation question rather than a security one. Settled in
  [ADR-036](0036-retention-30-days-for-deleted-organizations-24-months.md): 30 days, then a hard delete.
