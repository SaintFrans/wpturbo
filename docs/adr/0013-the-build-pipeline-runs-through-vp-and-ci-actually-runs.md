# ADR-013 — The build pipeline runs through `vp`, and CI actually runs

**2026-08-15** · **Status**: Accepted

**Decision** — `composer setup` and `composer ci:check` invoke `vp` instead of `npm`. The
GitHub Actions workflow uses `voidzero-dev/setup-vp` (Node 24, caching enabled) in place of
`actions/setup-node`. PHPStan is invoked with `--memory-limit=1G`.

**Alternatives** — Keep `npm` and drop the `devEngines` constraint; call `pnpm` directly and
leave `vp` for local use; drop the composer wrappers and document the raw commands.

**Why** — After ADR-012, both composer scripts failed immediately with `EBADDEVENGINES`,
because they called `npm` while `package.json` requires pnpm. The workflow inherited that
failure, pinned Node 22 against the Node 24 the migration installed, and never installed the
`vp` CLI at all — so CI could not have passed even once. `setup-vp` is the vendor-supported
path and collapses Node, package-manager and cache setup into a single step, which removes
three ways for the workflow to drift out of sync with local development.

Dropping `devEngines` instead would have "fixed" CI by allowing two package managers to
write the same lockfile — trading a loud failure for a quiet one.

**Consequences**

- `vp` must be present wherever `composer setup` or `composer ci:check` runs. In CI that is
  `setup-vp`; locally it is the developer's global install.
- The workflow pins `setup-vp` to a commit SHA with the release tag in a comment, matching
  the existing actions. Dependabot's `github-actions` ecosystem keeps it updated.
- **PHPStan must be run through `composer types:check`.** Calling `phpstan analyse` directly
  crashes at PHP's default 128M limit, and the error names the crash rather than the cause.
- Enabling `composer ci:check` exposed 16 test files that Pint had been failing on — the
  Pint step had never been reached, because `npm` failed first. Fixed with
  `vendor/bin/pint`: 15 files missing a trailing newline, and `AuthenticationTest.php` also
  needed unary-operator spacing. No test logic changed and all 90 tests still pass.
