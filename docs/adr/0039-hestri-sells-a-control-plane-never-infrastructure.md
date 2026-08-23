# ADR-039 — Hestri sells a control plane, never infrastructure

**2026-08-22** · **Status**: Accepted. Replaces the "two tiers, semi-managed first" framing in
[README.md](../../README.md).

**Decision** — Hestri sells software that manages servers the customer owns. It does not buy,
resell or bill for infrastructure. Bring-your-own-server is the product, not the first of two
tiers. A fully managed tier remains conceivable but is explicitly **not a plan**, and its only
claim on the present is one field: `Server` records the provenance of the machine — who owns it and
who pays for it — and **nothing downstream may branch on that value**. Not the agent, not
provisioning, not `Site`.

**Alternatives** — Running our own infrastructure and reselling capacity, either instead of or
alongside bring-your-own-server. Building the abstraction for both now, on the reasoning that
managing someone else's server is the same work as managing our own.

**Why** — The engineering genuinely is nearly identical; the business is not. Reselling adds three
subsystems containing no interesting engineering — reseller billing with its working capital,
dunning and merchant-of-record VAT exposure; capacity and procurement; and 24/7 uptime liability,
which for a solo founder means owning outages on holiday and while ill.

Against that, bring-your-own-server converts the hardest objection into the easiest sale. "Put your
clients' businesses on infrastructure owned by a company you have never heard of" is unbuyable from
a one-person operation, and rightly so. "Install an agent on your own server, cancel any time, and
if we vanish your sites keep serving" costs a stranger almost nothing to try. The market bears this
out without exception: every control plane sold by a small team is bring-your-own-server (Forge,
Ploi, RunCloud, SpinupWP, GridPane); every managed host is a venture- or agency-scale operation
with a support rota.

It also reframes who the reseller is. An agency wanting to sell managed hosting to its own clients
should buy the server, bill the client, keep the margin and carry the liability — a business that
works at agency scale. Selling that agency the tool is a larger market than competing with per-site
hosts on price, and it makes white-labelling a first-class concern.

Building the abstraction for both now was rejected as the specific way this schedule would die:
provider APIs, capacity models and billing hooks bleeding into the schema before a single site is
provisioned. One field, and a rule that nothing reads it, keeps the option open at no cost.

**Consequences**

- `Server` carries a provenance field from its first migration. Every other model, and the agent,
  stays indifferent to it. A managed tier later is then a provisioner plus billing, not a migration.
- No provider-account, capacity-pool or infrastructure-billing concepts enter the data model.
- Provisioning into the _customer's own_ provider account via their API token is a **feature**, not
  a change of model, and remains available later without revisiting this ADR: the customer still
  pays the provider directly.
- Who owns an outage on infrastructure we do not own is unresolved and needs answering before the
  first paying customer — [Q16](../OPEN_QUESTIONS.md).
- Revisit only when paying customers ask for managed hosting by name, and treat it then as founding
  a second company, because it is one.
