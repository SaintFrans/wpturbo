# Open questions

Unresolved naming and design questions. These are **not** a backlog of work to be picked
up — they are decisions that have not been made, recorded so that nobody quietly makes them
by accident while building something adjacent.

**If a task touches one of these, stop and ask rather than assuming.** That rule is in
`CLAUDE.md`. When a question is answered, move it to
[DECISIONS.md](DECISIONS.md) as an ADR and delete it here.

_Last reviewed: 2026-08-18._

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
