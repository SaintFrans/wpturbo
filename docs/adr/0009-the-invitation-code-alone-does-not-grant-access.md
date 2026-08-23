# ADR-009 — The invitation code alone does not grant access

**Reconstructed** · **Status**: Accepted

**Decision** — Accepting an invitation requires both the 64-character code _and_ an
authenticated user whose email matches the invitation's email, compared case-insensitively
(`App\Rules\ValidTeamInvitation`). Invitations expire after three days and expired rows are
pruned daily.

**Alternatives** — Treat possession of the code as sufficient authority, the common
"anyone with the link can join" pattern.

**Why** — Invitation links travel through email, which gets forwarded, archived, indexed by
corporate scanners and left in shared inboxes. Making the link alone sufficient means one
careless forward grants a stranger access to a tenant's data. Requiring the mailbox as well
means a leaked link is inert without control of the invited address. The cost is friction:
you cannot invite `info@` and have a colleague accept from their personal address. That
trade is correct for a platform holding customer server access.

**Consequences** — Any future invite-style flow (server enrolment tokens, share links)
follows the same shape: the token identifies, a second factor authorises. Changing the
invited email means cancelling and re-inviting.
