# ADR-031 — Tenant routes sit behind a literal `org/` segment

**2026-08-17** · **Status**: Accepted. Amends
[ADR-007](0007-tenancy-is-scoped-by-team-slug-in-the-url-prefix.md); **retires
[ADR-008](0008-team-names-are-validated-against-reserved-route.md) for good**;
completes [ADR-025](0025-team-becomes-organization-the-personal-team-is-removed.md)'s
simplification of [ADR-022](0022-tenant-resources-use-the-current-team-prefix-team.md).

**Decision** — Everything belonging to one organization moves from `/{handle}/…` to
`/org/{handle}/…`, matching Laravel Forge. Listing and creating organizations sits at `/org`.
`/settings/…` is now exclusively personal — profile, security, appearance — and organization
administration lives at `/org/{handle}/settings`.

There is one route parameter, `{organization}`, everywhere. `{current_organization}` is gone.

**Alternatives** — Keep the handle in the first segment and keep the reserved-word list; use a
shorter marker such as `/o/`; put organizations under `/organizations/{handle}`.

**Why — this is a security simplification, not a cosmetic one.** With the handle in the first
segment, a handle could shadow an application route, which is the entire reason ADR-008 existed.
[SECURITY.md](../SECURITY.md) described that rule as load-bearing: it _must keep running_ on create
and rename, or the failure is a cross-tenant routing bug rather than an error. A control that
must not be forgotten is strictly worse than a condition that cannot arise, and
[SECURITY.md](../SECURITY.md) §0 says to buy the safer option even when it costs more. Here it costs
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
