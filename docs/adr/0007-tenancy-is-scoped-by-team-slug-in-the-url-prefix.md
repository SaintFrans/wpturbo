# ADR-007 — Tenancy is scoped by team slug in the URL prefix

**Reconstructed** · **Status**: Accepted, **amended by [ADR-030](0030-the-tenant-url-identifier-is-a-name-seeded-separately.md) and [ADR-031](0031-tenant-routes-sit-behind-a-literal-org-segment.md)**

> The prefix stays; two things about it changed. [ADR-030](0030-the-tenant-url-identifier-is-a-name-seeded-separately.md)
> restored a readable identifier — a `handle` seeded from the name, no longer regenerated on rename
> — so this entry's readability argument holds again. [ADR-031](0031-tenant-routes-sit-behind-a-literal-org-segment.md) then moved the tenant from
> the **first** path segment to the segment after a literal `org/`, which is what let ADR-008 be
> deleted outright. The property this entry actually depends on, that one URL resolves to exactly
> one tenant so a shared link never opens someone else's data, was never in question.
> The closing note about `/settings/teams/{team}` being an inconsistency to resolve is answered
> by [ADR-025](0025-team-becomes-organization-the-personal-team-is-removed.md).

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
