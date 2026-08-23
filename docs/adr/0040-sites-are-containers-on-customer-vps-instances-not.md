# ADR-040 — Sites are containers on customer VPS instances, not elastic cloud

**2026-08-22** · **Status**: Accepted. Follows from
[ADR-039](0039-hestri-sells-a-control-plane-never-infrastructure.md).

**Decision** — Sites run as per-site isolated containers on ordinary cloud VPS instances supplied
by the customer. The platform does not orchestrate elastic compute, does not run Kubernetes, and
does not meter per-request usage. Capacity changes are handled by three control-plane actions
instead: showing per-server headroom with per-site attribution, vertical resize through the
provider API, and moving a site between servers.

**Alternatives** — A cloud-native model where sites autoscale and the customer pays only for what
they consume, so that nobody outgrows a server.

**Why** — [ADR-039](0039-hestri-sells-a-control-plane-never-infrastructure.md) largely settles
it: you cannot ask a stranger to bring their own Kubernetes cluster, only a Linux box with root, so
elastic orchestration and bring-your-own-server are incompatible.

The rest is that the problem it solves has largely gone away and the cure is expensive.
Vertical resize on every major VPS provider is now an API call plus a reboot, so "outgrowing a
server" is a button rather than a migration. WordPress is a poor fit for elastic compute in four
independent ways — it writes to its own filesystem, every site needs a database, scale-to-zero
puts cold starts on the lowest-traffic sites, and PHP-FPM is a persistent pool rather than
per-request compute. And elastic compute costs roughly 3–5× VPS pricing per unit of sustained
capacity, against a long tail of low-but-constant load: the worst possible case for it. Twenty-five
sites on one ~€50 box is the entire argument against per-site hosts, and elasticity spends it.

Operationally, orchestration is a full-time job. Choosing it pre-MVP, solo, with `Server` unbuilt,
means shipping a year later.

**Consequences**

- Per-site isolation on a shared box is a hard requirement, not a refinement. Density means one
  compromised WordPress install sits beside every other on the machine, so: separate unix user per
  site, per-site PHP-FPM pool, per-site database user, no cross-readable webroots. Under
  [SECURITY.md](../SECURITY.md) §0 this is not tradeable for convenience.
- `Site` must not be welded to one `Server`. Moving a site between servers is a first-class
  operation, which the navigation model in
  [ADR-016](0016-top-navigation-for-areas-contextual-navigation-for.md) already
  anticipated by making sites listable across servers.
- Multi-server organizations are the normal case from the start, not a scaling feature.
- Per-server headroom reporting is on the MVP path, because on infrastructure we do not own it is
  also the answer to who is responsible for a slow site.
- Reconsider only if the fully managed tier of
  [ADR-039](0039-hestri-sells-a-control-plane-never-infrastructure.md) is ever built, since that
  is the case where we own the capacity pool and absorb the spikes.
