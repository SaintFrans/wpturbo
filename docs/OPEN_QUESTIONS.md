# Open questions

Unresolved naming and design questions. These are **not** a backlog of work to be picked
up — they are decisions that have not been made, recorded so that nobody quietly makes them
by accident while building something adjacent.

**If a task touches one of these, stop and ask rather than assuming.** That rule is in
`CLAUDE.md`. When a question is answered, move it to
[DECISIONS.md](DECISIONS.md) as an ADR and delete it here.

_Last reviewed: 2026-08-22._

---

## Q2 — Agent identity, enrolment and authorisation

**Status:** Open. Blocks all agent work. Nothing is implemented.

Before a single line of the Go agent or its control-plane counterpart is written:

1. **Enrolment** — how does a new server prove which tenant it belongs to on first
   connection? A one-time token, a signed bootstrap file, mutual TLS, something else?
2. **Identity** — what is an agent's durable identity, and how is it revoked when a server
   is decommissioned or a customer leaves?
3. **Credential rotation** — how are agent credentials rotated, and what happens to a server
   that is offline across a rotation?
4. **NATS subject design and isolation** — how are subjects namespaced per tenant, and what
   enforces that agent A cannot subscribe to tenant B's subjects? This is the tenant
   isolation boundary of the whole system; getting it wrong exposes every customer to every
   other customer.
5. **Command authorisation** — the agent executes privileged operations on a customer's
   server. What proves an instruction genuinely originated from an authorised control-plane
   action, rather than from anything else that reached the message bus?
6. **Result handling** — how do results, logs and failures flow back, and what stops a
   compromised agent from writing into another tenant's records?

Each of these is a security decision, so each needs an entry in
[SECURITY.md](SECURITY.md) and an ADR before implementation.

**Do not start on this before the rest of the control-plane foundation — `Client`, `Server`,
`Site` and the audit log — is built.** [MVP_PLAN.md](MVP_PLAN.md) sequences it deliberately last:
the full agent design is a programme of its own, and it should be scoped once the foundation it
builds on is actually finished, not sketched alongside it.

**Relevant when:** any work on the agent, NATS, provisioning or server enrolment begins.

---

## Q14 — Where do backups live, and is storage a metered charge?

**Status:** Open. Blocks nothing yet; must be answered before backups are built.

[ADR-041](DECISIONS.md) allows exactly one kind of second charge — a consumption meter for
something that costs us money per unit — and backup storage is the only candidate. Whether it
exists at all depends on where backups are written:

1. **To the customer's own object storage** (their S3, B2, Storage Box). Consistent with
   [ADR-039](DECISIONS.md) and with the rule that we never bill for what the customer already
   bought. There is then **no second meter at all** and pricing stays purely per-site. It also
   means a restore depends on credentials and a bucket we do not control.
2. **To storage we run**, as a convenience, metered honestly per GB beyond an included allowance.
   Simpler for the customer, and the only place a genuine consumption charge could appear. It also
   makes us the custodian of every customer's site data, which is a materially larger security and
   liability surface than anything currently in the threat model.
3. **Both**, defaulting to (1) with (2) as an option.

The answer decides whether the pricing page has one line or two, and whether
[SECURITY.md](SECURITY.md) gains a whole section on custodial data.

**Relevant when:** backups, restore, or any pricing implementation begins.

---

## Q15 — Is there a client-facing principal, and what can it see?

**Status:** Open. Blocks the "every account gets every capability" claim in
[ADR-041](DECISIONS.md).

[ADR-017](DECISIONS.md) deliberately gave `Client` no membership and no login: it is a grouping
entity, not a tenancy level. [ADR-037](DECISIONS.md) then settled that every _member_ sees
everything in the organization. Neither addresses a person who is not a member at all — the
agency's own client, wanting to see their own site's uptime, or approve an update.

That is a new principal class sitting outside the membership model, and every part of it is
undecided: how they authenticate, what they can see, whether they exist per-`Client` or
per-`Site`, and what stops such an account being a path into the organization's other data. It is
squarely a tenant-isolation question, so it needs its own ADR and an entry in
[SECURITY.md](SECURITY.md) before any implementation.

Until it is answered, **client-facing access is not part of the offer** and must not be described
as one, even though [ADR-041](DECISIONS.md) gates no capabilities by volume.

**Relevant when:** client access, client portals, approval flows, or a second guard is proposed.

---

## Q16 — Who owns an outage on infrastructure we do not own?

**Status:** Open. Not a code question. Must be answered before the first paying customer.

[ADR-039](DECISIONS.md) makes the customer's provider account, payment method and server the
customer's own, while provisioning, the agent and the control plane are ours. That boundary is
clear technically and completely unwritten commercially:

1. What, if anything, is promised about availability — of the control plane, and of the sites it
   manages?
2. When a site is down because the customer's server ran out of disk, whose problem is it, and what
   does support actually do?
3. What happens when the customer stops paying their provider and the server disappears with the
   sites on it?
4. What are we liable for when our own action — a failed update, a bad provisioning run — breaks a
   production site belonging to somebody's client?

The answers belong in terms of service rather than an ADR, but the third and fourth have product
consequences: (3) argues for detecting and reporting a vanished server rather than silently
failing, and (4) argues for backups before mutation as a hard rule rather than a feature.

**Relevant when:** terms of service, support policy, or paid signup is built.
