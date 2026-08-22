# Business model

_Written 2026-08-22._

What Hestri sells, to whom, and how it is priced. This document exists because three of those
answers constrain the data model — a billable unit has to be unambiguous in the database before it
can appear on an invoice — and because the pricing shape is a deliberate position, not a number
someone will pick later.

Decisions here are recorded as [ADR-039](DECISIONS.md), [ADR-040](DECISIONS.md) and
[ADR-041](DECISIONS.md). **Nothing in this document is implemented.** There is no billing domain,
no metering, no plan model. See [What this obliges us to build](#7-what-this-obliges-us-to-build).

---

## 1. What Hestri sells

**A control plane. Never infrastructure.** Customers bring their own servers; the platform
enrols them, provisions sites onto them, keeps WordPress updated, takes backups and reports
health. The customer's hosting bill goes to their own provider, on their own account, paid with
their own card.

This is not a starter tier on the way to becoming a host. It is the product ([ADR-039](DECISIONS.md)).

Three reasons, in descending order of importance.

**Trust at cold start.** Sold to a stranger by a one-person company, "put your clients'
businesses on infrastructure I own" is an unbuyable proposition, and rightly so — if Hestri
disappears, their sites disappear. "Install an agent on your own server, cancel any time, and if
we vanish your sites keep serving" is nearly risk-free to try. That asymmetry is the single
largest advantage available to this product, and reselling infrastructure throws it away.

**The three subsystems reselling adds contain no interesting engineering.** Billing as a
reseller (working capital, dunning, merchant-of-record VAT across jurisdictions), capacity and
procurement (provider quotas, region availability, the half-empty box someone just left), and
24/7 uptime liability. Solo, the last one means owning outages on holiday and with flu.

**The category confirms it.** Every control plane sold successfully by a small team is
bring-your-own-server: Forge, Ploi, RunCloud, SpinupWP, GridPane. Every managed host is a
venture- or agency-scale operation with a support rota. Nobody solo-founds a managed host, and it
is not for lack of the idea.

### The reseller is the customer, not us

An agency that wants to sell managed hosting to its own clients should do exactly that: buy the
server, bill the client, keep the margin, carry the liability. That business works at agency
scale. Hestri sells the tool that makes it possible.

This is a better position than competing with per-site hosts on price: a larger market, no
infrastructure risk, no support liability — and it makes white-labelling a first-class concern
rather than an afterthought.

---

## 2. Who it is for

Agencies and studios managing WordPress sites for their own clients, with a portfolio shaped like
a long tail: a handful of high-value sites and many small ones. Freelancers with a few sites are
the entry point and the free tier exists for them, because a freelancer with three sites today is
an agency with forty in three years.

Not individual site owners. Not developers managing their own single application — that is
Forge's customer, and Forge is better at it.

---

## 3. Infrastructure model

Containerised sites on customer-supplied cloud VPS instances ([ADR-040](DECISIONS.md)). Not
elastic cloud, not Kubernetes, not per-request compute.

Bring-your-own-server settles most of this on its own: you cannot ask a stranger to supply a
Kubernetes cluster, only a plain Linux box with root. But the reasoning is worth keeping, because
"pay only for what the sites use" is a recurring and reasonable-sounding instinct.

**Outgrowing a server is no longer the problem it was.** On Hetzner Cloud, DigitalOcean, Vultr
and Linode, resizing CPU and RAM is an API call plus one reboot. Driven from the control plane, "this
server is too small" becomes a button, not a migration. Disk growth is generally irreversible, so
CPU/RAM resize stays reversible while disk resize does not — verify per provider before building
against it.

**WordPress is a poor fit for elastic compute.** It writes to its own filesystem (plugin
installs, uploads, disk caches), so multiple replicas need shared writable storage. Every site
needs MySQL, and an elastic database per site costs more than an entire VPS. Scale-to-zero puts
cold starts on precisely the low-traffic sites that make density work. PHP-FPM is a persistent
process pool, not per-request compute.

**The economics invert the only advantage we have.** Elastic compute runs roughly 3–5× VPS
pricing per unit of sustained capacity, and an agency's long tail is low but _constant_ load — the
worst case for elastic billing. Twenty-five sites on one ~€50 box is the entire argument against
paying a per-site host €700+. Going elastic lands back at the per-site host's price point, because
that is what the model costs.

### What replaces elasticity

1. **Headroom visibility per server** — CPU, RAM, disk and PHP workers, with per-site
   attribution. Also the answer to "whose fault is a slow site" on infrastructure we do not own.
2. **Vertical resize** through the provider API, as a control-plane action.
3. **Moving a site between servers** as a first-class operation. The data model already allows
   it: [ADR-016](DECISIONS.md) makes sites a top-level area listable across servers, with `Server`
   a peer rather than a mandatory parent.
4. **Multi-server organizations from the start.** Sixty sites means three boxes, and placing a
   site on the right one has to be trivial.

### Density obliges isolation

Putting twenty-five sites on one box means one compromised WordPress install sits next to
twenty-four others. Per-site containers are what make that defensible, and under the rule in
[SECURITY.md](SECURITY.md) §0 the isolation is not optional: separate unix user per site, per-site
PHP-FPM pool, per-site database user, no cross-readable webroots. See [SECURITY.md](SECURITY.md)
§5.

---

## 4. Pricing

### The dimension

**Billable sites.** One meter, and the reasoning behind it is a rule worth stating on its own:

> **Bill for what we provide. Never for what the customer already bought.**

A per-site host can meter CPU and bandwidth because it bears that cost. Hestri bears none of it —
the customer pays their provider directly. Metering their own compute back to them is
double-dipping and will be read that way. What Hestri provides is the management of a site, so
that is the unit.

It happens to be the right unit commercially too: per-site retainers are how agency hosting
revenue already works. Price in the customer's own unit of account and the cost becomes a line
item they pass through, rather than an overhead they resent.

**Servers are free and unlimited.** They cost us nothing, and charging for them would fight
density — the product's central advantage. This is also where the category gets it wrong: Forge,
Ploi, SpinupWP and GridPane all price per server, which means an agency growing from ten sites to
five hundred on the same three boxes pays the same forever. Those are decent businesses and they
all stay small.

Team members, clients, staging environments and development copies are also free and unlimited.

### No feature gating

**Every account has every capability, at every volume** ([ADR-041](DECISIONS.md)). There is no
comparison table, because there is nothing to compare. White-labelling, staging, backups, the
audit log, roles — a three-site freelancer gets what a five-hundred-site agency gets.

The distinction that keeps this honest:

- **Gating a capability** is withholding something that costs us nothing, to manufacture an
  upgrade. We do not do it.
- **Metering consumption** is passing on something that costs us per unit. That is legitimate, and
  it must be visible and predictable.

Today the only candidate for a second meter is backup storage, and it may not be needed at all —
see [Q14](OPEN_QUESTIONS.md).

### The curve

No plans, no tiers, no names. One price list with declining marginal bands, applied like tax
brackets so that there is never a cliff:

| Band         | Price per site / month |
| ------------ | ---------------------- |
| Sites 1–3    | free                   |
| Sites 4–25   | €4.00                  |
| Sites 26–100 | €2.50                  |
| Sites 101+   | €1.50                  |

Worked examples:

| Sites | Monthly | Effective per site |
| ----- | ------- | ------------------ |
| 3     | €0      | —                  |
| 10    | €28     | €2.80              |
| 25    | €88     | €3.52              |
| 40    | €125.50 | €3.14              |
| 100   | €275.50 | €2.76              |
| 250   | €500.50 | €2.00              |
| 500   | €875.50 | €1.75              |

Adding one site never costs more than the band rate. Growth is rewarded rather than punished. The
effective rate is not perfectly monotonic — the three free sites make very small accounts cheaper
per site than mid-sized ones — and that is deliberate: the alternative is a cliff at site four.

**Sanity check.** An agency charging its client €40/month to look after a brochure site gives up
€2.50–4.00 of it. Around 8%, defensible as the cost of the tool that makes the service deliverable.
Forty sites yields €125/month from one agency, against a per-server competitor's flat ~€39 and a
per-site host's €1,000+. Everyone in that trade is better off except the per-site host.

**These numbers are a starting point and are deliberately low.** Willingness to pay is unknowable
before roughly ten paying customers. Raising prices later while grandfathering early accounts is
cheap goodwill; the reverse is not. What matters now is the dimension and the shape.

Annual prepayment gets two months free — it helps working capital and matches the annual contracts
agencies already sign with their own clients.

### The free tier is the distribution channel

Three sites, unlimited servers, every feature, free forever. Marginal cost to us is near zero,
which is something a per-site host structurally cannot match. For a product sold to strangers by
an unknown founder, a zero-risk on-ramp does more than any marketing that could be bought — and
it pairs with the bring-your-own-server argument into a pitch that is hard to refuse: your
servers, your data, free to start, cancel any time.

---

## 5. What counts as a billable site

Per-site pricing lives or dies on this definition, and it is the largest source of support
argument in every per-site model. Deciding it late means deciding it against a customer.

**Billable:** a site in a production state with a live domain attached.

**Not billable, and never counted:**

- Staging and development copies, however many.
- A site in a suspended state — an agency suspending a site for a non-paying client should not
  keep paying for it. This is also the reason to build a real suspend action rather than leaving
  people to delete and reinstall.
- A site being provisioned, until it reaches a production state.
- Sites on any server that is unreachable through no fault of the customer.

Consequences for the data model are in [§7](#7-what-this-obliges-us-to-build).

---

## 6. Known risks

**The pricing is copyable in an afternoon.** It is genuinely differentiating and it is not a moat.
What protects it is that incumbents cannot follow without cannibalising existing revenue — a
per-server competitor moving to per-site pricing has to explain a rise to every current customer.
The durable advantage is product depth, not the price list.

**The very long tail may still resist.** An agency carrying two hundred near-dormant sites at €15
retainers pays €500/month here, against per-site revenue of €3,000. Defensible, but it will be
argued. A cheaper "lite" class — updates, monitoring and weekly backups, no staging — is the
answer if it becomes a real objection. **Not built, and not planned**: adding a second site class
before anyone has asked for it would complicate the billable-site definition that §5 depends on.

**Overage needs to be predictable.** Agencies bill fixed retainers and cannot pass on surprises.
Spend alerts, and an optional hard cap that refuses new sites rather than silently charging, are
part of shipping this — not a later refinement.

**Client-facing access is not decided.** "Every account gets every capability" cannot promise a
client login, because [ADR-017](DECISIONS.md) deliberately gave `Client` no login of its own, and a
client-facing principal sits outside the membership model entirely. See
[Q15](OPEN_QUESTIONS.md). Until that is answered, client access is not part of the offer.

**Billing the agency's own clients is out of scope.** Invoicing, ticketing and client billing are
attractive and were explicitly deferred by [ADR-017](DECISIONS.md). They stay deferred. Hestri
bills the agency; what the agency bills its clients is the agency's business, and building an
invoicing product is a way to ship neither.

---

## 7. What this obliges us to build

Nothing here changes the build order in [MVP_PLAN.md](MVP_PLAN.md): `Server`, then `Site`, then
[Q2](OPEN_QUESTIONS.md). There is no billing domain in the near-term plan. What this document does
is constrain the two models that come next.

**`Server`** carries a provenance field recording who owns and pays for the machine
([ADR-039](DECISIONS.md)). Nothing downstream may branch on its value — not the agent, not
provisioning, not `Site`. If that line holds, a fully managed tier later is a provisioner plus
billing, not a migration.

**`Site`** needs its lifecycle states unambiguous and auditable from the first migration, because
they become the basis of an invoice: production, staging, provisioning and suspended have to be
distinguishable in a query with no interpretation. Transitions between them are financially
motivated, so each is permission-gated and written to the audit log.

**Deliberately not built yet:** metering, plans, subscriptions, invoicing, spend caps and any
payment integration. The definitions above have to exist in the schema; the billing that reads them
does not, and will not until there is something to bill for.
