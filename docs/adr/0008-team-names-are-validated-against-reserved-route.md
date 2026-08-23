# ADR-008 — Team names are validated against reserved route prefixes

**Reconstructed** · **Status**: **Retired for good by [ADR-031](0031-tenant-routes-sit-behind-a-literal-org-segment.md)**

> Twice reversed, now settled. ADR-027 retired this rule on a mistaken premise; ADR-030 revived it
> against the **handle** rather than the name, which was the field it always should have guarded.
> ADR-031 then removed the need for it altogether by putting every tenant route behind a literal
> `org/` segment — a handle can no longer shadow a route, so there is nothing to reserve. The list
> is deleted rather than relocated. Reintroduce it only if tenant handles ever return to the first
> URL segment.

**Decision** — `App\Rules\TeamName` rejects any name whose slug collides with an existing
first-segment route prefix, plus a static list of reserved words (`admin`, `api`, `billing`,
`settings`, HTTP status codes, and so on). Applied on both create and rename.

**Alternatives** — Namespace tenant URLs under a fixed prefix such as `/t/{team}/…`; allow
any name and resolve conflicts by route ordering.

**Why** — Tenant slugs occupy the first URL segment (ADR-007), so a team named "settings"
would shadow the application's own routes. Relying on route registration order to resolve
that is fragile — it breaks the moment routes are reordered, and the failure is a
cross-tenant routing bug rather than an error. The static list additionally reserves words
we are likely to want later, so a future `/billing` route does not have to be abandoned
because a customer already claimed the name.

**Consequences** — This rule is load-bearing and must keep running on create and rename.
Adding a new top-level route means checking that no existing team already holds that slug.
