# ADR-022 — Tenant resources use the `/{current_team}/…` prefix; team administration stays at `/settings/…`

**2026-08-17** · **Status**: **Superseded by [ADR-025](0025-team-becomes-organization-the-personal-team-is-removed.md) and [ADR-031](0031-tenant-routes-sit-behind-a-literal-org-segment.md)**

> The prefix rule for tenant resources stands. The split does not: organization administration
> — general settings, members, invitations — moves _inside_ the prefix, at
> `/{current_organization}/settings/…`. `/settings/…` becomes purely personal. The
> "does the tenant _have_ it, or does the user _configure_ it" test is therefore no longer
> needed and should not be applied to new features. The only route that stays outside the
> prefix is the organization list-and-create page, which belongs to no single tenant.

**Decision** — Resolves [Q4](../OPEN_QUESTIONS.md). The two coexisting route shapes are both
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
