# Route to the MVP and the agent

_Written 2026-08-18._

The control plane's account, authentication and organization layer is finished. This document
sequences what remains before the Go agent can be written, and says why each step sits where it
does. It records **order**, not decisions — every step points at the ADR that already settles it.

## The critical path

The agent needs four things from the control plane, and only four:

1. A `Server` to enrol against, owned by an organization.
2. Asynchronous work. Provisioning and updates cannot happen inside an HTTP request.
3. An answer to [Q2](OPEN_QUESTIONS.md): identity, enrolment, subject isolation, command
   authorisation, result handling.
4. Somewhere for results and failures to land.

Everything else in this plan is either a prerequisite for those, or something that gets
disproportionately more expensive once servers exist. Nothing is here because it is merely nice.

## Steps

### 1 — Close the small decided gaps ✅ done 2026-08-18

All four were settled, all four were small, and one of them sat on the critical path.

| Gap | Work                                                                 | Decided by                                       |
| --- | -------------------------------------------------------------------- | ------------------------------------------------ |
| G8  | Invert the password-policy condition: strict everywhere except tests | —                                                |
| G4  | Soft-delete memberships and invitations with the organization        | [ADR-034](DECISIONS.md)                          |
| G6  | Hash invitation codes                                                | [ADR-033](DECISIONS.md)                          |
| G2  | Rate-limit invitations and queue the notification                    | [ADR-023](DECISIONS.md), [ADR-035](DECISIONS.md) |

**G2 is the one that matters beyond itself.** It is where the queue gets set up and proven on a
low-stakes notification, which is exactly the pattern provisioning will need. Establishing it now,
on something that can safely fail, is cheaper than inventing it under pressure when a server
build is hanging. The notification already implemented `ShouldQueue`; the rate limiter was the only
piece actually missing.

G4 landed first for that reason: `Server` and `Site` join the same delete tree, and adding them to
a broken one doubles the work.

**One thing G4 surfaced.** `organization_members` carries `UNIQUE(organization_id, user_id)`, so a
soft-deleted membership would block the same person being added again. That is why individual
removals — leaving, being removed, cancelling an invitation, pruning an expired one — are
`forceDelete()`, and only the organization's own deletion soft-deletes the tree. It matches what
[ADR-019](DECISIONS.md) already said, and there is a test asserting a removed member can be
re-added.

**One thing G6 surfaced.** Two of the three routes binding an invitation by its code were only ever
reached by an already-authenticated user, whose email-match check (ADR-009) — not the code's
secrecy — was the actual control. Those now bind by `id`; `code_hash` backs only the one lookup
that is genuinely pre-authentication, the emailed link. See ADR-033's implementation note.

### 2 — Audit log (G5)

Settled by [ADR-032](DECISIONS.md) and [ADR-036](DECISIONS.md). This is the largest step here and
the argument for its position is entirely about timing: there are five auditable actions today and
there will be dozens once servers exist, each destructive. Retrofitting means finding every one,
with no way to tell which were missed — a missing entry looks exactly like an action that never
happened.

It also gives the agent a place to record what it was told to do, which is the fourth thing on the
critical path.

### 3 — Build `Client`, `Server`, `Site`

[Q13](DECISIONS.md) is settled: [ADR-037](DECISIONS.md) confirms every member sees everything in
their organization. `Server::query()` and `Site::query()` are scoped by `organization_id` alone,
the same as every other tenant-owned table — no visibility helper, no scope-by-membership
indirection. What differs by role is capability: destructive actions (`site:delete`,
`client:delete`, `server:delete`, …) are new `OrganizationPermission` cases, mapped per role
exactly like the existing ones.

The entities themselves are already designed: [ADR-017](DECISIONS.md) for `Client`,
[ADR-018](DECISIONS.md) for `Site` and `SiteService`, [ADR-019](DECISIONS.md) for ownership and
deletion, [ADR-030](DECISIONS.md) for route keys via the `GeneratesHandle` trait.

### 4 — Answer [Q2](OPEN_QUESTIONS.md)

Six questions, each a security decision needing its own ADR and an entry in
[SECURITY.md](SECURITY.md) before implementation. This is the real blocker: no agent code should
be written against an undecided enrolment or subject-isolation model, because both are the tenant
isolation boundary of the whole system.

### 5 — The Go agent

Out of scope for this repository, and the reason for everything above it.

## Deliberately not in the path

|                                                                                | Why not                                                                                                                                            |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **G3** — one-owner constraint and ownership transfer ([ADR-020](DECISIONS.md)) | Real, and needed before paying customers, but it blocks nothing on the agent path. Slot it wherever there is room.                                 |
| **G12** — incident detection                                                   | Parked with the NIS2 scoping question ([SECURITY.md](SECURITY.md) §1).                                                                             |
| **G1** — the agent security model                                              | Not a gap to close; it _is_ step 4.                                                                                                                |
| Legal and privacy texts                                                        | Explicitly deferred. The retention periods in [ADR-036](DECISIONS.md) are recorded so the eventual documents have something to be written against. |

## What would change this order

- **A paying customer before the agent exists** moves G3 up immediately: an organization with no
  guaranteed owner and no transfer path is a support problem the moment someone else's money is
  involved.
