# Context

The glossary for Hestri. One entry per term that carries weight in this codebase: what it
means here, and — where a word has drifted or is doing more than one job — what it does
**not** mean.

Use these words in issue titles, test names, commit messages, ADRs and UI copy. If you need
a concept that isn't here, that is a signal: either you are inventing language the project
doesn't use (reconsider), or there is a real gap (add it, in the same change as the code).

Depth lives elsewhere: [docs/DATA_MODEL.md](docs/DATA_MODEL.md) for columns and constraints,
[docs/adr/](docs/adr/) for why. This file is only the vocabulary.

## The shape of the thing

**Hestri** — a **control plane** for WordPress hosting, sold to agencies. Not a host.

**Control plane** — the software that manages servers. It is what we sell. The servers, the
capacity and the uptime liability are the customer's, always
([ADR-039](docs/adr/0039-hestri-sells-a-control-plane-never-infrastructure.md)). "Hosting
platform" is the wrong phrase for what we are; we manage hosting we do not own.

**Agent** — the Go process on each customer server that connects outbound over NATS
JetStream and does the actual work. Not built. Never say "agent" in this repo meaning an AI
coding assistant; that is a **skill** or a **subagent**.

## Tenancy and people

**Organization** — the tenancy boundary. Every resource has exactly one owning organization,
and cross-tenant visibility is the platform's core promise not to have. Typically an agency;
sometimes one freelancer.

> **`Team` is dead.** It was renamed on 2026-08-17
> ([ADR-025](docs/adr/0025-team-becomes-organization-the-personal-team-is-removed.md)) and no
> longer appears anywhere in `app/`, `resources/js/`, `routes/` or `database/` — only in ADR
> filenames and git history, where it is a record, not a usage. If you find yourself writing
> `Team`, `team_id`, `current_team` or `personal team`, you are reading history and copying it
> forward. There is also **no personal organization**; `is_personal` was removed in the same
> change.

**Membership** — a user's place in an organization, carrying exactly one role. A user may
belong to several organizations; that is a first-class scenario (own practice plus agencies),
not a way to subdivide one company's work.

**Owner / Admin / Member** — the three values of `OrganizationRole`. Names of roles, never
authorisation checks in themselves.

**Permission** — a case of `OrganizationPermission` (`client:create`, `member:remove`, …).
**Authorisation asks for a permission, never a role**
([ADR-005](docs/adr/0005-permissions-are-an-enum-decoupled-from-roles.md)). "Admins can do X"
is a fact about the role→permission map, not something a policy should assert.

**Visibility vs capability** — every member sees everything in their organization
([ADR-037](docs/adr/0037-every-member-sees-everything-in-their-organization.md)). What varies
by role is what you may _do_. There is no per-member or per-client visibility layer, and
adding one is a decision, not an implementation detail.

**Customer** — ambiguous on its own; pick one and say it.

- **Us → the agency** = the **Organization**. It pays us.
- **The agency → the business it works for** = the **Client**. It pays the agency; it has no
  account here.

**Client** — a business an organization works for. An entity _inside_ an organization, not a
tenancy level and not a login: no membership, no password, no access
([ADR-017](docs/adr/0017-clients-are-a-grouping-entity-inside-a-team-not-a.md)). It is a
label that `Site` (and later `Domain`, `Mailbox`) hangs off for grouping, reporting and
future billing. Built; the one piece of the hosting domain that hosts nothing.

## Addressing

**Handle** — the organization's identifier in the URL (`/org/acme-agency/…`). Seeded from
the name once at creation, then independent of it: renaming never changes it, and changing it
is a separate, explicit act that breaks existing links
([ADR-030](docs/adr/0030-the-tenant-url-identifier-is-a-name-seeded-separately.md)). Never
reissued, ever — a reissued handle is a cross-tenant leak triggered by a stale bookmark. Only
for the tenant segment of the URL.

**Public id** — five random characters, the route key for resources addressed _inside_ the
tenant segment ([ADR-038](docs/adr/0038-a-clients-route-key-is-a-short-random-public-id-not-a.md)).
No history table. `Client` uses it; `Site`, `Server` and `Domain` should too.

> **`slug` is dead** as a name for either of these. Say handle or public id — they behave
> differently and the distinction is the point. Sequential integer ids are never route keys.

## The hosting domain (decided, mostly unbuilt)

**Server** — a customer-owned VPS running the agent. Carries a **provenance** field recording
who owns and pays for the machine. **Nothing downstream may branch on that value** — not
`Site`, not provisioning, not the agent. It exists so a managed tier later is a provisioner
plus billing rather than a migration, and it is worthless the moment something reads it
([ADR-039](docs/adr/0039-hestri-sells-a-control-plane-never-infrastructure.md)). Not built;
waits on [Q2](docs/OPEN_QUESTIONS.md).

**Site** — the hosted resource, anchored to a domain, with a required `type` (`wordpress` at
launch) ([ADR-018](docs/adr/0018-the-hosted-resource-is-called-site-with-a-type-and.md)). Say
`Site`, not "website", "install" or "WordPress instance". **A site is never welded to one
server** — it moves, and pricing does not depend on where it runs.

**SiteService** — a child process of a multi-process site type. Single-process types like
`wordpress` have none. Not a synonym for `Site`.

**Isolation** — per-site unix user, PHP-FPM pool and database user, on a shared customer box
([ADR-040](docs/adr/0040-sites-are-containers-on-customer-vps-instances-not.md)). The
economics depend on density; the promise depends on the isolation. When they conflict,
isolation wins.

**Billable site** — a site in a **production** state with a live domain attached. That is the
whole definition, and it is load-bearing: pricing counts these and nothing else
([ADR-041](docs/adr/0041-pricing-scales-on-billable-sites-capabilities-are.md)). Staging and
development copies, suspended sites, sites still provisioning, and sites on a server that is
unreachable through no fault of the customer are **not billable and never counted**.

**Lifecycle state** — `production`, `staging`, `provisioning`, `suspended`. These are
**invoice lines**, not status labels: distinguishable in one scoped query with no
interpretation, permission-gated to change, and written to the audit log. A site quietly moved
out of a billable state is a financial event.

## Working vocabulary

**ADR** — a numbered file in [docs/adr/](docs/adr/), one decision per file, never edited away.
A decision that no longer holds is _superseded_ by a new one.

**Open question** — a numbered entry in [docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md) that
blocks work. If your task touches one, stop and ask. Do not resolve it in passing.

**Audit log** — append-only, `audit_log_entries`. Append-only means append-only: no update
path, no delete path.
