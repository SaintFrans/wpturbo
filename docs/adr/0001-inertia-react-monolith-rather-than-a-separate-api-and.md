# ADR-001 — Inertia + React monolith rather than a separate API and SPA

**Reconstructed** · **Status**: Accepted

**Decision** — One Laravel application rendering React pages through Inertia, with Wayfinder
generating typed TypeScript callers for controllers and named routes.

**Alternatives** — A JSON API plus a standalone SPA; server-rendered Blade with Livewire.

**Why** — Inertia gives an SPA experience while keeping authorisation, validation and
routing in one place on the server. A separate API would mean maintaining two deployables,
duplicating the authorisation model at the API boundary, and — most relevant here — creating
a second, independently-reachable surface where tenant scoping could be got wrong. One
enforcement point for tenant isolation is worth a great deal on a platform whose core
promise is that one customer never sees another's servers. Wayfinder closes the remaining
gap, so route changes surface as TypeScript errors rather than runtime 404s.

**Consequences** — No public API exists, and adding one later means designing tenant
scoping for it deliberately rather than inheriting it. `resources/js/actions/` and
`resources/js/routes/` are generated and must never be hand-edited. PHP DTOs in `app/Data/`
and their TypeScript counterparts in `resources/js/types/` are paired by hand and must be
changed together.
