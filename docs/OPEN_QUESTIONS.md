# Open questions

Unresolved naming and design questions. These are **not** a backlog of work to be picked
up — they are decisions that have not been made, recorded so that nobody quietly makes them
by accident while building something adjacent.

**If a task touches one of these, stop and ask rather than assuming.** That rule is in
`CLAUDE.md`. When a question is answered, move it to
[DECISIONS.md](DECISIONS.md) as an ADR and delete it here.

_Last reviewed: 2026-08-17._

---

## Q11 — Social login breaks the invitation email match

**Status:** Open. Not blocking. Becomes blocking the day GitHub login is built.

[ADR-009](DECISIONS.md) requires an invitation to be redeemed by an authenticated user whose
email matches the invitation's, and that requirement is load-bearing: it is what makes a
leaked invitation link inert. Social login undermines it without weakening the reasoning.

A user invited at `frans@ouido.digital` who signs in with GitHub may arrive as
`frans@users.noreply.github.com`, or with whichever address their provider account happens to
carry. They then cannot accept an invitation that was correctly addressed to them, and nothing
in the UI can explain why — from their side they are the right person with the right link.

Possible shapes, none decided:

1. **Multiple verified email addresses per user**, with the invitation matching any of them.
   The most complete answer and the largest change — it touches registration, verification,
   password reset and the invitation rule at once.
2. **Match on the provider account instead**, for invitations sent to a user who already
   exists. Does not help the invite-a-stranger case, which is the common one.
3. **Force an email-address confirmation step after social sign-up.** Cheapest, and pushes the
   friction onto the user at exactly the moment they are trying to join something.

Whichever is chosen must not weaken ADR-009: the second factor is control of the mailbox, and
that is the property being defended.

**Relevant when:** social login, or any change to how invitations are matched.

---

## Q12 — GitHub as an identity provider versus GitHub as a source provider

**Status:** Open. Naming and scope question, cheap to settle, expensive to conflate.

Two unrelated integrations both called "connect GitHub":

- **Identity** — signing in to the platform (Socialite, or Fortify alongside it). Scope: read
  the user's profile and email.
- **Source** — the repository a site deploys from, the way Forge and Ploi use it. Scope: read
  repositories, register webhooks, read deploy keys.

They need different scopes, different revocation behaviour, and they belong to different
things: identity belongs to a `User`, source access belongs to an `Organization` (a site is
deployed by the organization, not by whoever happened to link their account). Modelling them
as one connection means either over-scoping the login or tying an organization's deployments
to one person's GitHub account — which breaks the moment that person leaves.

Decide the split before either is built. Nothing depends on it yet.

**Relevant when:** social login, or deployments from a repository.

---

## Q13 — Per-member resource visibility inside an organization

**Status:** Open, deliberately. Decided on 2026-08-17 **not** to settle this yet.

Every member of an organization currently sees every resource in it. For an agency working with
freelancers, junior staff or temporary contractors, "this person may only see client X's sites"
is an ordinary requirement, not an edge case.
[ADR-019](DECISIONS.md) rejected RunCloud's full sharing model — a resource visible to several
teams, with visibility decoupled from role — and that rejection stands: it is machinery built
for a need this product has not demonstrated.

The narrower need is different from the one ADR-019 rejected, and is not answered anywhere:

- `Client` ([ADR-017](DECISIONS.md)) groups sites but grants nothing.
- `OrganizationRole` ([ADR-005](DECISIONS.md), [ADR-028](DECISIONS.md)) says what a member may
  *do*, never on *which* resources.

The traceable shape, if it is ever needed, is scoping a **membership** to a set of clients —
empty meaning "all", which is every membership today — rather than a second grouping entity or a
second tenancy level. That is additive and does not require reopening ADR-017, ADR-019 or
ADR-025.

**Why it is being left open, and the risk of doing so.** The need has not appeared with real
customers yet, and building visibility machinery before it does is the premature abstraction
ADR-019 argued against. The cost is stated plainly: `Site` and `Server` are about to be built,
and every query written against them will assume "every member sees everything". If the answer
later turns out to be yes, that assumption has to be unpicked across every query rather than
changed in one place — which is exactly what ADR-019 quotes Ploi's roadmap admitting went wrong
for them.

A cheap hedge was considered and not taken: routing every resource query through a single scope
helper from day one, even one that always returns everything. If this question is revisited
before `Site` lands, that hedge is the thing to reconsider first.

**Relevant when:** any resource query on `Site`, `Server`, `Client` or `Domain` is written; any
request from a customer to restrict what a member can see.

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

**Relevant when:** any work on the agent, NATS, provisioning or server enrolment begins.

---
