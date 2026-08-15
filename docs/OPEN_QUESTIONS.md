# Open questions

Unresolved naming and design questions. These are **not** a backlog of work to be picked
up — they are decisions that have not been made, recorded so that nobody quietly makes them
by accident while building something adjacent.

**If a task touches one of these, stop and ask rather than assuming.** That rule is in
`CLAUDE.md`. When a question is answered, move it to
[DECISIONS.md](DECISIONS.md) as an ADR and delete it here.

_Last reviewed: 2026-08-15._

---

## Q1 — "Teams" is probably the wrong name for what this needs to become

**Status:** Open. Blocks parts of the data model. **Do not rename or refactor anything
until this is decided.**

### What it does today

`Team` is the tenant. It owns memberships (Owner / Admin / Member), invitations, and the
URL prefix that scopes every tenant route. Every user gets a personal team at registration.
It is the only tenancy concept that exists, and it works — see
[DATA_MODEL.md](DATA_MODEL.md).

### Why the name may be wrong

The platform's users are agencies managing WordPress sites **for their own clients**. That
implies at least two distinct concepts that "Team" currently collapses into one:

1. **The agency** — the paying organisation, the billing entity, the group of colleagues who
   log in.
2. **The agency's client** — the end customer whose sites and servers are being managed, who
   may or may not ever log in, and who is the unit an agency wants to group, report on and
   possibly invoice against.

"Team" reads as a group of colleagues. It does not carry the client relationship at all. If
those turn out to be two entities, the current model is one level short, and the word
"Team" will be actively misleading for whichever of the two it ends up naming.

Candidate names floated but not chosen: agency accounts, client organisations, workspaces,
organisations, accounts. **No preference is recorded, and none should be invented.**

### What has to be decided

1. **Is this one level or two?** Does an agency need to group servers and sites by client
   inside its tenant, or is one tenant per client acceptable (an agency simply has several
   tenants)?
2. **If two levels** — where does the boundary sit? Which level owns servers, sites,
   billing, and user membership? Does a client-level user ever log in, and if so with what
   visibility?
3. **What is it called?** Only answerable after 1 and 2.
4. **What happens to personal teams?** They exist to guarantee every user has a tenant
   (ADR-004). If the concept becomes "agency", a personal agency is strange.

### Why it matters now

Servers and Sites need a `team_id` — or whatever the tenant column becomes. Building them
against the current single-level model and discovering a second level is needed means
migrating every tenant-owned table, every policy, and every scoped query. The cost of
deciding this before the hosting domain is built is a conversation; the cost of deciding it
afterwards is a migration touching everything.

**Relevant when:** adding any tenant-owned entity, touching billing, or designing how
servers and sites are grouped.

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

## Q3 — Should `app/` move to domain folders?

**Status:** Open. Low urgency, rising as the hosting domain lands.

`app/` is organised by Laravel type (`Http/Controllers/Teams`, `Actions/Teams`,
`Models`, `Policies`, …). The team domain is already spread across seven directories. Add
Servers, Sites, Agents and Monitoring and the type-first layout means every feature is
scattered across the same seven, with no folder that represents a domain.

The alternative — `app/Teams/`, `app/Servers/`, `app/Sites/` — keeps each domain together
and gives scoped `CLAUDE.md` files somewhere to live, but departs from the Laravel default
that the Boost guidelines and the rest of the tooling assume.

Deciding this **before** the first hosting domain is added is much cheaper than after.

**Relevant when:** creating the first Server or Site model, or adding a third domain.

---

## Q4 — Two route-scoping conventions are in use

**Status:** Open. Small, but it sets a precedent.

Two shapes coexist:

| Shape                    | Example                | Auto-switches team |
| ------------------------ | ---------------------- | ------------------ |
| `/{current_team}/…`      | `/acme/dashboard`      | Yes                |
| `/settings/teams/{team}` | `/settings/teams/acme` | No                 |

Only the dashboard uses the prefixed form today. Before servers and sites are added, decide
whether tenant settings pages also belong under the tenant prefix, or whether
`/settings/…` stays deliberately outside it as a user-level rather than tenant-level area.
Whichever is chosen, the reasoning should be written down, because every future route will
copy the pattern that happens to be nearest.

**Relevant when:** adding any tenant-scoped route.

---

## Q5 — Soft-delete semantics for teams are inconsistent

**Status:** Open. A latent bug, not a live one.

`Team` uses `SoftDeletes`, but `TeamController::destroy` hard-deletes memberships and
invitations before soft-deleting the team. A restored team therefore comes back with no
members and no owner — unreachable and unrecoverable through the UI.

Three coherent options:

1. Make the delete a hard delete, and treat the soft delete as vestigial (the slug is
   already retired independently — ADR-006).
2. Soft-delete the memberships alongside the team, so restore is meaningful.
3. Keep the current behaviour but define restore explicitly, e.g. restoring reinstates the
   original owner only.

The question behind it: **is team deletion meant to be recoverable at all**, and if so, by
whom and within what window? That is a product decision, not a technical one — and it will
matter much more once a team owns servers and live customer sites.

**Relevant when:** touching team deletion, or building anything that a deleted team would
own.

---

## Q6 — Nothing guarantees exactly one Owner per team

**Status:** Open.

`Team::owner()` returns the _first_ membership with role `owner`. The database enforces one
membership per user per team, but nothing enforces the number of owners. Zero owners and
multiple owners are both representable.

Zero owners is reachable in practice: `TeamPolicy::leave` blocks the owner from leaving, and
`TeamMemberController::destroy` blocks removing the owner — but `TeamRole::assignable()`
excludes Owner, so **ownership can never be transferred**. An owner who wants to hand over
their team has no route to do so, and an abandoned team has no path to a new owner.

To decide: is ownership single or shared? And what is the ownership-transfer flow? Both
answers shape the permission model, so they belong in an ADR before the first tenant-owned
resource makes an ownerless team a real operational problem.

**Relevant when:** touching roles, ownership, team deletion, or building an offboarding flow.

---

## Q7 — The project is not under version control

**Status:** Open. Infrastructure, not architecture, but it undermines this documentation.

There is no `.git` directory. No history, no branches, no ability to review a diff or roll
back a change.

This matters directly for the working method in `CLAUDE.md`: a decision log substitutes for
history that git would provide for free, and "update the docs in the same change as the
code" has no _change_ to be part of. The CI workflow in `.github/workflows/tests.yml`
triggers on push and pull request to `main` and cannot run at all.

Not something to fix unilaterally — the repository may live elsewhere, or this may be a
working copy. Worth confirming.

**Relevant when:** immediately, if this is the canonical working tree.

---

## Q8 — Outbound email is unqueued and unthrottled

**Status:** Open. Small, real.

Team invitation emails are sent synchronously inside the HTTP request
(`Notification::route('mail', …)` in `TeamInvitationController::store`), and no rate limiter
applies to that endpoint — unlike login, 2FA and passkeys, which all have one.

Two consequences: a slow or failing mail provider directly slows or fails the invite
request, and any Owner or Admin can trigger unbounded outbound email, which is both an
abuse vector and a deliverability risk for the platform's sending domain.

`QUEUE_CONNECTION=database` is already configured and nothing in the application queues
anything, so introducing a queued notification also means deciding how workers are run in
each environment. That is the actual decision here, and it will need answering anyway
before agent work — provisioning and updates cannot be synchronous.

**Relevant when:** adding any outbound side effect, or starting agent work.

---

## Q9 — There is no frontend test coverage

**Status:** Open. Raised by the React Aria migration (ADR-015).

The 93 Pest tests are all backend. Nothing exercises a rendered page, so a primitive can
break — a dialog that no longer opens, a menu item that no longer fires — while lint, `tsc`,
the build and the whole test suite stay green. The React Aria migration rewrote 35 files and
was verified by type checking plus a manual look at the unauthenticated pages. That is not
the same as knowing the 2FA setup modal still works.

This matters more than usual here because the components carrying the most risk are the ones
that can lock a user out of their account: the two-factor setup and challenge, passkey
registration, and password confirmation.

`pestphp/pest-plugin-browser` would cover this — `visit()` with `actingAs()`, asserting no
JavaScript errors and that dialogs actually open. It pulls in Playwright and browser
binaries, which is a real dependency decision rather than a detail, so it needs a yes before
anyone adds it.

**Relevant when:** touching any UI primitive, or before the next dependency-level frontend
change.

---

## Q10 — Is the hosted thing a "Site" or a typed "Application"?

**Status:** Open. **Blocks the first hosting migration.** Decide before any table is created.

A server should be able to run more than WordPress — other application types are expected
later. That makes the naming of the core child entity a modelling decision, not a label.

### The two options

1. **`Site`** — matches how agencies speak, matches the product pitch, matches what
   competitors call it (FlyWP, Forge). Wrong the moment a server runs something that is not
   a website, and the word cannot stretch to cover a queue worker or a database service.
2. **`Application` with a `type`** (`wordpress`, `laravel`, `static`, …) — neutral, extends
   without renaming, and lets type-specific behaviour hang off the type. Slightly more
   abstract than the language customers use.

The UI label and the model name need not match: the interface can say "Sites" while
WordPress is the only type that ships.

### Why it has to be decided first

Every later table — backups, domains, deployments, certificates, metrics — carries a foreign
key to this entity. Renaming it after those exist means a migration touching every
tenant-owned table, every policy and every scoped query, on live customer data. Choosing the
name before the first migration costs one conversation.

### What else the answer decides

- Whether the top-level area is "Sites" or "Applications" (ADR-016 assumes the latter).
- Whether type-specific attributes live in per-type tables, a JSON column, or single-table
  inheritance.
- Whether "install WordPress" is a creation flow or one branch of a generic install flow.

**Recommendation on file:** model it as `Application` with a type, label it "Sites" in the UI
until a second type exists. This keeps the customer-facing language familiar while leaving
the schema free to grow. **Not yet decided.**

**Relevant when:** creating the first Server or Application model — that is, the next piece
of hosting work.
