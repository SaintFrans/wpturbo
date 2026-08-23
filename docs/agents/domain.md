# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring
the codebase. This repo is **single-context**: one domain, no per-package contexts.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root — the glossary. Read it first; it is short by design.
- **`docs/adr/`** — one file per decision, plus a `README.md` carrying the format and a
  full index. Read the ADRs that touch the area you're about to work in; the index tells you
  which those are without opening all 41.
- **`docs/OPEN_QUESTIONS.md`** — always check. If your task touches an open question, stop
  and ask rather than deciding.
- **`CLAUDE.md`** at the repo root — the project guidance, including the working method
  every task follows. `AGENTS.md` is kept byte-identical to it: read either, edit both.

Supporting documents, read when relevant: `docs/ARCHITECTURE.md` (structure, routing,
tenancy, the frontend/backend seam), `docs/DATA_MODEL.md` (models, migrations, DTOs),
`docs/BUSINESS_MODEL.md` (`Server`, `Site`, pricing, anything billable),
`docs/SECURITY.md` (every task — §5 applies whether or not the task mentions security).
Scoped guidance lives in nested `CLAUDE.md` files under `app/` and `resources/js/`.

If a file doesn't exist, **proceed silently**. Don't flag its absence and don't suggest
creating it upfront.

## File structure

```
/
├── CONTEXT.md         ← the glossary
├── CLAUDE.md          ← project guidance (AGENTS.md is identical)
├── docs/
│   ├── adr/
│   │   ├── README.md  ← format, caveats, index
│   │   ├── 0001-inertia-react-monolith-rather-than-a-separate-api-and.md
│   │   └── …
│   ├── OPEN_QUESTIONS.md
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── BUSINESS_MODEL.md
│   └── SECURITY.md
└── app/, resources/js/ ← each with a scoped CLAUDE.md
```

## Writing a new ADR

`docs/adr/NNNN-short-slug.md`, next number in sequence, following the format in
`docs/adr/README.md`. Numbers are never reused and entries are never edited away: a decision
that no longer holds gets `Superseded by ADR-nnn` and the replacement is a new file. Add the
row to the index in the same change.

## Use the glossary's vocabulary

When your output names a domain concept (an issue title, a refactor proposal, a hypothesis,
a test name), use the term as `CONTEXT.md` defines it. Don't drift to synonyms it explicitly
retires — `Team`, `personal team`, `slug`, "website" for `Site`, or a bare "customer" where
`Organization` or `Client` is meant.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing
language the project doesn't use (reconsider) or there's a real gap (note it for
`/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently
overriding:

> _Contradicts ADR-037 (every member sees everything in their organization), but worth
> reopening because…_

`CLAUDE.md` names ADR-025 through ADR-031, ADR-037 and ADR-038 as settled and asks you not
to re-litigate them. Raise one again only if new information genuinely contradicts it.
