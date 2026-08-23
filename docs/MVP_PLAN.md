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

| Gap | Work                                                                 | Decided by                                                                                                                          |
| --- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| G8  | Invert the password-policy condition: strict everywhere except tests | —                                                                                                                                   |
| G4  | Soft-delete memberships and invitations with the organization        | [ADR-034](adr/0034-deleting-an-organization-soft-deletes-its-whole-tree.md)                                                         |
| G6  | Hash invitation codes                                                | [ADR-033](adr/0033-invitation-codes-are-stored-hashed.md)                                                                           |
| G2  | Rate-limit invitations and queue the notification                    | [ADR-023](adr/0023-invitation-emails-are-rate-limited-and-queued.md), [ADR-035](adr/0035-laravel-cloud-is-the-deployment-target.md) |

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
[ADR-019](adr/0019-resources-belong-directly-to-their-team-cross-team.md) already said, and there is a test asserting a removed member can be
re-added.

**One thing G6 surfaced.** Two of the three routes binding an invitation by its code were only ever
reached by an already-authenticated user, whose email-match check (ADR-009) — not the code's
secrecy — was the actual control. Those now bind by `id`; `code_hash` backs only the one lookup
that is genuinely pre-authentication, the emailed link. See ADR-033's implementation note.

### 2 — Audit log (G5) ✅ done 2026-08-18

Settled by [ADR-032](adr/0032-an-append-only-audit-log-built-now-while-there-are.md) and [ADR-036](adr/0036-retention-30-days-for-deleted-organizations-24-months.md). This was the largest step here and
the argument for its position was entirely about timing: there were a handful of auditable actions
and there will be dozens once servers exist, each destructive. Retrofitting means finding every
one, with no way to tell which were missed — a missing entry looks exactly like an action that
never happened.

It also gives the agent a place to record what it was told to do, which is the fourth thing on the
critical path.

**What shipped.** Eight events, in a new `Audit` domain (`AuditLogEntry`, `AuditAction`,
`RecordAuditEntry`) rather than inside `Organizations` — this table will be written to by `Server`
and `Site` as well. `organization_id` and the target carry no foreign key, deliberately: entries
must survive the organization's eventual hard purge, and the target is routinely already
force-deleted by the very action being recorded. Owners and Admins read it at
`/org/{organization}/settings/audit-log`, gated by a new `ViewAuditLog` permission — the one
deliberate exception to ADR-037's "every member sees everything." See ADR-032's implementation
note for what was added beyond the original decision.

**Not done: the retention purge.** ADR-036 sets the periods (30 days, 24 months); the scheduled
tasks that enforce them do not exist yet. Real work, but small, and not on the critical path to the
agent — slot it in with G3 whenever there is room.

### 3 — Build `Client`, `Server`, `Site` — `Client` done 2026-08-20

Built in phases, smallest and least entangled first. **`Client` is done**: table, model, the three
permissions, policy, a Clients area with an overview table, create/edit/delete, three audit
actions, 16 feature tests. It was first because it is the only one of the three that depends on
nothing — `Server` immediately raises enrolment fields that [Q2](OPEN_QUESTIONS.md) has not
answered, and `Site` needs `Client` for its `client_id`.

One decision came out of it, [ADR-038](adr/0038-a-clients-route-key-is-a-short-random-public-id-not-a.md): a client is addressed by a five-character
random `public_id`, not a handle and not the row id. That reverses ADR-030's closing suggestion for
everything below the tenant segment, so `Server` and `Site` should follow `Client` here rather than
`Organization`.

**Deliberately not built yet**, and each cheap to add when there is a reason: a client detail page
(the overview table is enough while a client holds nothing), search or pagination on the list, and
anything billing- or ticketing-shaped — ADR-017 named those as the motivating future uses and
explicitly left them out of scope.

`Server` and `Site` remain. Q13 is settled: [ADR-037](adr/0037-every-member-sees-everything-in-their-organization.md) confirms every member sees everything in
their organization. `Server::query()` and `Site::query()` are scoped by `organization_id` alone,
the same as every other tenant-owned table — no visibility helper, no scope-by-membership
indirection. What differs by role is capability: destructive actions (`site:delete`,
`client:delete`, `server:delete`, …) are new `OrganizationPermission` cases, mapped per role
exactly like the existing ones.

The entities themselves are already designed: [ADR-017](adr/0017-clients-are-a-grouping-entity-inside-a-team-not-a.md) for `Client` (built),
[ADR-018](adr/0018-the-hosted-resource-is-called-site-with-a-type-and.md) for `Site` and `SiteService`, [ADR-019](adr/0019-resources-belong-directly-to-their-team-cross-team.md) for ownership and
deletion, [ADR-030](adr/0030-the-tenant-url-identifier-is-a-name-seeded-separately.md) for route keys via the `GeneratesHandle` trait.

**Three commercial constraints were added on 2026-08-22** and they land entirely on these two
models. They change what `Server` and `Site` must carry, not where they sit in this order. See
[BUSINESS_MODEL.md](BUSINESS_MODEL.md); the decisions are
[ADR-039](adr/0039-hestri-sells-a-control-plane-never-infrastructure.md), [ADR-040](adr/0040-sites-are-containers-on-customer-vps-instances-not.md) and [ADR-041](adr/0041-pricing-scales-on-billable-sites-capabilities-are.md).

| Constraint                                                                                                           | What it means for the migration                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Server` records provenance ([ADR-039](adr/0039-hestri-sells-a-control-plane-never-infrastructure.md))               | One column recording who owns and pays for the machine, and a rule that nothing downstream reads it. It keeps a managed tier possible later at no cost now — and it is worthless the moment something branches on it.    |
| `Site` lifecycle states are invoice lines ([ADR-041](adr/0041-pricing-scales-on-billable-sites-capabilities-are.md)) | Production, staging, provisioning and suspended must be distinguishable in one scoped query, with no interpretation. Pricing counts production sites and nothing else. Every transition is permission-gated and audited. |
| `Site` is not welded to a `Server` ([ADR-040](adr/0040-sites-are-containers-on-customer-vps-instances-not.md))       | The foreign key is mutable and the move is auditable. Moving a site between servers is what replaces the elasticity the infrastructure model deliberately lacks.                                                         |

A real **suspend** action follows from the second of those: suspension is how a site stops being
billable, so delete-and-reinstall is not an acceptable substitute.

**Explicitly not in this step, or anywhere near it:** metering, plans, subscriptions, invoicing,
spend caps, payment integration. The definitions have to exist in the schema now because
retrofitting a billable unit means retrofitting it against a customer. The billing that reads them
does not exist and will not until there is something to bill for. Building it earlier is the
fastest way to ship neither a control plane nor a billing product.

### 4 — Answer [Q2](OPEN_QUESTIONS.md)

Six questions, each a security decision needing its own ADR and an entry in
[SECURITY.md](SECURITY.md) before implementation. This is the real blocker: no agent code should
be written against an undecided enrolment or subject-isolation model, because both are the tenant
isolation boundary of the whole system.

### 5 — The Go agent

Out of scope for this repository, and the reason for everything above it.

### 3b — Server headroom and site placement

Follows `Server` and `Site` immediately, and belongs on the path rather than beside it. On
infrastructure we do not own, per-server headroom with per-site attribution is both the thing that
replaces elasticity ([ADR-040](adr/0040-sites-are-containers-on-customer-vps-instances-not.md)) and the only honest answer to "why is this site slow
and whose fault is it". Vertical resize through a provider API and moving a site between servers are
the two actions it makes possible.

It sits after `Site` because it needs both models, and before the agent because it defines what the
agent has to report.

## Deliberately not in the path

|                                                                                                                                  | Why not                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **G3** — one-owner constraint and ownership transfer ([ADR-020](adr/0020-ownership-can-be-transferred-the-database-enforces.md)) | Real, and needed before paying customers, but it blocks nothing on the agent path. Slot it wherever there is room.                                                                                      |
| **G12** — incident detection                                                                                                     | Parked with the NIS2 scoping question ([SECURITY.md](SECURITY.md) §1).                                                                                                                                  |
| **G1** — the agent security model                                                                                                | Not a gap to close; it _is_ step 4.                                                                                                                                                                     |
| Legal and privacy texts                                                                                                          | Explicitly deferred. The retention periods in [ADR-036](adr/0036-retention-30-days-for-deleted-organizations-24-months.md) are recorded so the eventual documents have something to be written against. |

## What would change this order

- **A paying customer before the agent exists** moves G3 up immediately: an organization with no
  guaranteed owner and no transfer path is a support problem the moment someone else's money is
  involved.
- **A paying customer also forces [Q16](OPEN_QUESTIONS.md)** — who owns an outage on a server we do
  not own. Not a code question, but two of its answers have product consequences: detecting a
  vanished server rather than failing silently, and backing up before mutation as a hard rule rather
  than a feature.
