# ADR-028 — Admins manage members below their own role

**2026-08-17** · **Status**: Accepted, **implemented 2026-08-18**. Amends
[ADR-005](0005-permissions-are-an-enum-decoupled-from-roles.md).

**Decision** — `member:add`, `member:update`, `member:remove` and `invitation:create` are granted
to Admin as well as Owner, with one constraint: an actor may only affect a membership, or issue
an invitation for a role, that ranks **strictly below their own**. `OrganizationRole::level()`
(Owner 3, Admin 2, Member 1) already exists for this and is currently unused by any route.

In practice: an Admin may add, remove and re-role Members, and may invite people as Members. An
Admin may not touch another Admin or the Owner, may not invite anyone as Admin or Owner, and
therefore cannot escalate themselves or create a peer. `organization:delete` stays Owner-only.

| Permission            | Owner | Admin | Member |
| --------------------- | :---: | :---: | :----: |
| `organization:update` |  ✅   |  ✅   |   —    |
| `organization:delete` |  ✅   |   —   |   —    |
| `member:add`          |  ✅   |  ✅¹  |   —    |
| `member:update`       |  ✅   |  ✅¹  |   —    |
| `member:remove`       |  ✅   |  ✅¹  |   —    |
| `invitation:create`   |  ✅   |  ✅¹  |   —    |
| `invitation:cancel`   |  ✅   |  ✅   |   —    |

¹ Only against a role ranking below the actor's own.

**Alternatives** — Leave all member management with the Owner, as today; grant Admins removal
only, without role changes.

**Why** — The current split has a failure mode that is a security problem rather than an
inconvenience. Only the Owner can remove a member. If the Owner is on holiday and someone
leaves the company suddenly, nobody can revoke that person's access to an organization holding
administrative control over customer servers. The safest-looking permission map produces the
least safe outcome, because the bus factor for revocation is one.

The rank constraint is what makes widening this safe: everything the Owner needs protecting from
— self-promotion, removing the Owner, minting a peer Admin — is blocked by the same single rule,
and the rule is one comparison rather than a set of special cases. It is also the model GitHub,
Slack and Google Workspace use, so it matches what users already expect.

**Granting removal without role changes was rejected** as a half-permission: harder to explain
than the whole one, and it would leave the `member:add` / `invitation:create` split — invisible
to users, since both mean "someone new joins" — sitting there unexplained.

**Stated cost.** An Admin can now remove a Member without the Owner's involvement. That is the
point, and it is a real widening: an Admin acting maliciously or carelessly can cut a colleague's
access. The rank rule bounds the blast radius to roles below them, and it does not reach any
resource — this is membership only. It does raise the value of gap G5: an ownership or membership
change is now something more than one person can perform, and there is still no record of who did
it.

**Consequences**

- The rank check lives in `OrganizationPolicy` (`updateMember`, `removeMember`, `inviteMember`),
  not in the permission map. Permissions stay plain role→capability booleans per ADR-005; the
  comparison is an additional guard, so the enum keeps reading as a specification.
- `invitation:create` must validate the _invited role_ against the actor's level, not only the
  action. An Admin inviting an Admin is the escalation path this closes.
- `member:add` and `invitation:create` now map identically for both roles. They are kept
  separate because a future "add an existing platform user directly" flow would use the first
  while email invitations use the second. If that flow never appears, merge them.
- Tests required, all negative: an Admin cannot remove another Admin, cannot remove the Owner,
  cannot promote anyone to Admin or Owner, cannot invite above Member — and can remove a Member.
- [SECURITY.md](../SECURITY.md) §3 "Privilege boundaries" is rewritten by this.
- **Implementation found a live escalation path this entry did not anticipate.**
  `CreateOrganizationInvitationRequest` validated the role with `Rule::enum`, which accepts every
  case including `owner`, while `inviteMember` only asked whether the actor could invite at all.
  Any Admin could therefore invite a new Owner — before this ADR, not because of it. Verified with
  a probe test, then closed as part of this change and recorded as G11 in
  [SECURITY.md](../SECURITY.md). It is the sharpest possible illustration of this entry's own point:
  the escalation path is the _invited role_, not the invite action.
- `assignable()` is gone; `assignableBy(OrganizationRole $actor)` replaces it. Owner drops out
  because a role does not outrank itself, so the ADR-005/ADR-020 guarantee now holds by
  construction instead of by a hardcoded exception.
- Form requests gained `authorize()` so the base permission is checked before validation.
  Without it a Member submitting an invitation got a field error about the role rather than a
  403 — the right outcome for the wrong reason.
