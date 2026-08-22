# Hestri

A control plane for WordPress hosting, for agencies that manage sites on servers they own.

> **Status: early.** The account, authentication and organization layer is built and tested, and
> so is `Client`, the first resource domain. The rest of the hosting domain — servers, sites, the
> agent, provisioning, monitoring — does not exist in the codebase yet. See
> [Status](#status) for the honest breakdown.

## What this is

Hestri is the control plane through which WordPress sites are managed at scale. Customers
bring their own servers; the platform enrols them, provisions sites onto them, keeps
WordPress core, plugins and themes up to date, takes backups and monitors health. The
hosting bill goes to the customer's own provider, on their own account.

**We sell software, never infrastructure** ([ADR-039](docs/DECISIONS.md)). That is the
product, not the first of two tiers: a fully managed tier on our own hardware remains
conceivable but is explicitly not a plan, and its only claim on the present is that
`Server` will record who owns the machine while nothing downstream branches on it. Sites
run as per-site isolated containers on ordinary cloud VPS instances, not elastic compute
([ADR-040](docs/DECISIONS.md)).

Pricing scales on the number of production sites an organization manages, in declining
bands, with no feature ever withheld to sell an upgrade ([ADR-041](docs/DECISIONS.md)).
See [docs/BUSINESS_MODEL.md](docs/BUSINESS_MODEL.md).

None of the hosting domain is implemented yet. Today the application is the account and
tenancy foundation it will be built on.

## Who it is for

Agencies and studios that manage WordPress sites on behalf of their own clients — not
individual site owners. That distinction drives the data model: the platform assumes an
organisation with multiple people, multiple clients, and many sites, rather than one user
with one site.

## Architecture at a glance

| Component              | Technology                                                            | Status                                              |
| ---------------------- | --------------------------------------------------------------------- | --------------------------------------------------- |
| Control plane          | Laravel 13, Inertia v3, React 19, TypeScript, Tailwind 4, Wayfinder   | **Built** (auth + teams only)                       |
| Tenancy                | URL-prefixed team scope (`/{current_team}/…`) + membership middleware | **Built**, applied to one route                     |
| Server agent           | Go binary on customer servers, outbound-only connection               | **Not started** — no code exists                    |
| Transport              | NATS JetStream                                                        | **Not started** — no code, no config, no dependency |
| Provisioning / updates | —                                                                     | **Not started**                                     |
| Monitoring             | —                                                                     | **Not started**                                     |
| Billing                | Per-site bands ([ADR-041](docs/DECISIONS.md))                         | **Not started** — decided, no code                  |

The agent design is deliberately outbound-only: the customer's server dials out to the
control plane, so no inbound port has to be opened on customer infrastructure. This is an
intended constraint, not an implemented one. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full picture and
[docs/SECURITY.md](docs/SECURITY.md) for the threat model it follows from.

## Status

### Working

- **Authentication** — registration, login, password reset, email verification, two-factor
  authentication (TOTP + recovery codes) and passkeys, all via Laravel Fortify.
- **Organizations** — creation, renaming, deletion, leaving, and switching between them. Every
  user gets one at registration, named after them; there is no separate "personal" kind, and
  nobody can be left without one (ADR-025).
- **Roles and permissions** — Owner, Admin and Member, backed by a permission enum and a
  policy rather than by string comparisons.
- **Clients** — the customers an agency works for, as a tenant-owned grouping entity: an
  overview table, create, edit and delete, keyed in the URL by a short random id. Not a login and
  not a tenancy level. Nothing hangs off a client yet, because `Site` does not exist.
- **Invitations** — email invitations with a 3-day expiry, accept and decline flows, and a
  daily scheduled job that prunes expired invitations.
- **Settings** — profile, security and appearance.
- **Tooling** — Pest test suite (157 tests), Pint, Larastan, and the Vite+ toolchain (Oxlint,
  Oxfmt) with a pre-commit hook, all wired into a GitHub Actions workflow.

### In development

Nothing. There is no partially-built hosting feature in the tree.

### Open

`Server`, `Site` and the agent. `Server` and `Site` now carry commercial constraints as well as
technical ones — a provenance field on `Server`, and unambiguous lifecycle states on `Site`, because
those states become the basis of an invoice ([ADR-039](docs/DECISIONS.md),
[ADR-041](docs/DECISIONS.md)). One question blocks the agent and is deliberately unanswered:
how a server proves which tenant it belongs to, how agent credentials are rotated and revoked,
and what isolates one tenant's NATS subjects from another's. That, and everything else undecided,
is tracked in [docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md);
[docs/MVP_PLAN.md](docs/MVP_PLAN.md) has the order the rest is being built in.

## Getting started

The frontend toolchain is [Vite+](https://viteplus.dev), driven by the global `vp` CLI —
install that first, then:

```bash
composer setup
```

That installs dependencies, copies `.env`, generates a key, migrates, and builds the
frontend. Then:

```bash
composer dev
```

Run everything CI runs — Oxlint, Oxfmt, `tsc`, Pint, PHPStan and Pest:

```bash
composer ci:check
```

Run just the tests:

```bash
php artisan test --compact
```

`vp check --fix` formats, lints and type checks the frontend on its own, and a pre-commit
hook runs it over staged files.

## Documentation

| Document                                         | What it covers                                                                    |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| [CLAUDE.md](CLAUDE.md)                           | Project vision, architecture principles, and the working method for every change  |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)     | System overview: control plane, agent, data flow, tenancy model                   |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md)         | Core entities, their relationships, and why they are shaped that way              |
| [docs/BUSINESS_MODEL.md](docs/BUSINESS_MODEL.md) | What we sell, to whom, and how it is priced — and what that obliges in the schema |
| [docs/DECISIONS.md](docs/DECISIONS.md)           | Decision log: what was decided, when, what was rejected, and why                  |
| [docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md) | Unresolved naming and design questions                                            |
| [docs/SECURITY.md](docs/SECURITY.md)             | Threat model, security assumptions, and the security-wins rule                    |

**These documents are part of the definition of done.** A change is not finished until the
documentation that describes it is correct again. Stale architecture documentation is worse
than none, because it invites trust it has not earned.
