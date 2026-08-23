# ADR-012 — The frontend toolchain is Vite+ (`vp`), replacing ESLint and Prettier

**2026-08-15** · **Status**: Accepted

**Decision** — Migrated to Vite+ 0.2.9. `vp` is the entry point for install, dev, build,
lint, format and check. Oxlint replaces ESLint, Oxfmt replaces Prettier, and both are
configured through `lint` and `fmt` keys inside `vite.config.ts` rather than separate
dotfiles. A pre-commit hook runs `vp check --fix` over staged files. `baseUrl` was removed
from `tsconfig.json` so type-aware linting could be enabled.

**Alternatives** — Stay on Vite with ESLint and Prettier; adopt Biome; keep ESLint and swap
only the formatter.

**Why** — One toolchain with one config surface instead of four tools with four configs, and
Oxlint and Oxfmt are substantially faster than what they replace. The migration was
automated: `@oxlint/migrate` converted the ESLint rules, the Prettier config was translated,
and `@andrewbranch/ts5to6` removed the deprecated `baseUrl`. Removing `baseUrl` was needed
regardless — it is deprecated in TypeScript 6 and removed in 7 — and unlocked type-aware
lint rules as a side benefit.

The pre-commit hook is the part that matters most for this project. Checks that only run in
CI are checks that get discovered late; running them on staged files means formatting and
lint drift never reaches review. That is worth more here than raw speed, given the tree
currently has no version control to fall back on at all.

**Consequences**

- `eslint.config.js`, `.prettierrc` and `.prettierignore` are gone. Do not recreate them —
  edit the `lint` and `fmt` keys in `vite.config.ts`.
- `vite.config.ts` grew to roughly 1400 lines, mostly a generated browser-globals map. The
  Vite plugin array is wrapped in `lazyPlugins()` so lint and format commands do not
  instantiate the Laravel, Inertia, React, Tailwind and Wayfinder plugins. New plugins go
  inside that callback.
- **Do not reintroduce `baseUrl`.** It silently disables type-aware linting.
- Type-aware linting surfaced four pre-existing warnings ESLint did not catch (three
  floating promises, one useless default parameter). All four are now fixed.
- `CLAUDE.md` and `AGENTS.md` now carry a second generated block, `<!--VITE PLUS START-->`
  to `<!--VITE PLUS END-->`, at the bottom. Project guidance sits between the two generated
  blocks.
- The build pipeline was repointed at `vp` — see ADR-013.
