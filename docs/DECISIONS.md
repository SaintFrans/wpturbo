# Decision log

Architecture decisions, newest first. Each entry records what was decided, what was
rejected, and why — the reasoning is the point, since the decision itself is usually
visible in the code.

**Add an entry whenever a change is hard to reverse, sets a precedent for later features,
or has a non-trivial security implication.** Not for routine work.

Format:

```
## ADR-nnn — Title
**Date** · **Status**: Accepted | Superseded by ADR-nnn | Reversed
**Decision** — what we do
**Alternatives** — what we did not do
**Why** — the reasoning, including what we accepted as a cost
**Consequences** — what this obliges or forbids later
```

> **ADR-001 to ADR-010 are reconstructed.** They were inferred by reading the code on
> 2026-08-15, not recorded when the decision was made. The decision and reasoning are
> reconstructions; the original dates are unknown. They are written down so the reasoning
> is not lost and not accidentally reversed. Correct any entry that misstates the original
> intent.

---

## ADR-037 — Every member sees everything in their organization; visibility is not scoped

**2026-08-18** · **Status**: Accepted. Resolves [Q13](OPEN_QUESTIONS.md) (question removed).

**Decision** — Every member of an organization continues to see every `Client`, `Server` and
`Site` it owns. There is no per-member or per-client visibility restriction, now or as a near-term
plan. What varies by role is capability, never visibility: as `Client`, `Server` and `Site` are
built, destructive and sensitive actions on them (`site:delete`, `client:delete`,
`server:delete`, …) become new `OrganizationPermission` cases, mapped per role exactly like
`member:remove` and `organization:delete` are today.

**Alternatives** — Scoping a membership to a subset of clients, the "traceable shape" Q13 left open
if the need ever appeared; a general visibility/sharing grant table, the RunCloud shape
[ADR-019](#adr-019--resources-belong-directly-to-their-team-cross-team-sharing-is-deferred)
already rejected for ownership.

**Why** — The need this would answer — an agency wanting to keep a freelancer or junior off a
sensitive client — has not appeared, and what agencies actually ask for is narrower: stopping the
wrong person from *deleting* a site or a client, not hiding it from their dashboard. That is a
capability question, and the platform already has a mechanism for it
([ADR-005](#adr-005--permissions-are-an-enum-decoupled-from-roles),
[ADR-028](#adr-028--admins-manage-members-below-their-own-role)). Building a visibility layer to
answer a capability need would be exactly the premature abstraction ADR-019 already warned
against, aimed at the wrong problem besides.

**Consequences**

- `Client::query()`, `Server::query()` and `Site::query()` are scoped by `organization_id` alone,
  the same as every other tenant-owned table ([SECURITY.md](SECURITY.md) §5 rule 1). No scope
  helper, no membership indirection.
- New destructive or sensitive actions on these entities are added to `OrganizationPermission` as
  each entity is built, not deferred to a future visibility feature.
- This closes Q13 for good, not provisionally. If a real customer need for restricted visibility
  appears later, that is a new ADR weighing a new, concrete requirement — not a reopening of this
  one.

---

## ADR-036 — Retention: 30 days for deleted organizations, 24 months for audit entries

**2026-08-18** · **Status**: Accepted. Resolves Q14; completes
[ADR-032](#adr-032--an-append-only-audit-log-built-now-while-there-are-five-events) and
[ADR-034](#adr-034--deleting-an-organization-soft-deletes-its-whole-tree-restore-is-manual).

**Decision** — Four retention rules, each with a different reason:

| Data                                                               | Kept          | Then                             |
| ------------------------------------------------------------------ | ------------- | -------------------------------- |
| Soft-deleted organizations, with their memberships and invitations | 30 days       | Hard-deleted by a scheduled task |
| Audit entries                                                      | 24 months     | Deleted                          |
| `organization_handles`                                             | Indefinitely  | Never removed                    |
| Invoices and payment records                                       | Not held here | Stripe's problem                 |

**Alternatives** — Keep everything indefinitely, which is what the code does today; 12 months for
audit entries with the personal fields pseudonymised afterwards, which was the recommendation
before NIS2 turned out to apply.

**Why there is a number at all.** There is no statutory maximum. The GDPR sets a principle rather
than a period — data may be kept only as long as it is necessary for the purpose it was collected
for, and the controller has to determine and justify that themselves. So the obligation is not to
stay under a limit; it is to have an answer. This is that answer.

**30 days for deleted organizations**, because soft-delete is a recovery window and not an
archive. [ADR-034](#adr-034--deleting-an-organization-soft-deletes-its-whole-tree-restore-is-manual)
makes restore an operator procedure; 30 days is longer than anyone takes to notice they deleted
the wrong thing, and short enough to defend as data minimisation. Note what is being kept in the
meantime: the organization's name, its handle history, its memberships, and the email address of
everyone ever invited.

**24 months for audit entries.** Twelve was the first recommendation, on the reasoning that
incidents surface within months. Two years was chosen instead because an incident found late is
exactly the case where a log matters, and because the Cyberbeveiligingswet — which took effect on
15 August 2026 and names managed service providers explicitly — may well apply here. **Whether it
does is unsettled** and is parked (see [SECURITY.md](SECURITY.md) §1): this platform manages
servers its customers own rather than supplying its own, and that distinction may matter.

The period does not depend on the answer. Two years is defensible on its own, and if the
obligation turns out not to apply, nothing here needs revisiting.

**Pseudonymising instead of deleting was rejected.** Under NIS2 the useful question in an incident
is _who_, so stripping the actor is exactly the wrong reduction. Over a 24-month window the
complexity buys little, and a clean delete is easier to prove than a partial scrub.

**Handles are never removed** because they hold no personal data and are the only thing preventing
a stale link resolving to a different tenant ([ADR-006](#adr-006--slug-uniqueness-includes-soft-deleted-teams)).

**Consequences**

- A scheduled task hard-deletes organizations soft-deleted more than 30 days ago, and audit
  entries older than 24 months. Neither exists yet; `routes/console.php` currently prunes only
  expired invitations.
- **Audit entries survive the organization's purge.** They are not part of the tree ADR-034
  deletes, so the record of a deletion outlives the deleted thing by up to 24 months.
- **The 30-day rule assumes no financial records live here.** Billing runs through Stripe, which
  holds what the seven-year fiscal retention obligation covers. If invoice data is ever stored in
  this application, this ADR is wrong and the purge needs an exception before that data arrives —
  not after.
- These periods are a choice, not a legal maximum, so they must appear in whatever privacy
  statement and processor agreement the first customer gets. There are no customers yet; the
  numbers are recorded here so the agreement can be written against something.
- **This ADR covers retention only**, and deliberately does not resolve whether NIS2 applies.
  Its other obligations are organisational, parked, and addressed by no decision in this log.

---

## ADR-035 — Laravel Cloud is the deployment target

**2026-08-18** · **Status**: Accepted. Closes the production requirement
[ADR-023](#adr-023--invitation-emails-are-rate-limited-and-queued) left open.

**Decision** — The control plane is deployed on Laravel Cloud. Its managed queue worker and
scheduler are what ADR-023 needed and never had, so queued mail, the daily invitation prune, and
later the agent's outbound work all become configuration rather than host administration.

**Alternatives** — A VPS managed with Forge or Ploi, which is tooling this team already uses
daily.

**Why** — The control plane is not the heavy infrastructure in this product; the customers'
servers are. Running our own host to save a modest amount per month means the platform that
manages other people's uptime has an uptime problem of its own to solve first, with no revenue
attached to solving it. Managed workers also remove a specific failure mode that would otherwise
be invisible: a supervisor process that dies silently and leaves invitations queued forever.

The Forge/Ploi option was genuinely close, and the deciding factor was not capability but
attention. Every hour spent on our own host is an hour not spent on the agent, which is the part
customers are actually paying for.

**Stated cost.** Higher monthly spend than a VPS, and the control plane — including the database
holding every customer's server credentials once those exist — lives with a third party. That
concentration is worth naming: it does not change the threat model in
[SECURITY.md](SECURITY.md) §1, which already places a malicious platform operator out of scope,
but it widens who "operator" means.

**Consequences**

- ADR-023 becomes fully implementable: rate limiter, `ShouldQueue` on the invitation
  notification, and a worker that exists.
- The scheduled invitation prune in `routes/console.php` gets a real scheduler.
- **This does not decide where NATS runs.** [Q2](OPEN_QUESTIONS.md) must still settle the
  transport, and "the control plane is on Laravel Cloud" is an input to that question, not an
  answer to it. Agents connect outbound to something, and what that something is remains open.
- Environment configuration moves to Cloud, which makes [G8](SECURITY.md) — a password policy
  keyed on `APP_ENV` — both easier to get right and easier to get wrong from a dashboard.

---

## ADR-034 — Deleting an organization soft-deletes its whole tree; restore is manual

**2026-08-18** · **Status**: Accepted. Implements
[ADR-019](#adr-019--resources-belong-directly-to-their-team-cross-team-sharing-is-deferred)'s
deletion clause; closes [G4](SECURITY.md).

**Decision** — `OrganizationController::destroy` soft-deletes memberships and invitations
alongside the organization, rather than hard-deleting them first. Owned resources join that set
as they are built. There is **no restore button**: recovery is an operator procedure, like
[ADR-029](#adr-029--recovering-an-abandoned-organization-is-a-manual-documented-procedure)'s
ownership transfer.

**Alternatives** — Add a retention window with automatic purge; drop soft-delete altogether and
delete for real.

**Why** — Today the asymmetry makes soft-delete worse than useless: the organization row survives
while its memberships do not, so restoring it produces something with no members and no owner —
an artefact nobody can reach or clean up. Either the tree survives together or nothing should.

Dropping soft-delete was the honest alternative and was rejected for one reason: deletion here is
irreversible destruction of a tenant's history at a moment when the person clicking has typed the
organization's name to confirm and may still be wrong. Keeping the rows costs almost nothing and
buys a recovery path that a support conversation can actually use.

**No restore UI** because a restore is exactly as consequential as a takeover: it puts data back
under someone's control, and the person asking is often the person who deleted it. That deserves
the same out-of-band verification ADR-029 specifies, and it is far too rare to justify a screen.

**Consequences**

- `Membership` and `OrganizationInvitation` gain `SoftDeletes`; every query touching them must
  keep excluding trashed rows, which Eloquent does by default — the risk is
  `withTrashed()` creeping into a query that should not have it.
- **Individual removals stay hard deletes**, which ADR-019 already required and which
  implementation showed is also load-bearing: `organization_members` has
  `UNIQUE(organization_id, user_id)`, so a lingering soft-deleted row would stop the same person
  from ever being re-added. Leaving, being removed, cancelling an invitation and pruning an
  expired one all use `forceDelete()`.
- Handle retirement is unaffected: `organization_handles` was already permanent and independent
  of soft-delete state.
- **The audit record of a deletion must not be deleted with it** — see
  [ADR-032](#adr-032--an-append-only-audit-log-built-now-while-there-are-five-events).
- **Retention is 30 days.** Soft-deleted organizations would otherwise accumulate forever, which
  is a privacy and data-minimisation question rather than a security one. Settled in
  [ADR-036](#adr-036--retention-30-days-for-deleted-organizations-24-months-for-audit-entries): 30 days, then a hard delete.

---

## ADR-033 — Invitation codes are stored hashed

**2026-08-18** · **Status**: Accepted. Amends
[ADR-009](#adr-009--the-invitation-code-alone-does-not-grant-access); closes
[G6](SECURITY.md).

**Decision** — `organization_invitations.code` becomes `code_hash`, holding a SHA-256 digest of
the code. The plaintext exists only in the URL that goes out by email; the application looks an
invitation up by hashing the incoming value. "Resend" issues a **new** code and invalidates the
old one, because the old one can no longer be recovered.

**Alternatives** — Leave it in plaintext, relying on ADR-009's email match; encrypt reversibly so
support can still retrieve the link.

**Why** — An invitation code is an access credential, and [SECURITY.md](SECURITY.md) §5 already
requires credentials to be encrypted at rest. Plaintext means a database read yields working
invitation links for every pending invitation at once. ADR-009's requirement that the invitee also
control the mailbox is a real second factor and it is why this is a gap rather than a hole — but
"mitigated" is not "closed", and this is a two-line change.

**Hashing rather than encrypting**, because reversible storage protects against a stolen database
dump and not against anything with application access, which is a materially weaker guarantee for
the same work. SHA-256 rather than bcrypt because the value must be _looked up_, not verified
against a known row, and 64 random characters have far more entropy than any password — the slow
hashing that protects weak secrets buys nothing here.

**Stated cost.** An invitation link can never be shown again — not in the UI, not by an operator
reading the database, not for support. Resending means issuing a new link and killing the old one.
That is stricter than today and, on reflection, the behaviour we would want anyway: a "resend"
that revives an old link leaves two valid credentials in two inboxes.

**Consequences**

- The route key is no longer a plain column. Binding resolves by hashing the incoming segment,
  so `getRouteKeyName()` cannot carry it alone.
- `UniqueOrganizationInvitation` and the prune job work on the hash; neither reads the plaintext.
- Any future invite-style token — server enrolment in [Q2](OPEN_QUESTIONS.md) especially —
  follows this shape rather than inventing its own.
- Existing rows cannot be migrated, since the plaintext cannot be recovered from itself in a
  meaningful way. There is no production data; local databases are rebuilt.

---

## ADR-032 — An append-only audit log, built now while there are five events

**2026-08-18** · **Status**: Accepted. Closes [G5](SECURITY.md).

**Decision** — One append-only table records who did what, to whom, in which organization, when
and from where. It is populated now with membership events — invite, cancel invitation, accept,
remove member, change role, delete organization, transfer ownership — and its shape is chosen for
the server operations that will follow. Owners and Admins can read their own organization's log;
nobody can edit or delete an entry through the application.

**Alternatives** — Design the shape now and build later; log only membership changes without
regard for what comes next; adopt an activity-log package; do nothing yet.

**Why the timing rather than the feature.** Nobody argues against an audit log; the question is
when. Right now there are five auditable actions and adding the log means touching five call
sites. Once servers exist there are dozens, each destructive, and retrofitting means finding every
one of them — with no way to tell which were missed, because a missing audit entry looks exactly
like an action that never happened.

[ADR-028](#adr-028--admins-manage-members-below-their-own-role) made this sharper: membership
changes are no longer the Owner's exclusive act, so "who removed this person" now has more than
one possible answer and no record. [ADR-029](#adr-029--recovering-an-abandoned-organization-is-a-manual-documented-procedure)
step 5 already assumes a record exists.

**A package was rejected** because this is not a debugging aid. It is tenant-scoped data with an
authorisation story, shown to customers, that must survive the deletion of the things it describes
— a general-purpose activity log built around polymorphic relations to live records is the wrong
shape for "this organization was deleted".

**NIS2 changed why this is built, after it was decided.** It was accepted as a product and
hygiene decision. It has since been established that the Cyberbeveiligingswet applies to this
platform, which makes reconstructing an incident an obligation with a 24-hour clock on it rather
than a nice-to-have. The design does not change; the priority and the retention period do — see
[ADR-036](#adr-036--retention-30-days-for-deleted-organizations-24-months-for-audit-entries).

**Consequences**

- Entries carry `organization_id` and are read through the organization relationship, like every
  other tenant-owned resource ([SECURITY.md](SECURITY.md) §5 rule 1).
- **Owners and Admins read their own organization's log in the UI**, and the same table serves
  internal incident and support work. One record, two audiences — which is why entries name what
  was done rather than dumping payloads.
- **Append-only is a convention, not a database guarantee.** The model exposes no update or delete
  path and nothing in the application writes one; enforcing it properly needs database privileges
  or triggers, which is a deployment concern and out of scope here. Stated so nobody reads more
  assurance into it than exists.
- **An organization's entries outlive the organization.** Deleting a tenant must not delete the
  record of who deleted it, which means these rows are not part of ADR-034's soft-delete tree and
  the foreign key must tolerate a soft-deleted parent.
- The actor may be null: operator actions under ADR-029, and later the agent, are not users.
  Every renderer must handle that.
- Entries record what was done, never the contents of what was done. Server credentials, agent
  tokens and invitation codes never reach this table.
- **Retention is 24 months**, driven by NIS2 rather than by preference — see [ADR-036](#adr-036--retention-30-days-for-deleted-organizations-24-months-for-audit-entries).

---

## ADR-031 — Tenant routes sit behind a literal `org/` segment

**2026-08-17** · **Status**: Accepted. Amends
[ADR-007](#adr-007--tenancy-is-scoped-by-team-slug-in-the-url-prefix); **retires
[ADR-008](#adr-008--team-names-are-validated-against-reserved-route-prefixes) for good**;
completes [ADR-025](#adr-025--team-becomes-organization-the-personal-team-is-removed)'s
simplification of [ADR-022](#adr-022--tenant-resources-use-the-current_team-prefix-team-administration-stays-at-settings).

**Decision** — Everything belonging to one organization moves from `/{handle}/…` to
`/org/{handle}/…`, matching Laravel Forge. Listing and creating organizations sits at `/org`.
`/settings/…` is now exclusively personal — profile, security, appearance — and organization
administration lives at `/org/{handle}/settings`.

There is one route parameter, `{organization}`, everywhere. `{current_organization}` is gone.

**Alternatives** — Keep the handle in the first segment and keep the reserved-word list; use a
shorter marker such as `/o/`; put organizations under `/organizations/{handle}`.

**Why — this is a security simplification, not a cosmetic one.** With the handle in the first
segment, a handle could shadow an application route, which is the entire reason ADR-008 existed.
[SECURITY.md](SECURITY.md) described that rule as load-bearing: it _must keep running_ on create
and rename, or the failure is a cross-tenant routing bug rather than an error. A control that
must not be forgotten is strictly worse than a condition that cannot arise, and
[SECURITY.md](SECURITY.md) §0 says to buy the safer option even when it costs more. Here it costs
one URL segment.

Three consequences follow, and the third is the one users feel:

1. **The reserved-word list is deleted**, not relocated. ~330 entries and the route-prefix scan
   are gone from `OrganizationHandle`, which now checks shape and availability only.
2. **New top-level routes are free forever.** Adding `/billing` no longer requires proving that
   no customer already holds `billing`, and never requires migrating one who does.
3. **Handles stop being rejected for reasons nobody can explain.** An agency called Support,
   Cloud, Design or Marketing was previously refused its obvious handle. `org/settings` is now a
   perfectly ordinary URL.

`/o/` was rejected as too terse to read as a word; `/organizations/{handle}` as needlessly long
on every tenant URL. `/org` matches Forge, which this product's users already use.

**Stated cost.** URLs gain a segment: `/org/oui-do-digital/sites/12`. ADR-007's wording — "first
path segment" — is amended to "first segment after `org/`". Its actual requirement, that a URL
resolves unambiguously to exactly one tenant, is untouched.

**Consequences**

- `{current_organization}` is removed. There was never a behavioural reason for two parameter
  names; the split existed only because organization administration lived outside the prefix.
- **A behaviour change worth naming:** because every tenant route is now prefixed, visiting an
  organization's _settings_ switches your current organization, which it previously did not.
  That is consistent — you navigated into that organization's context — and it disappears
  entirely with phase 3, which removes the implicit switch.
- `RedirectsToCurrentOrganization` builds `/org/{handle}{$redirect}`; post-login, post-2FA and
  post-verification redirects all land inside the prefix.
- `/settings/…` holds nothing tenant-scoped. The Organizations entry moved out of the settings
  section navigation and into the avatar menu, where ADR-016 already put account-level items.
- Anything added under `/org/{organization}/…` inherits `EnsureOrganizationMembership` from the
  group. Adding a tenant route outside that group remains the one way to lose tenant isolation.

---

## ADR-030 — The tenant URL identifier is a name-seeded, separately editable handle

**2026-08-17** · **Status**: Accepted. **Supersedes [ADR-027](#adr-027--the-tenant-url-identifier-is-a-random-immutable-public-id)**;
revives [ADR-008](#adr-008--team-names-are-validated-against-reserved-route-prefixes) in modified form.

**Decision** — `organizations.public_id` becomes `organizations.handle`. It is **seeded from the
name once, at creation** (`Str::slug`, numeric suffix on collision) and then leads its own life:

1. **Renaming never touches it.** There is no `updating` hook keyed on the name.
2. **It can be changed**, through its own field on the settings screen, validated separately from
   the name.
3. **It is never reissued.** A new `organization_handles` table records every handle a tenant has
   ever held; uniqueness is checked against it as well as against the live column and
   soft-deleted rows.

Reserved-word validation returns, but on the **handle**, not the name. An organization may be
called "Settings"; its handle may not be `settings`.

**Alternatives** — Keep ADR-027's random `public_id`; seed from the name but make the handle
immutable, avoiding the history table.

**Why — and this reverses an argument I made badly.** ADR-027 traded away URL readability, which
[ADR-007](#adr-007--tenancy-is-scoped-by-team-slug-in-the-url-prefix) and DATA_MODEL.md both
valued, and justified it largely on enumeration: that `/some-agency/` could be probed to learn
whether an agency is a customer. **That was wrong.** `EnsureOrganizationMembership` aborts with a
single 403 covering "no user", "no such organization" and "not a member", and unauthenticated
requests are redirected to login before reaching it. The three cases are indistinguishable, so
there is no enumeration channel to close. What remains true — the organization's name is visible
in shared links, browser history and referrer headers — concerns a name that is on the agency's
own website. That is not worth an unreadable URL.

The real defect ADR-027 fixed was never the readable slug. It was the **coupling**: the slug was
regenerated on rename, so renaming silently invalidated every bookmark, shared link and mail
archive. Laravel Forge, which this product's users already use, solves exactly that by
decoupling — the name seeds the handle once, and the handle is edited separately when it needs to
be. That keeps the fix and returns the readability.

**Why the history table, which is the real cost.** Once a handle is mutable, changing it releases
the old one. If another organization could then claim `acme`, every stale bookmark to `/acme/…`
would begin resolving to a different tenant — precisely the cross-tenant hazard
[ADR-006](#adr-006--slug-uniqueness-includes-soft-deleted-teams) exists to prevent, reintroduced
through a new door. `organization_handles` closes it, and later gives redirects for free.

An immutable name-seeded handle was the cheaper alternative and would have avoided that table
entirely. It was rejected for one reason: a collision leaves you permanently stuck on `acme-2`
with no way to fix it, and the fix is the whole point of Forge's second field.

**Consequences**

- **Stated cost:** changing a handle _does_ break existing links. Unlike the old behaviour this is
  explicit, user-initiated and warned about in the UI, rather than a side effect of renaming.
  Nothing redirects yet — `organization_handles` is the seam where that would live.
- `App\Concerns\Organizations\GeneratesPublicId` becomes `GeneratesHandle`. It exposes
  `handleIsUnavailable()` publicly so the validation rule and the generator ask one question with
  one answer.
- **ADR-008 returns as `App\Rules\Organizations\OrganizationHandle`**, with its reserved-word list
  restored from history. It is a better rule than the original: ADR-008 constrained the
  organization's _name_, which was always the wrong field. Names are now free text.
- **ADR-006 is unchanged in substance and strengthened in reach**: uniqueness spans the live
  column, soft-deleted rows, and every historical handle.
- ADR-027's other claim survives: the identifier is public and is never an authorisation factor.
  A readable handle makes that more obviously true, not less.
- Handles are recorded on every save, so the table is written on create and on change alike.
- The same shape is what `Site`, `Server` and `Client` should use if they want readable keys.

---

## ADR-029 — Recovering an abandoned organization is a manual, documented procedure

**2026-08-17** · **Status**: Accepted. Closes the involuntary case
[ADR-020](#adr-020--ownership-can-be-transferred-the-database-enforces-exactly-one-owner) left open.

**Decision** — There is no self-service route to take over an organization from an absent Owner.
Recovery is an operator procedure, written down in [SECURITY.md](SECURITY.md) so it is executed
the same way every time rather than improvised. The procedure requires, in order: identity
verification of the requester; confirmation that they already hold Admin in that organization;
notification to the current Owner's address; a waiting period before the change takes effect;
and a record of who performed it and why.

**Alternatives** — An inactivity-triggered takeover an Admin can request after N days without an
Owner login; requiring every organization to hold a second administrator from creation.

**Why** — ADR-020 gives a departing Owner a way out, but not the case where they simply stop
responding — left the company, unreachable, died. That gap is real once an organization owns
live servers.

An automated takeover is the obvious fix and the wrong one at this stage. It is, by
construction, a mechanism for transferring control of an organization away from its Owner, so
every parameter in it is an attack surface: if inactivity detection is wrong, or the waiting
period is short, or the notification goes to an address the Owner no longer reads, it becomes a
path to hijacking an organization holding administrative access to customer infrastructure.
Building that correctly costs more than the problem is worth at a volume that will be a handful
of cases a year.

Requiring a second administrator was rejected because it contradicts
[ADR-025](#adr-025--team-becomes-organization-the-personal-team-is-removed): not everyone
signing up is a company, and a sole trader has no second person to nominate.

**The honest limitation:** this is only as good as the operator process behind it, and there is
no operator function yet. Until there is, "documented procedure" means a known answer to a
question that will eventually be asked — not a capability that exists today. That is still
better than deciding it under pressure with a customer waiting.

**Consequences**

- The procedure is written into [SECURITY.md](SECURITY.md). It is not code, and no ADR should be
  read as implying it is automated.
- Staff performing it have database-level access, which [SECURITY.md](SECURITY.md) §1 already
  lists as explicitly out of scope for the threat model. This ADR does not change that; it does
  make the absence of an audit trail (gap G5) more pointed, since an ownership change is exactly
  the event you would want a record of.
- Revisit when either becomes true: manual handling stops scaling, or an audit log exists to
  back an automated flow. Not before.

---

## ADR-028 — Admins manage members below their own role

**2026-08-17** · **Status**: Accepted, **implemented 2026-08-18**. Amends
[ADR-005](#adr-005--permissions-are-an-enum-decoupled-from-roles).

**Decision** — `member:add`, `member:update`, `member:remove` and `invitation:create` are granted
to Admin as well as Owner, with one constraint: an actor may only affect a membership, or issue
an invitation for a role, that ranks **strictly below their own**. `OrganizationRole::level()`
(Owner 3, Admin 2, Member 1) already exists for this and is currently unused by any route.

In practice: an Admin may add, remove and re-role Members, and may invite people as Members. An
Admin may not touch another Admin or the Owner, may not invite anyone as Admin or Owner, and
therefore cannot escalate themselves or create a peer. `organization:delete` stays Owner-only.

| Permission            | Owner | Admin | Member |
| --------------------- | :---: | :---: | :----: |
| `organization:update` |  ✅   |  ✅   |   —    |
| `organization:delete` |  ✅   |   —   |   —    |
| `member:add`          |  ✅   |  ✅¹  |   —    |
| `member:update`       |  ✅   |  ✅¹  |   —    |
| `member:remove`       |  ✅   |  ✅¹  |   —    |
| `invitation:create`   |  ✅   |  ✅¹  |   —    |
| `invitation:cancel`   |  ✅   |  ✅   |   —    |

¹ Only against a role ranking below the actor's own.

**Alternatives** — Leave all member management with the Owner, as today; grant Admins removal
only, without role changes.

**Why** — The current split has a failure mode that is a security problem rather than an
inconvenience. Only the Owner can remove a member. If the Owner is on holiday and someone
leaves the company suddenly, nobody can revoke that person's access to an organization holding
administrative control over customer servers. The safest-looking permission map produces the
least safe outcome, because the bus factor for revocation is one.

The rank constraint is what makes widening this safe: everything the Owner needs protecting from
— self-promotion, removing the Owner, minting a peer Admin — is blocked by the same single rule,
and the rule is one comparison rather than a set of special cases. It is also the model GitHub,
Slack and Google Workspace use, so it matches what users already expect.

**Granting removal without role changes was rejected** as a half-permission: harder to explain
than the whole one, and it would leave the `member:add` / `invitation:create` split — invisible
to users, since both mean "someone new joins" — sitting there unexplained.

**Stated cost.** An Admin can now remove a Member without the Owner's involvement. That is the
point, and it is a real widening: an Admin acting maliciously or carelessly can cut a colleague's
access. The rank rule bounds the blast radius to roles below them, and it does not reach any
resource — this is membership only. It does raise the value of gap G5: an ownership or membership
change is now something more than one person can perform, and there is still no record of who did
it.

**Consequences**

- The rank check lives in `OrganizationPolicy` (`updateMember`, `removeMember`, `inviteMember`),
  not in the permission map. Permissions stay plain role→capability booleans per ADR-005; the
  comparison is an additional guard, so the enum keeps reading as a specification.
- `invitation:create` must validate the _invited role_ against the actor's level, not only the
  action. An Admin inviting an Admin is the escalation path this closes.
- `member:add` and `invitation:create` now map identically for both roles. They are kept
  separate because a future "add an existing platform user directly" flow would use the first
  while email invitations use the second. If that flow never appears, merge them.
- Tests required, all negative: an Admin cannot remove another Admin, cannot remove the Owner,
  cannot promote anyone to Admin or Owner, cannot invite above Member — and can remove a Member.
- [SECURITY.md](SECURITY.md) §3 "Privilege boundaries" is rewritten by this.
- **Implementation found a live escalation path this entry did not anticipate.**
  `CreateOrganizationInvitationRequest` validated the role with `Rule::enum`, which accepts every
  case including `owner`, while `inviteMember` only asked whether the actor could invite at all.
  Any Admin could therefore invite a new Owner — before this ADR, not because of it. Verified with
  a probe test, then closed as part of this change and recorded as G11 in
  [SECURITY.md](SECURITY.md). It is the sharpest possible illustration of this entry's own point:
  the escalation path is the _invited role_, not the invite action.
- `assignable()` is gone; `assignableBy(OrganizationRole $actor)` replaces it. Owner drops out
  because a role does not outrank itself, so the ADR-005/ADR-020 guarantee now holds by
  construction instead of by a hardcoded exception.
- Form requests gained `authorize()` so the base permission is checked before validation.
  Without it a Member submitting an invitation got a field error about the role rather than a
  403 — the right outcome for the wrong reason.

---

## ADR-027 — The tenant URL identifier is a random, immutable public ID

**2026-08-17** · **Status**: **Superseded by [ADR-030](#adr-030--the-tenant-url-identifier-is-a-name-seeded-separately-editable-handle)**

> Reversed the same day, after implementation. **Its central argument does not hold:** the claim
> that a name-derived identifier lets an attacker probe `/some-agency/` to discover customers is
> false, because `EnsureOrganizationMembership` returns one indistinguishable 403 for "no such
> organization" and "not a member". The readability this entry traded away was therefore paid for
> with a benefit that did not exist. What it got right — that renaming must never change the URL,
> and that an identifier is never reissued — is carried forward by ADR-030.

**Original decision** — Supersedes the slug-generation half of
[ADR-006](#adr-006--slug-uniqueness-includes-soft-deleted-teams); retires
[ADR-008](#adr-008--team-names-are-validated-against-reserved-route-prefixes); amends
[ADR-007](#adr-007--tenancy-is-scoped-by-team-slug-in-the-url-prefix).

**Decision** — The first URL segment stops being a slug derived from the organization's name and
becomes a randomly generated, opaque, **immutable** public identifier: `/k7m3xq9v2rft/sites/12`.
It is generated once at creation, never derived from anything, and never changes — renaming an
organization does not touch it, and there is no action that does.

The column is renamed `slug` → `public_id`, since "slug" would be a lie about what it holds.
Format: twelve lowercase alphanumeric characters from an alphabet excluding visually ambiguous
ones (`0`/`o`, `1`/`l`/`i`), so it survives being read aloud, copied by hand or pasted into a
support ticket.

**Alternatives** — Freeze the name-derived slug at creation, with an explicit opt-in action to
change it (the option originally recommended); keep regenerating it on rename, as today;
sequential integer IDs.

**Why** — Today `Organization::booted()` regenerates the slug on rename, so renaming an
organization silently invalidates every bookmark, every link shared in Slack and every URL in
mail history. That is the exact failure ADR-006 was written to prevent, reintroduced by a button
in the settings screen.

Freezing a name-derived slug fixes that, but keeps three other problems. A random identifier
removes all four at once:

1. **Links cannot break on rename** — not by policy, but by construction. There is no code path
   that changes the identifier, so there is nothing to get wrong later.
2. **The `acme-2` collision suffix disappears.** Two organizations may share a name freely.
   `GeneratesUniqueOrganizationSlugs`, with its slug-parsing and numeric-suffix logic, collapses
   into generate-and-retry-on-collision.
3. **Organization names become genuinely free text.** ADR-008 exists only because a name-derived
   slug occupies the first URL segment, so an organization called "Settings" would shadow the
   application's own routes. A twelve-character random token cannot collide with any route
   literal, so the reserved-word list and the whole class of bug it guards against stop existing.
4. **The customer's name leaves the URL.** This is the part worth the most. Today every URL
   contains the agency's name, which means the identifier is guessable: anyone can probe
   `/some-agency/` and learn from the response whether that agency is a customer. A random
   identifier removes that inference entirely — a property DATA_MODEL.md already argued for when
   it rejected sequential IDs, applied consistently rather than half-way.

**Stated cost — this is a real loss, not a free win.** URLs stop being human-readable.
[ADR-007](#adr-007--tenancy-is-scoped-by-team-slug-in-the-url-prefix) and DATA_MODEL.md both
explicitly valued readability, on the grounds that agency staff share links internally, and
`/k7m3xq9v2rft/sites/12` tells a reader nothing about which organization they are about to open.

That cost is accepted because the property ADR-007 actually needed is _unambiguity_ — one URL
resolves to exactly one tenant, so a shared link never shows the reader someone else's data —
and that is fully preserved. Readability was a convenience layered on top. The organization
switcher and the page header still name the organization on arrival, so a reader who opens the
link is not confused; they simply cannot tell in advance from the URL alone.

**Consequences**

- `organizations.slug` → `organizations.public_id`: unique, generated on create, **immutable
  thereafter**. No rename path, no redirect table, no reserved slugs to maintain.
- **ADR-006's reasoning is preserved and its cost disappears.** The uniqueness check keeps
  `withTrashed()`, so a deleted organization's identifier is never reissued and a stale bookmark
  can never resolve to a different tenant. What goes away is the "occasional ugly `acme-2`" that
  entry accepted as the price.
- **ADR-008 is retired.** `OrganizationName` keeps ordinary validation — length, character set,
  required — but the reserved-word list and the route-prefix collision check are removed, because
  the condition that made them load-bearing no longer exists. Note the inversion: validation moves
  from _user input_ to _generated output_, and the generator has nothing to validate against.
- **The same generator is reused for `Site`, `Server` and `Client` route keys**, settling
  DATA_MODEL.md's "route keys for tenant resources should be non-sequential" constraint with one
  shared implementation rather than a rule each new table has to remember.
- The generator retries on collision against `withTrashed()`. At twelve characters over a
  thirty-ish character alphabet, a collision is a formality, but the retry is one line and makes
  the guarantee absolute rather than probabilistic.
- Existing local databases must be rebuilt. There is no production data, so no backfill migration
  is written.

---

## ADR-026 — `app/` stays type-first, with a domain subfolder inside each type

**2026-08-17** · **Status**: Accepted. **Supersedes ADR-021**

**Decision** — Reverses [ADR-021](#adr-021--app-moves-to-domain-folders). `app/` keeps Laravel's
type-first layout (`app/Models`, `app/Policies`, `app/Actions`, `app/Http/Controllers`, …).
Inside each type folder, files are grouped into a subfolder per domain:
`app/Models/Organizations/`, `app/Policies/Organizations/`, later `app/Actions/Sites/`,
`app/Models/Servers/`. Files that belong to no single domain — `User`, `Providers`,
`Console`, Fortify actions, Inertia middleware, shared validation-rule traits — stay flat in
their type folder.

The subfolder is applied consistently from the start, including where a type currently holds
only one file for that domain.

**Alternatives** — Domain-first folders (`app/Organizations/Http/Controllers/…`), which is
what ADR-021 decided; leaving the current half-applied state, where controllers, requests,
actions and notifications have a `Teams/` subfolder but models, policies, rules, data and
enums are flat.

**Why** — ADR-021's argument — that nothing in a type-first tree represents "this is the Sites
feature" — is a scaling argument, and the tree is not at that scale. Counted on 2026-08-17:

| Folder                              | Files |
| ----------------------------------- | ----- |
| `app/Http/Requests`                 | 9     |
| `app/Http/Controllers`              | 7     |
| `app/Models`, `app/Concerns`        | 4     |
| `app/Actions`, `app/Rules`          | 3     |
| `app/Data`, `app/Enums`             | 2     |
| `app/Policies`, `app/Notifications` | 1     |

Thirty-six files. Against that, domain-first costs friction with everything the ecosystem
assumes: `make:` command defaults, Larastan, the Boost guidelines' "stick to existing
directory structure", and every developer or tool that expects `app/Models`. Half of this
decision's shape is also already in the tree (`Http/Controllers/Teams`, `Http/Requests/Teams`,
`Actions/Teams`, `Notifications/Teams`), so this is completing an existing pattern rather
than introducing one.

Applying the subfolder even to single-file types looks like ceremony today and is deliberate:
`Servers`, `Sites` and `Clients` land within weeks, and the alternative is moving the same
files a second time.

**Policy auto-discovery was checked and is not a factor.** Laravel 13 resolves a policy by
substituting `Policies\` for `Models\` in the model's namespace, so both
`App\Policies\Organizations\OrganizationPolicy` (this decision) and
`App\Organizations\Policies\OrganizationPolicy` (ADR-021) are discovered without explicit
registration. Recorded so nobody re-derives it as an argument either way.

**Consequences**

- New domains add a subfolder inside each relevant type folder, not a new top-level folder.
- ADR-010's note about "no domain folder to host a scoped `CLAUDE.md` yet" is resolved
  differently than ADR-021 planned: scoped guidance stays path-based
  (`app/Http/Controllers/Organizations/CLAUDE.md`), following whatever directory the guidance
  actually concerns.
- This is reversible. Moving from type-first-with-subfolders to domain-first later is a
  mechanical relocation, which is part of why the cheaper option is correct now.
- Revisit if a single domain's file count makes its slice of the tree hard to hold in one
  view — roughly, when one domain owns more files than the whole of `app/` does today.

---

## ADR-025 — `Team` becomes `Organization`; the personal team is removed

**2026-08-17** · **Status**: Accepted. **Supersedes [ADR-004](#adr-004--every-user-gets-a-personal-team-at-registration)**;
partially reverses [ADR-017](#adr-017--clients-are-a-grouping-entity-inside-a-team-not-a-second-tenancy-level);
amends [ADR-003](#adr-003--the-current-team-is-stored-on-the-user-record),
[ADR-016](#adr-016--top-navigation-for-areas-contextual-navigation-for-resources) and
[ADR-022](#adr-022--tenant-resources-use-the-current_team-prefix-team-administration-stays-at-settings).

**Decision** — The tenancy boundary is renamed from `Team` to `Organization` throughout: model,
table, enums, DTOs, middleware, routes, URL segment and frontend types. Three things change
with it, and they are the reason this is an ADR rather than a rename commit:

1. **`is_personal` is removed.** There is no special first team. Registration creates a normal
   organization named after the user, renameable from settings like any other.
2. **A user can belong to several organizations, and this is a first-class scenario**, not a
   grouping mechanism. The intended case is a person who genuinely works for more than one
   organization — a freelancer with their own practice plus one or more agencies — switching
   without logging out.
3. **Visiting an organization-prefixed URL no longer writes `current_organization_id`.** The
   URL scopes that request only; the stored current organization changes on an explicit
   switch, or on landing at `/`.

**Alternatives** — Keep the name `Team` and only remove the personal-team concept; rename to
`Account`; keep `Team` as a layer _inside_ `Organization`, as Laravel Forge does.

**Why** — `Team` was never a second layer: it is already the tenancy boundary, the resource
owner and the permission scope. The name was the problem, and it caused two concrete
failures.

First, it invited [ADR-017](#adr-017--clients-are-a-grouping-entity-inside-a-team-not-a-second-tenancy-level)'s
guidance to name teams by function — `Front-end`, `Back-end`, `QA`. That guidance is
unworkable against [ADR-019](#adr-019--resources-belong-directly-to-their-team-cross-team-sharing-is-deferred),
which gives each resource exactly one owning team: a site that both front-end and back-end
work on cannot sit in both. Under "organization", the question does not arise — an
organization is an organization, and grouping inside it is what `Client` is for.

Second, "team" made the personal team read as a feature rather than an implementation detail.
In practice every user carried a permanently visible, undeletable tenant they never asked
for, and — because it was the current organization on first login — the likely home of the
first server or site created by accident.

`Organization` is also what Laravel Forge calls the same concept, which matters for a product
whose users are already Forge and Ploi customers.

**`Account` was rejected on a naming collision**, not on substance: users read "account" as
"my account" — profile, password, billing — so `/settings/account` (the person) would sit
beside `Account` (the tenant) at exactly the point where this rename is buying clarity.

**Keeping a `Team` layer inside `Organization`, as Forge does, was rejected as premature.**
The needs it would serve are better served by what already exists or is already decided:
grouping by `Client` (ADR-017), and capability by `OrganizationRole` (ADR-005). The one need
neither covers — restricting a member to a subset of resources — is a visibility problem, and
the traceable path for it is scoping a membership to a set of clients, not a second grouping
entity. That remained undecided at the time — resolved by [ADR-037](#adr-037--every-member-sees-everything-in-their-organization-visibility-is-not-scoped).

**Why zero organizations is not a valid state.** A user's last membership can disappear
without their involvement: an owner removes them, or the organization is deleted. Two
defences, replacing the single `is_personal` special case:

- **Voluntary** — a user cannot leave or delete their last organization.
- **Involuntary** — if a user's last membership disappears anyway, an organization is created
  for them, named after them.

Allowing a zero-organization state with an onboarding screen was considered and rejected. It
would have been defensible — the URL prefix (ADR-007) means the null case collapses to a
single middleware guard rather than spreading through every feature — but it trades a
guaranteed invariant for a screen, and every downstream feature would have to be written
against a tenant that might not be there. The auto-create keeps ADR-004's actual benefit
(code may assume a current organization resolves) while dropping the part users saw.

**Consequences**

- The full rename map, file inventory, semantic changes and execution order were tracked in a
  now-deleted execution plan; all six phases landed and are folded into ARCHITECTURE.md and
  DATA_MODEL.md. This ADR records _why_.
- **ADR-004 is superseded.** `is_personal` and `personalTeam()` are gone. Code may still
  assume a current organization resolves for any authenticated user — that invariant is
  preserved, by different means.
- **ADR-017 is partially reversed.** The free-form and functional organization-naming guidance
  is withdrawn: an organization is one organization, normally one per real-world entity. The
  `Client` entity, and everything else ADR-017 decided about it, is unchanged.
- **ADR-022 is simplified.** Its two-shape rule and the "does the tenant _have_ it, or does the
  user _configure_ it" test are no longer needed. Everything belonging to the organization,
  members included, lives under `/{current_organization}/…`. `/settings/…` becomes purely
  personal: profile, security, appearance. The one exception is the organization list-and-create
  page, which belongs to no single tenant and stays outside the prefix.
- **ADR-016 is amended in one place.** The switcher stays in row one beside the logo, as
  originally specified — multi-organization membership is now an endorsed scenario, so the
  switcher is discoverability, not clutter. Nothing else in ADR-016 changes; the renaming of
  its "Teams" language is editorial.
- **ADR-003 is amended** by point 3 above. `current_organization_id` still lives on the user
  row and still survives logout and device changes; only the implicit write on prefix
  navigation is removed. Following a shared link no longer repoints the reader's other tabs.
- ADR-005, ADR-006, ADR-007, ADR-008, ADR-009, ADR-019, ADR-020 and ADR-023 are unaffected in
  substance by _this_ entry. They are renamed, not reconsidered — though ADR-005 is later
  amended by ADR-028, and ADR-006/007/008 by ADR-027.
- **Do this before `Site`, `Server` and `Client` exist.** Today the rename touches roughly 90
  files across one fully tested feature, with no production data, so the migrations are
  rewritten rather than stacked. Each new domain multiplies that.

---

## ADR-024 — Add `pest-plugin-browser`, scoped to the three lockout-risk auth flows

**2026-08-17** · **Status**: Accepted

**Decision** — Resolves [Q9](OPEN_QUESTIONS.md). Add `pestphp/pest-plugin-browser` as a dev
dependency. Coverage is scoped to the three flows that can lock a user out of their own
account if silently broken: two-factor setup and challenge, passkey registration, and
password confirmation. This is not a general commitment to frontend/browser test coverage
for every UI primitive.

**Alternatives** — Add the plugin with broad coverage across every dialog and primitive;
defer the dependency decision entirely and rely on `tsc`, lint, the build, and manual
checking, as today.

**Why** — The React Aria migration (ADR-015) rewrote all three of these flows and was
verified by type-checking plus a manual look at the _unauthenticated_ pages — the
authenticated, highest-consequence flows were never exercised. `tsc`, lint and the Pest
backend suite all stay green if a dialog silently stops opening; only a real browser
assertion catches that. Scoping to three flows keeps the Playwright dependency and CI time
bounded while closing the actual risk, rather than taking on general UI-coverage debt as a
side effect.

**Consequences**

- `pestphp/pest-plugin-browser` and its Playwright browser binaries become a project
  dependency; CI needs to install/cache browsers.
- New tests live wherever this project's Pest browser tests are conventionally placed
  (`tests/Feature/` alongside the existing suite, or a `tests/Browser/` directory if one is
  introduced — follow whichever the first test establishes).
- Each test uses `visit()` with `actingAs()` and asserts both that the dialog/flow completes
  and that no JavaScript error was thrown.
- This does not retroactively mandate browser tests for every future dialog. Extending
  coverage beyond these three flows is a new decision, not implied by this one.

---

## ADR-023 — Invitation emails are rate-limited and queued

**2026-08-17** · **Status**: Accepted

**Decision** — Resolves [Q8](OPEN_QUESTIONS.md). `TeamInvitationController::store` gets a
rate limiter matching the shape already used for login/2FA/passkeys. The invitation
notification is marked `ShouldQueue`, dispatched onto the already-configured
`QUEUE_CONNECTION=database` connection instead of being sent inline.

**Alternatives** — Add only the rate limiter and leave sending synchronous; leave both as
they are.

**Why** — Today, any Owner or Admin can trigger unbounded outbound email with no rate limit
— unlike every other user-triggered action that sends something (login, 2FA, passkeys all
have one) — and a slow or failing mail provider directly slows or fails the invite request
because sending happens inline. Queuing is not a bigger lift than it looks: Laravel's
`php artisan dev` (what `composer dev` / `vp run dev` already runs) starts a
`queue:listen` process by default, so local development gets a working queue worker for
free with no change to the dev stack. The only real decision this creates is how a worker
runs in **production**, which needs answering before agent work (Q2) regardless — updates
and provisioning cannot be synchronous — so establishing the pattern now, on a low-stakes
notification, is cheaper than inventing it under pressure later.

**Consequences**

- A named rate limiter (e.g. `invitation`) is added in `FortifyServiceProvider` or an
  equivalent central location, keyed by the inviting user, and applied as route middleware
  on `TeamInvitationController::store`.
- The invitation notification implements `ShouldQueue`; `Notification::route('mail', …)`
  dispatch is unchanged otherwise.
- Local development needs no new process — `queue:listen` is already part of the default
  `artisan dev` set.
- **Production must run a queue worker.** This is a deployment requirement to track
  wherever hosting/deployment is decided (Laravel Cloud's managed worker, a supervisor
  process, or equivalent) — not optional once this ADR lands.
- Failed queued jobs use Laravel's standard failed-jobs table; no custom failure handling is
  introduced by this decision.

---

## ADR-022 — Tenant resources use the `/{current_team}/…` prefix; team administration stays at `/settings/…`

**2026-08-17** · **Status**: **Superseded by [ADR-025](#adr-025--team-becomes-organization-the-personal-team-is-removed) and [ADR-031](#adr-031--tenant-routes-sit-behind-a-literal-org-segment)**

> The prefix rule for tenant resources stands. The split does not: organization administration
> — general settings, members, invitations — moves _inside_ the prefix, at
> `/{current_organization}/settings/…`. `/settings/…` becomes purely personal. The
> "does the tenant _have_ it, or does the user _configure_ it" test is therefore no longer
> needed and should not be applied to new features. The only route that stays outside the
> prefix is the organization list-and-create page, which belongs to no single tenant.

**Decision** — Resolves [Q4](OPEN_QUESTIONS.md). The two coexisting route shapes are both
kept, with their scope made explicit rather than left to precedent: anything under a `Team`
that is a **resource** the team works on — Servers, Sites, Clients, Domains — is routed
`/{current_team}/…`, matching what ADR-007 already established for the dashboard. Anything
that is **team administration** — creating, renaming, deleting a team, managing its
membership — stays at `/settings/teams/…`, outside the prefix, alongside the rest of
`/settings/…`.

**Alternatives** — Move team administration under the prefix too, for one consistent shape
everywhere a `{team}` parameter appears.

**Why** — This is the shape ADR-016 already used without stating the rule: team
administration sits with `/settings/…` because it is something a user does to their
relationship with a team (which team am I configuring), not something they do inside a
team's working context. A URL like `/acme/servers/12` should mean "server 12, viewed as
Acme" — the tenant is part of what's being looked at. `/settings/teams/acme` is not that; it
is a settings page that happens to take a team as an argument, the same way
`/settings/profile` takes the current user as an implicit argument. Writing this down now
matters because Servers, Sites and Clients are about to be the first real test of the
pattern, and every one of them should copy the resource shape, not the administration shape.

**Consequences**

- New resources (`Server`, `Site`, `Client`, `Domain`) are routed
  `/{current_team}/servers/…`, `/{current_team}/sites/…`, etc.
- `/settings/teams/…` is not a precedent for tenant resources, despite taking a `{team}`
  parameter — it is the one deliberate exception, not the pattern to copy.
- If a future feature is genuinely ambiguous between the two, the test is: does the URL
  describe something the tenant _has_, or something the user is _configuring about_ the
  tenant?

---

## ADR-021 — `app/` moves to domain folders

**2026-08-17** · **Status**: **Superseded by [ADR-026](#adr-026--app-stays-type-first-with-a-domain-subfolder-inside-each-type)**

> Reversed the same day, before implementation. Nothing in this entry was built. Kept for the
> reasoning, which ADR-026 answers directly rather than ignores.

**Decision** — Resolves [Q3](OPEN_QUESTIONS.md). `app/` moves from Laravel's type-first
layout (`Http/Controllers/Teams`, `Actions/Teams`, `Models`, `Policies`, …) to domain
folders: `app/Teams/`, `app/Sites/`, `app/Servers/`, each containing its own
`Http/Controllers`, `Actions`, `Models`, `Policies`, etc., plus a scoped `CLAUDE.md`.

**Alternatives** — Keep the Laravel-default type-first layout, matching what Boost and the
rest of the ecosystem's tooling assume.

**Why** — The team domain already spans seven type-first directories. Servers, Sites and
Clients arriving at once, on top of that, means every one of the domain's files scattered
across the same seven folders with nothing that represents "this is the Sites feature."
Deciding this before the first `Site` migration is a rename; deciding it after means moving
files that by then also have PHPStan baselines, tests and imports pointing at them.

**Consequences**

- New domains are created as `app/{Domain}/` from the start: `app/Sites/`, `app/Servers/`,
  `app/Clients/`.
- `app/Teams/` is restructured to match, moving today's `Http/Controllers/Teams`,
  `Actions/Teams`, the `Team`/`Membership`/`TeamInvitation` models, `TeamPolicy` and related
  rules into it. This touches import paths across the existing, tested team feature — do in
  one dedicated change, verified by the existing Pest suite, not folded into unrelated work.
- Framework-wide concerns that do not belong to one domain (base `Model`, shared
  `Concerns`, Fortify actions, Inertia middleware) stay where Laravel expects them.
- Scoped `CLAUDE.md` files live at `app/{Domain}/CLAUDE.md`, resolving the "no domain folder
  to host one yet" gap noted in ADR-010.

---

## ADR-020 — Ownership can be transferred; the database enforces exactly one Owner

**2026-08-17** · **Status**: Accepted, **completed by [ADR-029](#adr-029--recovering-an-abandoned-organization-is-a-manual-documented-procedure)**

> This entry covers the voluntary transfer. The involuntary case — an Owner who disappears
> without handing over — is answered by ADR-029: a documented operator procedure, deliberately
> not a self-service takeover. Note also that ADR-028 does **not** loosen this: Owner stays out
> of `assignable()`, and an Admin can never promote anyone to Admin or Owner.

**Decision** — Resolves [Q6](OPEN_QUESTIONS.md). `TeamRole::assignable()` will include Owner
in one context only: a dedicated "transfer ownership" action, distinct from the general
member-role editor. The transfer is a single transaction: the current Owner becomes Admin,
the chosen target (who must already be an Admin) becomes Owner. A database constraint
enforces at most one Owner per team; combined with the existing `TeamPolicy` rule that blocks
the sole Owner from leaving or being removed, this guarantees exactly one Owner always
exists once a team has any members at all.

**Alternatives** — Leave ownership untransferable, as today; allow shared/multiple Owners.

**Why** — An owner who wants to step back currently has no route to do so, and an abandoned
team has no path to a new Owner — a real operational gap once a team owns live servers and
sites, not a theoretical one. Restricting the source pool to existing Admins (rather than any
Member) means a transfer is always to someone who has already been trusted with the team's
administrative permissions, not a cold handoff to an untested member.

**Consequences**

- The transfer action is a new, explicit endpoint — not a side effect of the existing
  member-role update form, which still excludes Owner from its options.
- The database constraint (partial unique index: one `owner` role per `team_id`) makes a
  zero- or multiple-owner team unrepresentable, closing the gap `Team::owner()`'s
  `first()` lookup was quietly relying on.
- Transfer requires the target to already hold Admin — promoting a Member to Owner directly
  is not supported; promote to Admin first.

---

## ADR-019 — Resources belong directly to their `Team`; cross-team sharing is deferred

**2026-08-17** · **Status**: Accepted

**Decision** — Resolves [Q5](OPEN_QUESTIONS.md) and confirms ADR-017's ownership model
against two real competitors' designs. `Server`, `Site`, `Client` and `Domain` all carry a
`team_id` and are owned by exactly one `Team`, visible to every member of that team — the
same shape `Team` already has today, extended rather than replaced. Deleting a `Team` soft-
deletes its memberships, invitations, and owned resources together, so restoring the team is
restoring a coherent whole rather than an empty shell (closing the gap DATA_MODEL.md flagged
in `TeamController::destroy`). Deleting an individual resource (e.g. one `Site`) is a
separate, explicit, permission-gated hard delete, independent of team lifecycle.

**Alternatives considered** — A `RunCloud`-style split, researched directly against the
competitors named as inspiration for this product: a `Team` there is a pure visibility grant
(which resources a member can see) fully decoupled from `Role` (what they can do), letting
one resource be shared across multiple teams, with a default "All Access" team for solo
users. `Ploi`, by contrast, ships the same shape this ADR adopts — servers, sites, backups
and scripts each belong to exactly one team, filtered by "current team context" — and its own
roadmap notes visibility/permissions "were built as something of an afterthought," with sites
added after team setup needing manual permission attention.

**Why** — The Ploi shape is what is already built and tested in this codebase
(`current_team_id`, the team switcher, `EnsureTeamMembership`); adopting it for the hosting
domain costs nothing new. The RunCloud shape only pays for itself once a real need exists for
the _same_ resource to be worked on by two different teams with different permissions —
nothing in this product today creates that need, and building the grant-table and
Account-layer machinery speculatively is exactly the premature abstraction `CLAUDE.md` warns
against. Ploi's own admission that bolting sharing on later caused friction is a reason to
default resources to a visible, working owner now, not a reason to build the general case
upfront.

**Consequences**

- No new `Account` entity. `Team` remains both the tenancy boundary (ADR-007) and the
  resource owner.
- `Client` (ADR-017) is owned by `Team`, not by any higher entity — consistent with `Team`
  owning every other resource.
- If real usage later proves a resource needs multi-team visibility, the traceable path is
  additive: a `team_resource` grant table recording _additional_ teams with access, with
  `team_id` remaining the resource's "home" team. This does not require revisiting this ADR's
  core model, only extending it.
- `TeamController::destroy` must be changed to soft-delete memberships, invitations, and (once
  they exist) owned resources in the same operation as the team, rather than hard-deleting
  memberships first as it does today.

---

## ADR-018 — The hosted resource is called `Site`, with a `type` and optional child services

**2026-08-17** · **Status**: Accepted

**Decision** — The core hosted entity is named `Site`, not `Application`, resolving
[Q10](OPEN_QUESTIONS.md). A Site is anchored to a primary domain — the unit agencies already
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

---

## ADR-017 — Clients are a grouping entity inside a Team, not a second tenancy level

**2026-08-17** · **Status**: Accepted, **partially reversed by [ADR-025](#adr-025--team-becomes-organization-the-personal-team-is-removed)**

> Two changes. `Team` is renamed to `Organization` throughout this entry. And the free-form
> naming guidance — an agency creating several teams named by function, `Front-end`,
> `Back-end`, `QA` — is **withdrawn**: it cannot work alongside ADR-019, which gives each
> resource exactly one owning tenant. Everything this ADR decides about `Client` stands
> unchanged.

**Decision** — `Team` remains the sole tenancy boundary and stays free-form: an agency
creates as many Teams as it wants, named however it likes (functional groupings such as
"Front-end", "Back-end", "QA", "DevOps" are an explicit, supported use, following Forge's
convention). This resolves [Q1](OPEN_QUESTIONS.md) — there is no second tenancy level, and
"Team" is not renamed.

A new `Client` entity is added _inside_ a Team: a lightweight record (name, contact details)
owned by a Team, with no membership, login or permission model of its own. `Site` gets a
nullable `client_id` FK scoped to the same Team; domains and mailboxes will get the same FK
when they exist. This follows the WPMUDEV Hub pattern — sites are tagged to a client for
organisation and reporting, and later for recurring billing and ticketing — without touching
the tenancy boundary.

**Alternatives** — A second tenancy level where Client sits above or below Team and owns
servers/sites directly (the two-level model Q1 raised as a possibility); folding "client"
into Team itself by convention only.

**Why** — The actual requirement is Forge-style free-naming teams (colleagues grouped
however an agency likes, not necessarily one-per-client) _plus_ WPMUDEV-style client tagging
for billing and reporting. A second tenancy level would force "one tenant per client" on
every agency, which directly contradicts wanting teams named by function rather than by
client. Modelling Client as an owned, non-tenancy entity inside Team gets the
grouping/billing/ticketing benefit at a fraction of the cost of a second enforcement layer,
and leaves ADR-005 (permissions) and ADR-007 (team-scoped URLs) completely untouched.

**Consequences**

- `Team` keeps its current meaning, model and name. No rename, no restructuring.
- `Client` is a new tenant-owned table: `team_id` FK, `cascadeOnDelete`, following the
  modelling constraints in [DATA_MODEL.md](DATA_MODEL.md).
- `Site.client_id` (and later `Domain.client_id`, `Mailbox.client_id`) is nullable — a site
  need not belong to a client.
- Client is authorised through the same team-permission model as everything else (ADR-005);
  there is no client-level login or role in this design. A client portal with its own login
  is a distinct, deliberate future feature, not implied here.
- Recurring billing and ticketing, the motivating future uses, are out of scope for this
  ADR — it only settles the grouping shape they will attach to.

---

## ADR-016 — Top navigation for areas, contextual navigation for resources

**2026-08-15** · **Status**: Accepted, **amended by [ADR-025](#adr-025--team-becomes-organization-the-personal-team-is-removed)**

> **Two amendments, both implemented 2026-08-17.**
>
> **Organization settings became an area.** Row two now holds Overview and Settings, and the
> bullet below saying team administration keeps no top-level slot is reversed. This is the third
> position on that question, so the reasoning matters more than the answer: the earlier reversal
> was correct _while_ team administration lived at `/settings/teams/…`, an account-level location.
> [ADR-031](#adr-031--tenant-routes-sit-behind-a-literal-org-segment) moved it to
> `/org/{organization}/settings`, which makes it tenant-scoped — and this ADR's own rule is that
> tenant-scoped areas go in row two. The location changed, so the answer changed with it.
>
> Its sections — General and Members today, Roles and Billing later — are a `SectionNav`, exactly
> as this entry prescribes.
>
> **The organizations list page was removed rather than relocated.** Creating an organization
> happens in the header switcher and deleting one on its General tab, which left the list with
> nothing to do; `/org` redirects into the user's own organization instead. This is why the empty
> state that ADR-016 lists as a reusable component has one fewer consumer than expected.
>
> **Account settings are still not an area**, and are now named "Account" rather than "Settings",
> since "Settings" is what the organization area is called. It carries Profile and Security.
> Appearance left it for a theme toggle in the avatar menu — a per-device display preference is
> not a settings page, and putting it in the menu makes it reachable from anywhere.
>
> The switcher in row one is confirmed rather than changed: multi-organization membership is an
> endorsed scenario. All "team" language below reads as "organization"; that part is editorial.

**Decision** — The application shell is a persistent two-row top navigation, not a global
sidebar:

- **Row one** — logo, tenant (team) switcher, account menu. Constant at every depth.
- **Row two** — tenant-scoped _areas_: Dashboard and Settings today; Servers, Applications
  and DNS as they are built.
- **Second level** — a `SectionNav` for the sections _within_ one resource or area, rendered
  beside the content rather than as a global sidebar.

`AppLayout` now renders `app/app-header-layout`. The sidebar template stays in the tree as
the alternative.

**Alternatives** — Keep the global sidebar and nest resources inside it; adopt Laravel
Forge's information architecture wholesale.

**Why** — The application has two navigation axes, and one sidebar expresses only one of
them well. Tenant-scoped areas are stable and always available; resource-scoped sections
belong to whatever is currently open. Forcing both into a single sidebar produces either an
accordion tree that grows without bound, or navigation that depends entirely on breadcrumbs
and loses discoverability.

The second level matters more than the first. Server sections are identical for every
server, but **application sections are not**: a WordPress install wants plugins, themes and
WP-CLI; a Laravel application wants queues, scheduler and environment. A contextual nav can
swap per resource type. A fixed global sidebar cannot — which is the real argument for this
shape, stronger than anything about the server level.

**We deliberately did not copy Forge's structure.** Forge is server-first, because it is a
tool for developers running their own infrastructure: sites live inside a server. This
platform's users are agencies, who think in terms of a client's website rather than
`web-03`. Applications are therefore a top-level area in their own right, listable across
servers, with Servers a peer rather than a mandatory parent.

**Consequences**

- New tenant-scoped **areas** go in row two of `app-header`. New **sections** of a resource
  go in a `SectionNav`. Anything that is a section of one resource must not be added to the
  top nav.
- `SectionNav` (`components/section-nav.tsx`) is the reusable second level. Settings is its
  first consumer and the working reference.
- The shell follows Laravel Forge's proportions — a 1920px container, `px-4 sm:px-8`
  gutters, a 16.5 unit header row, tabs with a sliding underline, and content in an inset
  panel with a hairline ring. Those proportions are expressed with **this project's existing
  tokens** (`bg-sidebar`, `ring-sidebar-border`, `bg-accent`), not with a parallel set of
  semantic colours copied from Forge. Adopting Forge's token vocabulary would have meant
  maintaining two design systems at once.
- `NavTabs`, `EmptyState`, `AppFooter` and the `AppContent` panel are built as reusable
  components rather than markup inside the dashboard, because every server and application
  list will need exactly these four.
- This settles [Q4](OPEN_QUESTIONS.md): tenant resources are routed
  `/{current_team}/servers/{server}/…` and `/{current_team}/applications/{application}/…`,
  while user-level `/settings/…` stays outside the tenant prefix deliberately, because it
  belongs to the person rather than the tenant.
- **Account settings are not an area.** Profile, Security and Appearance hang off the avatar
  menu, keeping the tab row for the product rather than personal preferences. They remain
  real pages at `/settings/…`, not a dialog: `settings/security` sits behind
  `RequirePassword`, which _redirects_, and both it and Profile launch their own dialogs
  (two-factor setup, passkeys, account deletion). A settings modal would mean nesting those.
- **Team administration stays with the account settings**, at `/settings/teams/…`, reached
  through the avatar menu. It was briefly promoted to its own area on the reasoning that it
  administers an organisation rather than a person; that was reversed the same day. Until
  the platform has servers and applications, team management is something an agency touches
  a handful of times — at setup and when staff change — and a permanent slot in the top
  navigation overstates it. Revisit if it grows billing or an audit log.
- `teams.index` sits outside the `{current_team}` prefix: it lists every team the user
  belongs to, so it cannot belong to any one tenant. Everything scoped to a single team
  keeps `EnsureTeamMembership`.
- **Row two holds one item — Overview.** The row exists for what is coming, and listing an
  area before its routes exist would only produce 404s. Renamed from "Dashboard" to match
  the language the rest of the industry uses for a tenant landing page.
- Mobile collapses both levels into the existing sheet. Two navigation levels do not fold
  gracefully by default, so any new area must be added to the sheet as well.
- The naming and typing of the resource behind "Applications" is **not** settled by this
  decision — see [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md) (Q10). Nothing here should be read
  as approving a `sites` table.

---

## ADR-015 — shadcn/ui runs on the React Aria base

**2026-08-15** · **Status**: Accepted

**Decision** — Switched the shadcn base from Radix to React Aria: `components.json` moved
from `"style": "new-york"` to `"style": "aria-vega"`, all primitives were re-added from the
aria registry, and the thirteen `@radix-ui/*` packages were removed. Vega is the style
formerly called new-york, so the app looks the same.

**Alternatives** — Stay on Radix (fully supported, not deprecated); move to the Base UI
registry instead.

**Why** — Requested. React Aria became a first-class shadcn base in July 2026 and brings
Adobe's accessibility work — focus management, keyboard interaction and screen-reader
behaviour — as the foundation of every primitive.

**This was not an under-the-hood swap, and could not be.** shadcn's aria components expose
React Aria's own API, so call-sites had to change:

| Radix                                                                         | React Aria                                                                 |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `<DialogContent>` inside `<Dialog>`                                           | `<Dialog>` is the content                                                  |
| `open` / `onOpenChange`                                                       | `isOpen` / `onOpenChange`                                                  |
| `onClick` / `disabled`                                                        | `onPress` / `isDisabled`                                                   |
| `onSelect` on menu items                                                      | `onAction`                                                                 |
| `asChild`                                                                     | `href`, `LinkButton`, or a `render` prop                                   |
| `<TooltipProvider>` + `<Tooltip><TooltipTrigger/><TooltipContent/></Tooltip>` | `<TooltipTrigger>` holds trigger and `<Tooltip>` side by side; no provider |
| `<DropdownMenu>` root                                                         | `<DropdownMenuTrigger>` is the root                                        |
| `side` / `align` / `sideOffset`                                               | `placement`                                                                |
| `<SelectItem value>`                                                          | `<SelectItem id>`, with `selectedKey` / `onSelectionChange`                |

There is no codemod for this: `shadcn migrate` offers only `icons`, `rtl` and `radix`, and
that last one converts individual Radix packages to the unified `radix-ui` package. 95 type
errors across 35 files were worked through by hand and by targeted scripts.

**Consequences**

- **`RouterProvider` is wired to Inertia in `app.tsx`.** React Aria components navigate
  through their own `href`, so without it every link inside a primitive would need to wrap
  an Inertia `<Link>`. This is what makes `LinkButton`, `SidebarMenuButton href` and
  `DropdownMenuItem href` perform client-side visits.
- **Inertia's `prefetch` is lost** on links that are now React Aria components: the sidebar
  nav, the app logo and the user menu's Settings item. `RouterProvider` calls
  `router.visit()`, which has no hover-prefetch equivalent. Navigation still works; it is
  marginally less eager. Restoring it would mean going back to wrapping Inertia `<Link>`s,
  which is the pattern React Aria is built to avoid.
- **`navigation-menu` does not exist in the aria registry.** Its only consumer used the three
  structural wrappers and no menu behaviour, so `app-header` now uses semantic
  `<nav>/<ul>/<li>` and the primitive is deleted.
- **`sonner` was rewired.** The registry version reads the theme from `next-themes`; it now
  uses this app's `useAppearance` hook, and `next-themes` was removed rather than run a
  second theme system.
- The CLI's `use-mobile.ts` was discarded in favour of the existing `use-mobile.tsx`, which
  is SSR-safe via `useSyncExternalStore`. The CLI version flashes on first render.
- Five unused primitives were deleted (toggle, toggle-group, skeleton, icon, collapsible);
  the CLI re-added `skeleton`, `textarea` and `input-group` as dependencies of others.
- **`sidebar.tsx` and `dropdown-menu.tsx` carry a local fix.** They passed
  `data-active={isActive}` and `data-inset={inset}` straight through. React renders a `false`
  data attribute as the string `"false"` rather than omitting it, and the variants match on
  presence (`data-active:`, not `data-[active=true]`), so every sidebar button painted its
  active background permanently. Both now pass `|| undefined`. **`shadcn add --overwrite`
  will drop this** — re-check it after any component update.
- **Two dialogs kept the Radix nesting** — trigger inside `<Dialog>` rather than beside it
  under `<DialogTrigger>` — which renders nothing at all, hiding the delete-account and
  remove-passkey buttons. Fixed, and `tests/Feature/DialogStructureTest.php` now asserts
  against that shape, since neither tsc nor the linter can see it.
- **Verification is thin.** There are no frontend tests. Lint, `tsc`, the production build
  and 93 backend tests pass, and the unauthenticated pages were checked in a browser, but
  the authenticated flows have not been exercised. See
  [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md) (Q9).

---

## ADR-014 — `vp run dev` runs the whole stack, and Vite is registered directly

**2026-08-15** · **Status**: Accepted

**Decision** — `package.json`'s `dev` script runs `php artisan dev`, so `vp run dev` and
`composer dev` both start the full stack. `AppServiceProvider::configureDevCommands()`
overrides Laravel's Vite dev process to run `vp dev` directly instead of the default
`pnpm run dev`.

**Alternatives** — Leave `dev` as `vp dev` and require `composer dev` for the full stack;
name the Vite-only script `dev:vite` and have `artisan dev` call that.

**Why** — `vp run dev` looks like the command that runs the app, so people reached for it,
got Vite alone, and found nothing on `:8000` — made worse by `laravel-vite-plugin` printing
an `APP_URL: http://localhost:8000` banner that reads like a server it started. Making the
obvious command do the obvious thing is worth more than preserving the split.

**The override is load-bearing, not decoration.** Laravel registers its Vite process as
`pnpm run dev`, which resolves to the `dev` script — now `php artisan dev`. Left alone, the
command and the script would spawn each other without end. Registering `vp dev` under the
same `vite` name takes package.json out of that path entirely. Routing through a
`dev:vite` script would have worked too, but leaves the same trap one rename away.

**Consequences**

- Do not point the `vite` dev process back at a package.json script without changing the
  `dev` script in the same edit. `tests/Feature/DevCommandsTest.php` fails if anyone does.
- `vp dev` still means Vite alone — useful with Herd or Valet, and what the Vite+ docs
  describe. The `vp <name>` versus `vp run <name>` distinction now genuinely matters here.
- Run one stack at a time: concurrent `artisan dev` runs fight over the Vite port and
  `public/hot`.

---

## ADR-013 — The build pipeline runs through `vp`, and CI actually runs

**2026-08-15** · **Status**: Accepted

**Decision** — `composer setup` and `composer ci:check` invoke `vp` instead of `npm`. The
GitHub Actions workflow uses `voidzero-dev/setup-vp` (Node 24, caching enabled) in place of
`actions/setup-node`. PHPStan is invoked with `--memory-limit=1G`.

**Alternatives** — Keep `npm` and drop the `devEngines` constraint; call `pnpm` directly and
leave `vp` for local use; drop the composer wrappers and document the raw commands.

**Why** — After ADR-012, both composer scripts failed immediately with `EBADDEVENGINES`,
because they called `npm` while `package.json` requires pnpm. The workflow inherited that
failure, pinned Node 22 against the Node 24 the migration installed, and never installed the
`vp` CLI at all — so CI could not have passed even once. `setup-vp` is the vendor-supported
path and collapses Node, package-manager and cache setup into a single step, which removes
three ways for the workflow to drift out of sync with local development.

Dropping `devEngines` instead would have "fixed" CI by allowing two package managers to
write the same lockfile — trading a loud failure for a quiet one.

**Consequences**

- `vp` must be present wherever `composer setup` or `composer ci:check` runs. In CI that is
  `setup-vp`; locally it is the developer's global install.
- The workflow pins `setup-vp` to a commit SHA with the release tag in a comment, matching
  the existing actions. Dependabot's `github-actions` ecosystem keeps it updated.
- **PHPStan must be run through `composer types:check`.** Calling `phpstan analyse` directly
  crashes at PHP's default 128M limit, and the error names the crash rather than the cause.
- Enabling `composer ci:check` exposed 16 test files that Pint had been failing on — the
  Pint step had never been reached, because `npm` failed first. Fixed with
  `vendor/bin/pint`: 15 files missing a trailing newline, and `AuthenticationTest.php` also
  needed unary-operator spacing. No test logic changed and all 90 tests still pass.

---

## ADR-012 — The frontend toolchain is Vite+ (`vp`), replacing ESLint and Prettier

**2026-08-15** · **Status**: Accepted

**Decision** — Migrated to Vite+ 0.2.9. `vp` is the entry point for install, dev, build,
lint, format and check. Oxlint replaces ESLint, Oxfmt replaces Prettier, and both are
configured through `lint` and `fmt` keys inside `vite.config.ts` rather than separate
dotfiles. A pre-commit hook runs `vp check --fix` over staged files. `baseUrl` was removed
from `tsconfig.json` so type-aware linting could be enabled.

**Alternatives** — Stay on Vite with ESLint and Prettier; adopt Biome; keep ESLint and swap
only the formatter.

**Why** — One toolchain with one config surface instead of four tools with four configs, and
Oxlint and Oxfmt are substantially faster than what they replace. The migration was
automated: `@oxlint/migrate` converted the ESLint rules, the Prettier config was translated,
and `@andrewbranch/ts5to6` removed the deprecated `baseUrl`. Removing `baseUrl` was needed
regardless — it is deprecated in TypeScript 6 and removed in 7 — and unlocked type-aware
lint rules as a side benefit.

The pre-commit hook is the part that matters most for this project. Checks that only run in
CI are checks that get discovered late; running them on staged files means formatting and
lint drift never reaches review. That is worth more here than raw speed, given the tree
currently has no version control to fall back on at all.

**Consequences**

- `eslint.config.js`, `.prettierrc` and `.prettierignore` are gone. Do not recreate them —
  edit the `lint` and `fmt` keys in `vite.config.ts`.
- `vite.config.ts` grew to roughly 1400 lines, mostly a generated browser-globals map. The
  Vite plugin array is wrapped in `lazyPlugins()` so lint and format commands do not
  instantiate the Laravel, Inertia, React, Tailwind and Wayfinder plugins. New plugins go
  inside that callback.
- **Do not reintroduce `baseUrl`.** It silently disables type-aware linting.
- Type-aware linting surfaced four pre-existing warnings ESLint did not catch (three
  floating promises, one useless default parameter). All four are now fixed.
- `CLAUDE.md` and `AGENTS.md` now carry a second generated block, `<!--VITE PLUS START-->`
  to `<!--VITE PLUS END-->`, at the bottom. Project guidance sits between the two generated
  blocks.
- The build pipeline was repointed at `vp` — see ADR-013.

---

## ADR-011 — Documentation lives in the repository and is part of the definition of done

**2026-08-15** · **Status**: Accepted

**Decision** — Architecture, data model, security posture, open questions and this log are
maintained as Markdown in the repository. Documentation is updated in the same change as
the code it describes, never deferred.

**Alternatives** — An external wiki or Notion space; documentation written at milestones;
no formal documentation, relying on the code.

**Why** — The platform is going to grow several large domains (servers, sites, agents,
monitoring, billing) on top of a foundation only partly designed. Documentation that lives
elsewhere goes stale invisibly and gets skipped under delivery pressure. In the repository
it is reviewed alongside the code and is available to whoever — or whatever — is working on
the codebase. Deferring documentation updates to "later" reliably means never; the cost of
a stale architecture document is worse than having none, because it invites trust it has
not earned.

**Consequences** — Every change that alters behaviour, data shape or security posture
updates the relevant documents in the same change. `CLAUDE.md` encodes this as a mandatory
step.

---

## ADR-010 — Project guidance is appended below the generated Boost block

**2026-08-15** · **Status**: Accepted

**Decision** — `CLAUDE.md` and `AGENTS.md` keep the machine-generated
`<laravel-boost-guidelines>` block untouched at the top. All project-specific guidance is
appended strictly below its closing tag. Scoped guidance sits in `app/CLAUDE.md`,
`app/Http/Controllers/Teams/CLAUDE.md` and `resources/js/CLAUDE.md`.

**Alternatives** — Replace the generated block with hand-written content; keep project
guidance only in `docs/`.

**Why** — `composer update` runs `boost:update`, which rewrites the block between those
tags. Anything written inside it is destroyed without warning. Appending below the closing
tag survives regeneration.

**Consequences** — Never edit inside `<laravel-boost-guidelines>`. Since `app/` is organised
by Laravel type rather than by domain, there is no domain folder to host a scoped file yet;
that lands when ADR-open (domain folder structure) is settled.

---

## ADR-009 — The invitation code alone does not grant access

**Reconstructed** · **Status**: Accepted

**Decision** — Accepting an invitation requires both the 64-character code _and_ an
authenticated user whose email matches the invitation's email, compared case-insensitively
(`App\Rules\ValidTeamInvitation`). Invitations expire after three days and expired rows are
pruned daily.

**Alternatives** — Treat possession of the code as sufficient authority, the common
"anyone with the link can join" pattern.

**Why** — Invitation links travel through email, which gets forwarded, archived, indexed by
corporate scanners and left in shared inboxes. Making the link alone sufficient means one
careless forward grants a stranger access to a tenant's data. Requiring the mailbox as well
means a leaked link is inert without control of the invited address. The cost is friction:
you cannot invite `info@` and have a colleague accept from their personal address. That
trade is correct for a platform holding customer server access.

**Consequences** — Any future invite-style flow (server enrolment tokens, share links)
follows the same shape: the token identifies, a second factor authorises. Changing the
invited email means cancelling and re-inviting.

---

## ADR-008 — Team names are validated against reserved route prefixes

**Reconstructed** · **Status**: **Retired for good by [ADR-031](#adr-031--tenant-routes-sit-behind-a-literal-org-segment)**

> Twice reversed, now settled. ADR-027 retired this rule on a mistaken premise; ADR-030 revived it
> against the **handle** rather than the name, which was the field it always should have guarded.
> ADR-031 then removed the need for it altogether by putting every tenant route behind a literal
> `org/` segment — a handle can no longer shadow a route, so there is nothing to reserve. The list
> is deleted rather than relocated. Reintroduce it only if tenant handles ever return to the first
> URL segment.

**Decision** — `App\Rules\TeamName` rejects any name whose slug collides with an existing
first-segment route prefix, plus a static list of reserved words (`admin`, `api`, `billing`,
`settings`, HTTP status codes, and so on). Applied on both create and rename.

**Alternatives** — Namespace tenant URLs under a fixed prefix such as `/t/{team}/…`; allow
any name and resolve conflicts by route ordering.

**Why** — Tenant slugs occupy the first URL segment (ADR-007), so a team named "settings"
would shadow the application's own routes. Relying on route registration order to resolve
that is fragile — it breaks the moment routes are reordered, and the failure is a
cross-tenant routing bug rather than an error. The static list additionally reserves words
we are likely to want later, so a future `/billing` route does not have to be abandoned
because a customer already claimed the name.

**Consequences** — This rule is load-bearing and must keep running on create and rename.
Adding a new top-level route means checking that no existing team already holds that slug.

---

## ADR-007 — Tenancy is scoped by team slug in the URL prefix

**Reconstructed** · **Status**: Accepted, **amended by [ADR-030](#adr-030--the-tenant-url-identifier-is-a-name-seeded-separately-editable-handle) and [ADR-031](#adr-031--tenant-routes-sit-behind-a-literal-org-segment)**

> The prefix stays; two things about it changed. [ADR-030](#adr-030--the-tenant-url-identifier-is-a-name-seeded-separately-editable-handle)
> restored a readable identifier — a `handle` seeded from the name, no longer regenerated on rename
> — so this entry's readability argument holds again. [ADR-031](#adr-031--tenant-routes-sit-behind-a-literal-org-segment) then moved the tenant from
> the **first** path segment to the segment after a literal `org/`, which is what let ADR-008 be
> deleted outright. The property this entry actually depends on, that one URL resolves to exactly
> one tenant so a shared link never opens someone else's data, was never in question.
> The closing note about `/settings/teams/{team}` being an inconsistency to resolve is answered
> by [ADR-025](#adr-025--team-becomes-organization-the-personal-team-is-removed).

**Decision** — Tenant-scoped routes carry the team slug as their first path segment
(`/{current_team}/dashboard`), guarded by `EnsureTeamMembership`, with `SetTeamUrlDefaults`
filling the parameter automatically. Visiting another team's prefix switches the user's
current team, provided they are a member.

**Alternatives** — Session-only tenant context with unprefixed URLs; a subdomain per tenant.

**Why** — The URL states which tenant is being viewed, so a shared or bookmarked link is
unambiguous. Under session-only context, the same URL shows different data to different
people, and a link pasted into a chat opens the wrong tenant's data for the reader — which
is both a support problem and a mis-action risk when the action is "update all sites on
this server". Subdomains give the same property but add DNS, TLS and cookie-scope
complexity that is not worth it at this stage.

**Consequences** — Every future tenant resource route belongs under the `/{current_team}/…`
prefix. Team slugs must not collide with route prefixes (ADR-008), and retired slugs are
never reissued (ADR-006). Currently only the dashboard uses the prefix; the team settings
routes use a `/settings/teams/{team}` shape instead, which is an inconsistency to resolve
before the pattern is copied further.

---

## ADR-006 — Slug uniqueness includes soft-deleted teams

**Reconstructed** · **Status**: Accepted, **extended by [ADR-030](#adr-030--the-tenant-url-identifier-is-a-name-seeded-separately-editable-handle)**

> The core rule stands and now reaches further. Under ADR-030 the identifier is a `handle` seeded
> from the name, and uniqueness is checked across three things rather than one: the live column,
> soft-deleted rows, and `organization_handles` — every handle any tenant has ever held. That last
> one stops a _changed_ handle from being claimed by someone else, which would have reintroduced
> this entry's hazard through a door it never anticipated. The `acme-2` suffix accepted here as
> the price is back, and is now fixable: the handle can be edited.

**Decision** — `GeneratesUniqueTeamSlugs` checks `withTrashed()`. A deleted team's slug is
retired permanently; a later team with the same name gets a numeric suffix.

**Alternatives** — Free the slug when a team is deleted.

**Why** — The slug is the tenant identifier in the URL. Reissuing it means old links,
bookmarks, emails and browser history pointing at the deleted tenant silently resolve to a
_different_ customer's tenant. That is a cross-tenant data exposure triggered by nothing
more than a stale bookmark. Permanently retiring the slug costs an occasional ugly
`acme-2` and removes the class of bug entirely.

**Consequences** — The `teams` table grows monotonically in slug namespace. Any future hard
delete or purge must keep the slug reserved, or reintroduce this hole.

---

## ADR-005 — Permissions are an enum, decoupled from roles

**Reconstructed** · **Status**: Accepted, **amended by [ADR-028](#adr-028--admins-manage-members-below-their-own-role)**

> The mechanism is unchanged — authorisation still asks for a permission, never a role name.
> The map changes: Admin gains `member:add`, `member:update` and `member:remove`, bounded to
> roles ranking below their own. `TeamRole::assignable()` still excludes Owner, so ADR-020's
> transfer flow remains the only route to ownership. See ADR-028 for the revised table.

**Decision** — `TeamPermission` enumerates capabilities; `TeamRole::permissions()` maps each
role to a set of them. All authorisation asks for a permission, never for a role name.
`TeamRole::assignable()` excludes Owner.

**Alternatives** — Compare role strings at each call site; adopt a package such as
spatie/laravel-permission.

**Why** — Role-string comparisons scatter the permission model across the codebase, so
adding a role or moving a capability becomes a search-and-replace with no compiler help and
no single place to review. Asking for permissions keeps the model in one file that can be
read as a specification. A full permission package is more machinery than a fixed
three-role model needs, and would put the rules in the database where they cannot be
reviewed in a diff.

**Consequences** — New capabilities are added as enum cases and mapped per role. Excluding
Owner from `assignable()` means ownership transfer needs its own deliberate flow — it
cannot happen through the member-role UI.

---

## ADR-004 — Every user gets a personal team at registration

**Reconstructed** · **Status**: **Superseded by [ADR-025](#adr-025--team-becomes-organization-the-personal-team-is-removed)**

> The invariant survives — every authenticated user always has at least one tenant — but
> `is_personal` and the personal-team concept do not. ADR-025 achieves the same guarantee by
> blocking a user from leaving their last organization, and creating one if their last
> membership disappears involuntarily.

**Decision** — `CreateNewUser` creates a personal team (`is_personal = true`) inside the
registration transaction. Personal teams cannot be deleted or left.

**Alternatives** — Allow users to exist without a team and handle the empty state
throughout the application.

**Why** — Guaranteeing a tenant always exists removes null-team handling from every
downstream feature — every dashboard, every list, every redirect. It also gives a reliable
fallback when a user leaves or is removed from their last shared team, so they are never
stranded on a page with no valid tenant context. The cost is a slightly confusing concept
for users who only ever work in a shared team.

**Consequences** — Code may assume `currentTeam` or `personalTeam()` resolves for any
authenticated user. Whether "personal team" survives the naming decision on Teams is open —
see [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md).

---

## ADR-003 — The current team is stored on the user record

**Reconstructed** · **Status**: Accepted, **amended by [ADR-025](#adr-025--team-becomes-organization-the-personal-team-is-removed)**

> The column stays on the user row and keeps its rationale; it is renamed
> `current_organization_id`. What changes is the last consequence below: visiting an
> organization-prefixed URL no longer performs an implicit switch. The URL scopes that request
> only, and the stored value changes on an explicit switch or on landing at `/`. Following a
> shared link therefore no longer repoints the reader's other tabs, and the "not
> idempotent-safe for prefetching" caveat falls away.

**Decision** — `users.current_team_id`, a nullable FK with `nullOnDelete`, rather than a
session value.

**Alternatives** — Keep the current team in the session; derive it from the URL only.

**Why** — Team context survives logout, session expiry and moving between devices. A user
following an emailed invitation link on their phone arrives in the right tenant. The cost
is a database write on every team switch, which is negligible at the frequency team
switching actually occurs.

**Consequences** — Switching teams mutates the user row, so it is a `POST`, not a `GET`.
`EnsureTeamMembership` performing an implicit switch on prefix navigation is a write on
what looks like a read; acceptable, but it means team switching is not idempotent-safe for
prefetching.

---

## ADR-002 — Authentication is delegated to Fortify, with overridden responses

**Reconstructed** · **Status**: Accepted

**Decision** — Laravel Fortify provides registration, login, password reset, email
verification, 2FA (TOTP + recovery codes) and passkeys. Response contracts are overridden in
`app/Http/Responses/` to redirect to the team-prefixed dashboard.

**Alternatives** — Hand-rolled authentication; Laravel Breeze/Jetstream; Fortify with
default redirects.

**Why** — Authentication is the highest-consequence, most attacked, most subtly wrong part
of any application. Fortify is maintained by the framework team, receives security fixes,
and already implements the hard parts — 2FA, recovery codes, WebAuthn, password confirmation
and rate limiting — correctly. Writing this by hand would be strictly worse in exchange for
nothing. The response overrides are necessary because Fortify's defaults do not know about
tenant-prefixed URLs (ADR-007).

**Consequences** — Auth features are configured, not written. Custom behaviour goes through
Fortify's action and response contracts rather than by editing flows. Production password
policy is enforced centrally in `AppServiceProvider` (12 characters, mixed case, numbers,
symbols, breach-checked), relaxed in local and test environments so fixtures stay simple.

---

## ADR-001 — Inertia + React monolith rather than a separate API and SPA

**Reconstructed** · **Status**: Accepted

**Decision** — One Laravel application rendering React pages through Inertia, with Wayfinder
generating typed TypeScript callers for controllers and named routes.

**Alternatives** — A JSON API plus a standalone SPA; server-rendered Blade with Livewire.

**Why** — Inertia gives an SPA experience while keeping authorisation, validation and
routing in one place on the server. A separate API would mean maintaining two deployables,
duplicating the authorisation model at the API boundary, and — most relevant here — creating
a second, independently-reachable surface where tenant scoping could be got wrong. One
enforcement point for tenant isolation is worth a great deal on a platform whose core
promise is that one customer never sees another's servers. Wayfinder closes the remaining
gap, so route changes surface as TypeScript errors rather than runtime 404s.

**Consequences** — No public API exists, and adding one later means designing tenant
scoping for it deliberately rather than inheriting it. `resources/js/actions/` and
`resources/js/routes/` are generated and must never be hand-edited. PHP DTOs in `app/Data/`
and their TypeScript counterparts in `resources/js/types/` are paired by hand and must be
changed together.
