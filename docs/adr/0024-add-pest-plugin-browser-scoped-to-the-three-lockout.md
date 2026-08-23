# ADR-024 — Add `pest-plugin-browser`, scoped to the three lockout-risk auth flows

**2026-08-17** · **Status**: Accepted

**Decision** — Resolves [Q9](../OPEN_QUESTIONS.md). Add `pestphp/pest-plugin-browser` as a dev
dependency. Coverage is scoped to the three flows that can lock a user out of their own
account if silently broken: two-factor setup and challenge, passkey registration, and
password confirmation. This is not a general commitment to frontend/browser test coverage
for every UI primitive.

**Alternatives** — Add the plugin with broad coverage across every dialog and primitive;
defer the dependency decision entirely and rely on `tsc`, lint, the build, and manual
checking, as today.

**Why** — The React Aria migration (ADR-015) rewrote all three of these flows and was
verified by type-checking plus a manual look at the _unauthenticated_ pages — the
authenticated, highest-consequence flows were never exercised. `tsc`, lint and the Pest
backend suite all stay green if a dialog silently stops opening; only a real browser
assertion catches that. Scoping to three flows keeps the Playwright dependency and CI time
bounded while closing the actual risk, rather than taking on general UI-coverage debt as a
side effect.

**Consequences**

- `pestphp/pest-plugin-browser` and its Playwright browser binaries become a project
  dependency; CI needs to install/cache browsers.
- New tests live wherever this project's Pest browser tests are conventionally placed
  (`tests/Feature/` alongside the existing suite, or a `tests/Browser/` directory if one is
  introduced — follow whichever the first test establishes).
- Each test uses `visit()` with `actingAs()` and asserts both that the dialog/flow completes
  and that no JavaScript error was thrown.
- This does not retroactively mandate browser tests for every future dialog. Extending
  coverage beyond these three flows is a new decision, not implied by this one.
