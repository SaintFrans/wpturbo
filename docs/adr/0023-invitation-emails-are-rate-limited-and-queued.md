# ADR-023 — Invitation emails are rate-limited and queued

**2026-08-17** · **Status**: Accepted, **implemented 2026-08-18**. Closes [G2](../SECURITY.md).

**Decision** — Resolves [Q8](../OPEN_QUESTIONS.md). `TeamInvitationController::store` gets a
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

**What implementation found.** The notification already implemented `ShouldQueue` — it had from
the start, before this ADR was written down — so on-demand notifications queue automatically and
that half needed no code change at all. The only gap actually open was the rate limiter, added as
`RateLimiter::for('invitations', …)` in `FortifyServiceProvider`, 5/min keyed by the inviting
user's ID, applied to `organizations.invitations.store`. The production worker remains a deployment
task, tracked under [ADR-035](0035-laravel-cloud-is-the-deployment-target.md), not code.
