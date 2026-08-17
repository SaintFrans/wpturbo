# Security

_Last verified against the codebase: 2026-08-15._

> **Renamed on 2026-08-17.** `Team` is `Organization` throughout the code
> ([ADR-025](DECISIONS.md)); read every "team" below as "organization" and
> `EnsureTeamMembership` as `EnsureOrganizationMembership`. **No control was weakened by the
> rename**, and the full review is in [ORGANIZATION_RENAME.md](ORGANIZATION_RENAME.md) §9.
>
> One control genuinely changed: [ADR-027](DECISIONS.md) replaced the name-derived slug with a
> random immutable `public_id`. This **closes G10** — the customer's name no longer appears in
> any URL, so `/some-agency/` can no longer be probed to learn whether an agency is a customer.
> It also retired ADR-008: `App\Rules\OrganizationName` and its reserved-word list are deleted,
> because a random token cannot shadow a route literal. Being unguessable is a privacy
> improvement, **not** an authorisation factor — see assumption 4.
>
> Still unimplemented, and both flagged in place below: the `is_personal` removal with its
> auto-create fallback, and [ADR-028](DECISIONS.md)'s Admin member management (**G9 is open**).

## 0. The rule

**Security wins over functionality. Always. This is a rule, not a guideline.**

Concretely:

- Given a choice between a simpler or faster implementation and a safer one, the safer one
  is built — even when it is more work, even when nobody asked, even when it makes the
  feature less convenient.
- This applies with particular force to: authorisation between tenants, servers and
  customers; anything touching the agent or server connections; secrets and credentials;
  and anything that could make one tenant's data visible to another.
- When the safer approach makes a feature slower, narrower or less convenient, that is
  **stated explicitly** in the change, never absorbed silently. The person asking for the
  feature is entitled to know what shape it ended up in and why.
- Every trade-off with a non-trivial security implication is recorded here and in
  [DECISIONS.md](DECISIONS.md).

The reason is specific to this product, not generic caution: the platform holds
administrative access to servers running its customers' customers' websites. A tenant
isolation failure is not an embarrassing data leak — it is one agency gaining the ability to
modify or destroy another agency's clients' live sites. The blast radius justifies
consistently choosing the more expensive option.

## 1. Threat model

### What we protect

| Asset                                 | Exists today       | Why it matters                                         |
| ------------------------------------- | ------------------ | ------------------------------------------------------ |
| User credentials and sessions         | Yes                | Account takeover is the entry point to everything else |
| Tenant membership and roles           | Yes                | The mechanism that separates one agency from another   |
| Invitation codes                      | Yes                | Grant access to a tenant                               |
| Server credentials / agent identities | **No — not built** | Administrative access to live customer infrastructure  |
| Customer site data and content        | **No — not built** | The end customer's business                            |
| Billing data                          | **No — not built** | Financial and personal data                            |

### Who we defend against

1. **Another tenant on the platform.** The primary adversary. An authenticated, legitimate
   customer attempting — deliberately or by accident, via URL manipulation, stale links, or
   forced browsing — to read or affect another tenant's resources.
2. **An authenticated user exceeding their role.** A Member acting as an Admin, an Admin
   escalating to Owner.
3. **An external attacker without an account.** Credential stuffing, brute force, phishing
   for invitation links, session theft.
4. **A compromised customer server.** Once agents exist: a server the platform manages that
   has been taken over, attempting to influence the control plane or reach other tenants.
   This is the most consequential future threat and is entirely unaddressed today, because
   nothing is built.

### Explicitly out of scope, for now

- A malicious platform operator. Staff with database access can read everything; there is
  no operator-access audit trail or encryption-from-operators model.
- Denial of service beyond per-endpoint rate limiting.
- Supply chain compromise of PHP or npm dependencies, beyond Dependabot.

## 2. Assumptions

These are believed true and are relied upon. If one becomes false, the model breaks.

1. **Every tenant-scoped request passes through `EnsureTeamMembership`.** Tenant isolation
   depends on this middleware being on the route group. A tenant route registered outside it
   has no isolation at all.
2. **Authorisation is re-checked server-side on every mutating request.** The permission
   booleans sent to React (`TeamPermissions`) control what is _displayed_. They are not a
   control — the policy is. Both must be present.
3. **Fortify is correct.** Authentication, 2FA, recovery codes and WebAuthn are delegated to
   the framework team rather than hand-written (ADR-002).
4. **The team slug is public.** It is in the URL and it appears in shared links. It is an
   identifier, never a secret and never an authorisation factor. This stays true under
   [ADR-027](DECISIONS.md), which replaces it with a random `public_id`: being unguessable is a
   privacy improvement, **not** a new authorisation factor. Membership is still checked on every
   request, and possession of the identifier must never be treated as access.
5. **The invitation code is secret but not sufficient.** It is unguessable, and it is
   deliberately not enough on its own (ADR-009).
6. **Transport is TLS in production.** Not enforced in the application; assumed at the
   infrastructure layer.

## 3. Controls in place

### Tenant isolation

`EnsureTeamMembership` resolves the team from the `current_team` or `team` route parameter
and aborts 403 unless the authenticated user has a membership row for it. It optionally
enforces a minimum role. It runs on the team-prefixed route group and on the team settings
routes.

Team slugs are permanently retired on delete (ADR-006), so a stale link can never resolve
to a different tenant.

`TeamPolicy` gates every team operation on a `TeamPermission`, never on a role string
(ADR-005).

### Authentication

Fortify with email verification, 2FA (TOTP + recovery codes) and passkeys. Rate limiters:

| Limiter         | Limit  | Keyed by                           |
| --------------- | ------ | ---------------------------------- |
| `login`         | 5/min  | lowercased username + IP           |
| `two-factor`    | 5/min  | pending login session ID           |
| `passkeys`      | 10/min | credential ID (or session ID) + IP |
| password update | 6/min  | route throttle                     |

The security settings page sits behind `RequirePassword`, so viewing or changing 2FA and
passkeys requires password re-confirmation within the session.

Production password policy: 12 characters, mixed case, letters, numbers, symbols, checked
against known-breach corpora. Deliberately disabled outside production so factories and
fixtures stay simple — this is an environment-conditional control and depends on
`APP_ENV` being correct in production.

### Data exposure

Sensitive user columns (`password`, `two_factor_secret`, `two_factor_recovery_codes`,
`remember_token`) are `#[Hidden]`. This matters because `HandleInertiaRequests` serialises
the whole user model into page props on every request.

Cookies are encrypted except `appearance` and `sidebar_state`, which hold no sensitive data.

`DB::prohibitDestructiveCommands()` is enabled in production, blocking `migrate:fresh` and
similar against a live database.

### Privilege boundaries

- Admins can update the team and manage invitations. They cannot change roles, remove
  members, or delete the team — so an Admin cannot escalate themselves or lock out the
  Owner.
  **Reversed by [ADR-028](DECISIONS.md), not yet implemented.** Admins will be able to add,
  remove and re-role members, and invite people — bounded to roles ranking **strictly below
  their own**, so an Admin still cannot touch another Admin or the Owner, cannot promote
  anyone to Admin or Owner, and cannot invite above Member. The reason for widening it is a
  security one: today only the Owner can revoke access, so if the Owner is unreachable, a
  departing employee keeps access to an organization holding administrative control of
  customer servers. The bounded widening is safer than the bus factor it replaces. Note the
  escalation path this must close is the _invited role_, not the invite action.
- Owner is excluded from `TeamRole::assignable()`, so ownership cannot be granted through
  the member-role UI.
- The team owner cannot be removed (`TeamMemberController::destroy`) and cannot leave
  (`TeamPolicy::leave`).
- Personal teams cannot be deleted or left, guaranteeing every user retains a tenant.
  **Changing under [ADR-025](DECISIONS.md):** the guarantee stays, enforced as "cannot leave or
  delete your last organization" plus an auto-create when the last membership is removed by
  someone else. Note that the current condition guards _two_ things at once — personal teams
  **and**, separately, the sole owner. Only the first is being replaced; deleting the clause
  outright would widen both permissions.
- Deleting a team requires typing its exact name (`DeleteTeamRequest`) — a confirmation
  control against destructive mis-clicks, not an authorisation control.

### Recovering an abandoned organization ([ADR-029](DECISIONS.md))

There is deliberately **no self-service takeover**. An organization whose Owner has disappeared
— left the company, unreachable, died — is recovered by an operator, following this procedure
every time rather than improvising it:

1. Verify the requester's identity out of band. Not by email alone, since a compromised mailbox
   is one of the scenarios this must survive.
2. Confirm the requester already holds **Admin** in that organization. A recovery never grants
   access to someone who did not already have it — it promotes, it does not admit.
3. Notify the current Owner's address that a transfer has been requested.
4. Wait. The notification is worthless without a window in which the Owner can object.
5. Perform the transfer, and record who did it, when, for which organization, and on what
   evidence.

Deciding this in advance is the point: the alternative is inventing it under pressure with a
customer waiting, which is exactly when steps 1 and 4 get skipped.

**Two honest limitations.** There is no operator function yet, so this describes an intended
process rather than an existing capability. And step 5 is a manual record — [G5](#4-known-gaps)
still applies, and an ownership change is precisely the event an audit log should hold.

### Invitations

64-character random code as the route key; email must match the authenticated user's,
case-insensitively; 3-day expiry; daily prune of expired rows; duplicate invitations and
invitations to existing members are rejected (`UniqueTeamInvitation`); cancelling an
invitation verifies it belongs to the team in the URL before the policy check.

## 4. Known gaps

Recorded honestly. None is currently being exploited; all are real.

| #   | Gap                                                                                | Impact                                                                                                                               | Tracked                                          |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| G1  | The entire agent, transport and server-credential model is undesigned              | The highest-consequence part of the platform has no security design at all                                                           | [Q2](OPEN_QUESTIONS.md)                          |
| G2  | No rate limit on invitation creation; email sent synchronously                     | Any Owner or Admin can trigger unbounded outbound email — abuse vector and deliverability risk                                       | [ADR-023](DECISIONS.md)                          |
| G3  | Nothing guarantees exactly one Owner per team, and ownership cannot be transferred | An abandoned team has no recovery path; ownerless teams are representable                                                            | [ADR-020](DECISIONS.md), [ADR-029](DECISIONS.md) |
| G4  | Team soft-delete hard-deletes memberships                                          | A restored team is ownerless and unreachable                                                                                         | [ADR-019](DECISIONS.md)                          |
| G5  | No audit log                                                                       | No record of who invited, removed, promoted or deleted what. Once servers exist, no record of who instructed a destructive operation | —                                                |
| G6  | Invitation codes are stored in plaintext                                           | Database read access yields usable invitation links. Mitigated by the email-match requirement (ADR-009), not eliminated              | —                                                |
| G8  | Production password policy is environment-conditional                              | If `APP_ENV` is ever wrong in production, the policy silently disappears                                                             | —                                                |
| G9  | Only the Owner can revoke a member's access                                        | If the Owner is unreachable, a departing employee retains access to customer infrastructure. Revocation has a bus factor of one      | [ADR-028](DECISIONS.md)                          |
| G10 | ~~The organization's name is in every URL~~                                        | **Closed 2026-08-17.** Replaced by a random `public_id`, so the URL reveals nothing about who the customer is                        | [ADR-027](DECISIONS.md)                          |

G5 deserves emphasis. An audit log is cheap to add now, while the only auditable events are
team membership changes, and expensive to retrofit once servers, sites and destructive
operations exist. It should be designed before the first server operation is built, not
after.

## 5. Rules for new work

Non-negotiable, and applied whether or not the task mentions security.

1. **Scope at the query, never after.** Tenant-owned resources are loaded through the team
   relationship (`$team->servers()->find($id)`), never loaded globally and then checked. A
   post-load check that anyone forgets is an isolation failure; a scoped query that anyone
   forgets is a 404.
2. **Every tenant-owned table carries `organization_id`.** `Client` (ADR-017), `Site` and
   everything under it hang off `Organization`, not off each other. Ownership is a column, not
   an inference across joins. (Named `team_id` until [ADR-025](DECISIONS.md) is executed —
   build new tables against the target name and rename the existing column in the same change.)
3. **Every tenant route lives inside the `EnsureOrganizationMembership` group.** No exceptions
   without an ADR. This applies with particular force while
   [ORGANIZATION_RENAME.md](ORGANIZATION_RENAME.md) phase 4 is moving routes between groups:
   verify with `php artisan route:list` that nothing landed outside it.
4. **Authorise on the server, every time.** Frontend permission booleans control display
   only. A policy check on the mutating request is mandatory even when the button is hidden.
5. **Never expose a secret through an Inertia prop.** Everything in `share()` and every
   `Inertia::render` payload reaches the browser. Server credentials, agent tokens and
   API keys never appear there.
6. **Encrypt credentials at rest.** Anything granting access to a customer server is
   encrypted in the database, and never logged.
7. **Non-sequential route keys for tenant resources**, for the same enumeration reasons the
   team slug is a slug and not an ID.
8. **New endpoints that send mail, cost money, or touch a customer server get a rate
   limiter**, decided deliberately rather than by omission.
9. **Every change states its security consideration**, even when the conclusion is "no
   particular risk". The value is in having looked.
10. **Test the negative case.** A feature is not covered because the happy path passes. The
    test that matters is the one proving another tenant gets a 403.

## 6. When to stop and ask

Do not decide these alone:

- Anything that changes tenant scoping or the shape of tenant ownership.
- Any trade-off between security and usability whose answer depends on a product choice not
  written down here.
- Anything touching agent identity, enrolment, credentials or the message bus — all of
  [Q2](OPEN_QUESTIONS.md).
- Any relaxation of an existing control, however small it looks.

State the options and a recommendation. Do not proceed on an assumption to save time.
