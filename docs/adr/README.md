# Decision log

Architecture decisions, one file per decision, newest first. Each entry records what was
decided, what was rejected, and why — the reasoning is the point, since the decision itself
is usually visible in the code.

**Add an entry whenever a change is hard to reverse, sets a precedent for later features,
or has a non-trivial security implication.** Not for routine work.

## Adding one

Create `docs/adr/NNNN-short-slug.md`, taking the next number in sequence. Numbers are never
reused, and an entry is never edited away: a decision that no longer holds gets
`Status: Superseded by ADR-nnn` or `Reversed`, and the replacement is a new file. Add a row
to the table below in the same change.

```
# ADR-nnn — Title
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

## Index

| ADR                                                                        | Decision                                                                                        | Date            | Status                                                                                    |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------- |
| [ADR-041](0041-pricing-scales-on-billable-sites-capabilities-are.md)       | Pricing scales on billable sites; capabilities are never gated                                  | 2026-08-22      | Accepted                                                                                  |
| [ADR-040](0040-sites-are-containers-on-customer-vps-instances-not.md)      | Sites are containers on customer VPS instances, not elastic cloud                               | 2026-08-22      | Accepted                                                                                  |
| [ADR-039](0039-hestri-sells-a-control-plane-never-infrastructure.md)       | Hestri sells a control plane, never infrastructure                                              | 2026-08-22      | Accepted                                                                                  |
| [ADR-038](0038-a-clients-route-key-is-a-short-random-public-id-not-a.md)   | A client's route key is a short random public id, not a handle                                  | 2026-08-20      | Accepted                                                                                  |
| [ADR-037](0037-every-member-sees-everything-in-their-organization.md)      | Every member sees everything in their organization; visibility is not scoped                    | 2026-08-18      | Accepted                                                                                  |
| [ADR-036](0036-retention-30-days-for-deleted-organizations-24-months.md)   | Retention: 30 days for deleted organizations, 24 months for audit entries                       | 2026-08-18      | Accepted                                                                                  |
| [ADR-035](0035-laravel-cloud-is-the-deployment-target.md)                  | Laravel Cloud is the deployment target                                                          | 2026-08-18      | Accepted                                                                                  |
| [ADR-034](0034-deleting-an-organization-soft-deletes-its-whole-tree.md)    | Deleting an organization soft-deletes its whole tree; restore is manual                         | 2026-08-18      | Accepted                                                                                  |
| [ADR-033](0033-invitation-codes-are-stored-hashed.md)                      | Invitation codes are stored hashed                                                              | 2026-08-18      | Accepted                                                                                  |
| [ADR-032](0032-an-append-only-audit-log-built-now-while-there-are.md)      | An append-only audit log, built now while there are five events                                 | 2026-08-18      | Accepted                                                                                  |
| [ADR-031](0031-tenant-routes-sit-behind-a-literal-org-segment.md)          | Tenant routes sit behind a literal `org/` segment                                               | 2026-08-17      | Accepted                                                                                  |
| [ADR-030](0030-the-tenant-url-identifier-is-a-name-seeded-separately.md)   | The tenant URL identifier is a name-seeded, separately editable handle                          | 2026-08-17      | Accepted                                                                                  |
| [ADR-029](0029-recovering-an-abandoned-organization-is-a-manual.md)        | Recovering an abandoned organization is a manual, documented procedure                          | 2026-08-17      | Accepted                                                                                  |
| [ADR-028](0028-admins-manage-members-below-their-own-role.md)              | Admins manage members below their own role                                                      | 2026-08-17      | Accepted                                                                                  |
| [ADR-027](0027-the-tenant-url-identifier-is-a-random-immutable-public.md)  | The tenant URL identifier is a random, immutable public ID                                      | 2026-08-17      | Superseded by [ADR-030](0030-the-tenant-url-identifier-is-a-name-seeded-separately.md)    |
| [ADR-026](0026-app-stays-type-first-with-a-domain-subfolder-inside.md)     | `app/` stays type-first, with a domain subfolder inside each type                               | 2026-08-17      | Accepted                                                                                  |
| [ADR-025](0025-team-becomes-organization-the-personal-team-is-removed.md)  | `Team` becomes `Organization`; the personal team is removed                                     | 2026-08-17      | Accepted                                                                                  |
| [ADR-024](0024-add-pest-plugin-browser-scoped-to-the-three-lockout.md)     | Add `pest-plugin-browser`, scoped to the three lockout-risk auth flows                          | 2026-08-17      | Accepted                                                                                  |
| [ADR-023](0023-invitation-emails-are-rate-limited-and-queued.md)           | Invitation emails are rate-limited and queued                                                   | 2026-08-17      | Accepted                                                                                  |
| [ADR-022](0022-tenant-resources-use-the-current-team-prefix-team.md)       | Tenant resources use the `/{current_team}/…` prefix; team administration stays at `/settings/…` | 2026-08-17      | Superseded by [ADR-025](0025-team-becomes-organization-the-personal-team-is-removed.md)   |
| [ADR-021](0021-app-moves-to-domain-folders.md)                             | `app/` moves to domain folders                                                                  | 2026-08-17      | Superseded by [ADR-026](0026-app-stays-type-first-with-a-domain-subfolder-inside.md)      |
| [ADR-020](0020-ownership-can-be-transferred-the-database-enforces.md)      | Ownership can be transferred; the database enforces exactly one Owner                           | 2026-08-17      | Accepted                                                                                  |
| [ADR-019](0019-resources-belong-directly-to-their-team-cross-team.md)      | Resources belong directly to their `Team`; cross-team sharing is deferred                       | 2026-08-17      | Accepted                                                                                  |
| [ADR-018](0018-the-hosted-resource-is-called-site-with-a-type-and.md)      | The hosted resource is called `Site`, with a `type` and optional child services                 | 2026-08-17      | Accepted                                                                                  |
| [ADR-017](0017-clients-are-a-grouping-entity-inside-a-team-not-a.md)       | Clients are a grouping entity inside a Team, not a second tenancy level                         | 2026-08-17      | Accepted                                                                                  |
| [ADR-016](0016-top-navigation-for-areas-contextual-navigation-for.md)      | Top navigation for areas, contextual navigation for resources                                   | 2026-08-15      | Accepted                                                                                  |
| [ADR-015](0015-shadcn-ui-runs-on-the-react-aria-base.md)                   | shadcn/ui runs on the React Aria base                                                           | 2026-08-15      | Accepted                                                                                  |
| [ADR-014](0014-vp-run-dev-runs-the-whole-stack-and-vite-is-registered.md)  | `vp run dev` runs the whole stack, and Vite is registered directly                              | 2026-08-15      | Accepted                                                                                  |
| [ADR-013](0013-the-build-pipeline-runs-through-vp-and-ci-actually-runs.md) | The build pipeline runs through `vp`, and CI actually runs                                      | 2026-08-15      | Accepted                                                                                  |
| [ADR-012](0012-the-frontend-toolchain-is-vite-vp-replacing-eslint-and.md)  | The frontend toolchain is Vite+ (`vp`), replacing ESLint and Prettier                           | 2026-08-15      | Accepted                                                                                  |
| [ADR-011](0011-documentation-lives-in-the-repository-and-is-part-of.md)    | Documentation lives in the repository and is part of the definition of done                     | 2026-08-15      | Accepted                                                                                  |
| [ADR-010](0010-project-guidance-is-appended-below-the-generated-boost.md)  | Project guidance is appended below the generated Boost block                                    | 2026-08-15      | Accepted                                                                                  |
| [ADR-009](0009-the-invitation-code-alone-does-not-grant-access.md)         | The invitation code alone does not grant access                                                 | _reconstructed_ | Accepted                                                                                  |
| [ADR-008](0008-team-names-are-validated-against-reserved-route.md)         | Team names are validated against reserved route prefixes                                        | _reconstructed_ | **Retired for good by [ADR-031](0031-tenant-routes-sit-behind-a-literal-org-segment.md)** |
| [ADR-007](0007-tenancy-is-scoped-by-team-slug-in-the-url-prefix.md)        | Tenancy is scoped by team slug in the URL prefix                                                | _reconstructed_ | Accepted                                                                                  |
| [ADR-006](0006-slug-uniqueness-includes-soft-deleted-teams.md)             | Slug uniqueness includes soft-deleted teams                                                     | _reconstructed_ | Accepted                                                                                  |
| [ADR-005](0005-permissions-are-an-enum-decoupled-from-roles.md)            | Permissions are an enum, decoupled from roles                                                   | _reconstructed_ | Accepted                                                                                  |
| [ADR-004](0004-every-user-gets-a-personal-team-at-registration.md)         | Every user gets a personal team at registration                                                 | _reconstructed_ | Superseded by [ADR-025](0025-team-becomes-organization-the-personal-team-is-removed.md)   |
| [ADR-003](0003-the-current-team-is-stored-on-the-user-record.md)           | The current team is stored on the user record                                                   | _reconstructed_ | Accepted                                                                                  |
| [ADR-002](0002-authentication-is-delegated-to-fortify-with-overridden.md)  | Authentication is delegated to Fortify, with overridden responses                               | _reconstructed_ | Accepted                                                                                  |
| [ADR-001](0001-inertia-react-monolith-rather-than-a-separate-api-and.md)   | Inertia + React monolith rather than a separate API and SPA                                     | _reconstructed_ | Accepted                                                                                  |
