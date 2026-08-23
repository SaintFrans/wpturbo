# ADR-021 — `app/` moves to domain folders

**2026-08-17** · **Status**: **Superseded by [ADR-026](0026-app-stays-type-first-with-a-domain-subfolder-inside.md)**

> Reversed the same day, before implementation. Nothing in this entry was built. Kept for the
> reasoning, which ADR-026 answers directly rather than ignores.

**Decision** — Resolves [Q3](../OPEN_QUESTIONS.md). `app/` moves from Laravel's type-first
layout (`Http/Controllers/Teams`, `Actions/Teams`, `Models`, `Policies`, …) to domain
folders: `app/Teams/`, `app/Sites/`, `app/Servers/`, each containing its own
`Http/Controllers`, `Actions`, `Models`, `Policies`, etc., plus a scoped `CLAUDE.md`.

**Alternatives** — Keep the Laravel-default type-first layout, matching what Boost and the
rest of the ecosystem's tooling assume.

**Why** — The team domain already spans seven type-first directories. Servers, Sites and
Clients arriving at once, on top of that, means every one of the domain's files scattered
across the same seven folders with nothing that represents "this is the Sites feature."
Deciding this before the first `Site` migration is a rename; deciding it after means moving
files that by then also have PHPStan baselines, tests and imports pointing at them.

**Consequences**

- New domains are created as `app/{Domain}/` from the start: `app/Sites/`, `app/Servers/`,
  `app/Clients/`.
- `app/Teams/` is restructured to match, moving today's `Http/Controllers/Teams`,
  `Actions/Teams`, the `Team`/`Membership`/`TeamInvitation` models, `TeamPolicy` and related
  rules into it. This touches import paths across the existing, tested team feature — do in
  one dedicated change, verified by the existing Pest suite, not folded into unrelated work.
- Framework-wide concerns that do not belong to one domain (base `Model`, shared
  `Concerns`, Fortify actions, Inertia middleware) stay where Laravel expects them.
- Scoped `CLAUDE.md` files live at `app/{Domain}/CLAUDE.md`, resolving the "no domain folder
  to host one yet" gap noted in ADR-010.
