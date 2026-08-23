# ADR-010 — Project guidance is appended below the generated Boost block

**2026-08-15** · **Status**: Accepted

**Decision** — `CLAUDE.md` and `AGENTS.md` keep the machine-generated
`<laravel-boost-guidelines>` block untouched at the top. All project-specific guidance is
appended strictly below its closing tag. Scoped guidance sits in `app/CLAUDE.md`,
`app/Http/Controllers/Teams/CLAUDE.md` and `resources/js/CLAUDE.md`.

**Alternatives** — Replace the generated block with hand-written content; keep project
guidance only in `docs/`.

**Why** — `composer update` runs `boost:update`, which rewrites the block between those
tags. Anything written inside it is destroyed without warning. Appending below the closing
tag survives regeneration.

**Consequences** — Never edit inside `<laravel-boost-guidelines>`. Since `app/` is organised
by Laravel type rather than by domain, there is no domain folder to host a scoped file yet;
that lands when ADR-open (domain folder structure) is settled.
