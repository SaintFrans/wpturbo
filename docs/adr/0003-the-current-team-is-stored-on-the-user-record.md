# ADR-003 — The current team is stored on the user record

**Reconstructed** · **Status**: Accepted, **amended by [ADR-025](0025-team-becomes-organization-the-personal-team-is-removed.md)**

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
