# ADR-006 — Slug uniqueness includes soft-deleted teams

**Reconstructed** · **Status**: Accepted, **extended by [ADR-030](0030-the-tenant-url-identifier-is-a-name-seeded-separately.md)**

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
