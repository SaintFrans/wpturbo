# Hestri

A control plane for managed and semi-managed WordPress hosting.

> **Status: early.** The account, authentication and team layer is built and tested. The
> hosting domain — servers, sites, the agent, provisioning, monitoring — does not exist in
> the codebase yet. See [Status](#status) for the honest breakdown.

## What this is

Hestri is the control plane through which WordPress sites are managed at scale. The
intended model has two tiers:

1. **Semi-managed (first target).** Customers bring their own servers. The platform
   connects to them, keeps WordPress core, plugins and themes up to date, installs new
   sites, and monitors health.
2. **Fully managed (later).** The same control plane on top of infrastructure we run
   ourselves, so the customer does not supply a server at all.

Neither tier is implemented yet. Today the application is the account and tenancy
foundation those tiers will be built on.

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
| Billing                | —                                                                     | **Not started**                                     |

The agent design is deliberately outbound-only: the customer's server dials out to the
control plane, so no inbound port has to be opened on customer infrastructure. This is an
intended constraint, not an implemented one. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full picture and
[docs/SECURITY.md](docs/SECURITY.md) for the threat model it follows from.

## Status

### Working

- **Authentication** — registration, login, password reset, email verification, two-factor
  authentication (TOTP + recovery codes) and passkeys, all via Laravel Fortify.
- **Teams** — creation, renaming, deletion, leaving, and switching between teams. Every
  user gets a personal team on registration.
- **Roles and permissions** — Owner, Admin and Member, backed by a permission enum and a
  policy rather than by string comparisons.
- **Invitations** — email invitations with a 3-day expiry, accept and decline flows, and a
  daily scheduled job that prunes expired invitations.
- **Settings** — profile, security and appearance.
- **Tooling** — Pest test suite (93 tests), Pint, Larastan, and the Vite+ toolchain (Oxlint,
  Oxfmt) with a pre-commit hook, all wired into a GitHub Actions workflow.

### In development

Nothing. There is no partially-built hosting feature in the tree.

### Open

The entire hosting domain, and one naming question that blocks part of the data model:
the existing "Teams" feature may be the wrong name for what it needs to become. This is
tracked, along with everything else undecided, in
[docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md).

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

| Document                                         | What it covers                                                                   |
| ------------------------------------------------ | -------------------------------------------------------------------------------- |
| [CLAUDE.md](CLAUDE.md)                           | Project vision, architecture principles, and the working method for every change |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)     | System overview: control plane, agent, data flow, tenancy model                  |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md)         | Core entities, their relationships, and why they are shaped that way             |
| [docs/DECISIONS.md](docs/DECISIONS.md)           | Decision log: what was decided, when, what was rejected, and why                 |
| [docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md) | Unresolved naming and design questions                                           |
| [docs/SECURITY.md](docs/SECURITY.md)             | Threat model, security assumptions, and the security-wins rule                   |

**These documents are part of the definition of done.** A change is not finished until the
documentation that describes it is correct again. Stale architecture documentation is worse
than none, because it invites trust it has not earned.
