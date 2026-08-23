# ADR-035 — Laravel Cloud is the deployment target

**2026-08-18** · **Status**: Accepted. Closes the production requirement
[ADR-023](0023-invitation-emails-are-rate-limited-and-queued.md) left open.

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
[SECURITY.md](../SECURITY.md) §1, which already places a malicious platform operator out of scope,
but it widens who "operator" means.

**Consequences**

- ADR-023 becomes fully implementable: rate limiter, `ShouldQueue` on the invitation
  notification, and a worker that exists.
- The scheduled invitation prune in `routes/console.php` gets a real scheduler.
- **This does not decide where NATS runs.** [Q2](../OPEN_QUESTIONS.md) must still settle the
  transport, and "the control plane is on Laravel Cloud" is an input to that question, not an
  answer to it. Agents connect outbound to something, and what that something is remains open.
- Environment configuration moves to Cloud, which makes [G8](../SECURITY.md) — a password policy
  keyed on `APP_ENV` — both easier to get right and easier to get wrong from a dashboard.
