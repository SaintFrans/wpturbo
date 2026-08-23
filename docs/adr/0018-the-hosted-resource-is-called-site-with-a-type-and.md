# ADR-018 — The hosted resource is called `Site`, with a `type` and optional child services

**2026-08-17** · **Status**: Accepted

**Decision** — The core hosted entity is named `Site`, not `Application`, resolving
[Q10](../OPEN_QUESTIONS.md). A Site is anchored to a primary domain — the unit agencies already
group by. `Site` carries a `type` enum (`wordpress` at launch; `static`, `docker_compose`,
etc. later). Types that need more than one running process get child `SiteService` rows
(e.g. `web`, `worker`, `redis` — one per container/process); a WordPress site has one
implicit service and never touches that table.

**Alternatives** — `Application` with a `type` (the placeholder recommendation Q10 had
recorded); a flat `Site` with no `type` column, forcing a rename once a non-WordPress type
ships.

**Why** — "Site" matches the product's own language, the pitch, and every named competitor
(Forge, FlyWP, Ploi) — "Application" would fight that vocabulary for no gain, since a `type`
column gets the same extensibility either way. The multi-container question is answered by
separating _domain grouping_ from _process composition_: a Site stays one row per
domain-facing thing regardless of how many containers back it, so a docker-compose app is
still addressable and billable as a single Site while its internals live as child
`SiteService` rows. This avoids two failure modes: forcing every WordPress site to carry
unused multi-service structure, and fragmenting a multi-container app across several Site
rows that don't match how the customer thinks about "the app".

**Consequences**

- `sites` table, not `applications`. ADR-016's top-level area, named "Applications" there,
  is renamed to "Sites" to match — the one existing decision this reopens.
- `sites.type` is required at creation and drives the creation flow, config screen, and
  whether any `SiteService` rows exist.
- `site_services` is populated only for types that declare more than one process; simple
  types (`wordpress`, `static`) have zero rows and are queried as a single unit.
- Backups, domains, deployments, certificates and metrics carry a foreign key to `Site`, not
  to `SiteService` — the customer-facing and billable unit is the Site.
- `Client` (ADR-017) attaches at the Site level: sites are grouped by domain and, optionally,
  tagged to a client.
