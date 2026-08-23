# ADR-004 — Every user gets a personal team at registration

**Reconstructed** · **Status**: **Superseded by [ADR-025](0025-team-becomes-organization-the-personal-team-is-removed.md)**

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
see [OPEN_QUESTIONS.md](../OPEN_QUESTIONS.md).
