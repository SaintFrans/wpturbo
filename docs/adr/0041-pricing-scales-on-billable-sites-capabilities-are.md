# ADR-041 — Pricing scales on billable sites; capabilities are never gated

**2026-08-22** · **Status**: Accepted. Depends on
[ADR-039](0039-hestri-sells-a-control-plane-never-infrastructure.md).

**Decision** — Hestri is priced on one dimension: the number of **billable sites** an organization
manages, in declining marginal bands with no plan tiers and no cliffs. Servers, team members,
clients, staging environments and development copies are free and unlimited. **Every account has
every capability at every volume** — no feature is withheld to manufacture an upgrade. The only
legitimate second charge is a _consumption_ meter for something that costs us money per unit; the
one candidate, backup storage, is unresolved ([Q14](../OPEN_QUESTIONS.md)) and may prove unnecessary.

A site is billable when it is in a production state with a live domain attached. Staging copies,
suspended sites and sites still provisioning are never counted. Full definition and the price
bands are in [BUSINESS_MODEL.md](../BUSINESS_MODEL.md) §4–5.

**Alternatives** — Per-server pricing, which the whole category uses (Forge, Ploi, SpinupWP,
GridPane) and which stops scaling the moment an agency adds sites to servers it already has.
Per-site plans with hard site caps, the per-site-host shape, which puts a cliff at every cap and
makes site _n+1_ cost a whole upgrade. Tiered plans with white-labelling and client access gated
to the top tier — sketched first and rejected on the grounds below. Usage-based pricing on CPU, RAM
or bandwidth, rejected because on bring-your-own-server the customer has already paid their own
provider for exactly that, and billing it again is double-dipping.

**Why** — Sites are both the unit that scales with the customer's business and the unit agencies
already bill their own clients in, so the cost becomes a line item they pass through rather than an
overhead they resent. Servers are free because they cost us nothing and charging for them would
penalise density, which is the product's central economic advantage over per-site hosts.

Gating capabilities was rejected for a reason worth keeping: withholding something that costs us
nothing, in order to sell it back, is the practice this product is positioned against, and the
banded curve already makes large agencies pay proportionately more without it. A five-hundred-site
agency pays roughly seven times what a forty-site agency pays. Volume does the work that feature
gates would otherwise do, and the pricing page needs no comparison table.

The cost we accept: no upsell lever. Every euro of revenue growth has to come from site count,
which means the bands must be right rather than merely plausible, and it means a large customer
using every feature at a low volume is underpriced by design. We would rather be underpriced there
than run an upgrade-prompt product.

**Consequences**

- `Site` must make its lifecycle states — production, staging, provisioning, suspended —
  unambiguous and queryable from the first migration, with no interpretation needed. They are the
  basis of an invoice.
- Those transitions are financially motivated, so each is permission-gated
  ([ADR-005](0005-permissions-are-an-enum-decoupled-from-roles.md)) and written to the audit log
  ([ADR-032](0032-an-append-only-audit-log-built-now-while-there-are.md)).
- A real **suspend** action is required, not delete-and-reinstall, because suspension is the
  mechanism by which a site stops being billable.
- No second site class (a cheaper "lite" tier) may be introduced without revisiting the
  billable-site definition, which is why one is deliberately not planned.
- Nothing about metering, plans, subscriptions, invoicing or payment is in the near-term build. The
  definitions live in the schema; the billing that reads them does not yet exist.
- Client-facing access cannot be promised as part of "every capability" while
  [ADR-017](0017-clients-are-a-grouping-entity-inside-a-team-not-a.md) gives
  `Client` no login. See [Q15](../OPEN_QUESTIONS.md).
