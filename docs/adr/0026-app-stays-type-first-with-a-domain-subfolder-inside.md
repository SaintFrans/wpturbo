# ADR-026 — `app/` stays type-first, with a domain subfolder inside each type

**2026-08-17** · **Status**: Accepted. **Supersedes ADR-021**

**Decision** — Reverses [ADR-021](0021-app-moves-to-domain-folders.md). `app/` keeps Laravel's
type-first layout (`app/Models`, `app/Policies`, `app/Actions`, `app/Http/Controllers`, …).
Inside each type folder, files are grouped into a subfolder per domain:
`app/Models/Organizations/`, `app/Policies/Organizations/`, later `app/Actions/Sites/`,
`app/Models/Servers/`. Files that belong to no single domain — `User`, `Providers`,
`Console`, Fortify actions, Inertia middleware, shared validation-rule traits — stay flat in
their type folder.

The subfolder is applied consistently from the start, including where a type currently holds
only one file for that domain.

**Alternatives** — Domain-first folders (`app/Organizations/Http/Controllers/…`), which is
what ADR-021 decided; leaving the current half-applied state, where controllers, requests,
actions and notifications have a `Teams/` subfolder but models, policies, rules, data and
enums are flat.

**Why** — ADR-021's argument — that nothing in a type-first tree represents "this is the Sites
feature" — is a scaling argument, and the tree is not at that scale. Counted on 2026-08-17:

| Folder                              | Files |
| ----------------------------------- | ----- |
| `app/Http/Requests`                 | 9     |
| `app/Http/Controllers`              | 7     |
| `app/Models`, `app/Concerns`        | 4     |
| `app/Actions`, `app/Rules`          | 3     |
| `app/Data`, `app/Enums`             | 2     |
| `app/Policies`, `app/Notifications` | 1     |

Thirty-six files. Against that, domain-first costs friction with everything the ecosystem
assumes: `make:` command defaults, Larastan, the Boost guidelines' "stick to existing
directory structure", and every developer or tool that expects `app/Models`. Half of this
decision's shape is also already in the tree (`Http/Controllers/Teams`, `Http/Requests/Teams`,
`Actions/Teams`, `Notifications/Teams`), so this is completing an existing pattern rather
than introducing one.

Applying the subfolder even to single-file types looks like ceremony today and is deliberate:
`Servers`, `Sites` and `Clients` land within weeks, and the alternative is moving the same
files a second time.

**Policy auto-discovery was checked and is not a factor.** Laravel 13 resolves a policy by
substituting `Policies\` for `Models\` in the model's namespace, so both
`App\Policies\Organizations\OrganizationPolicy` (this decision) and
`App\Organizations\Policies\OrganizationPolicy` (ADR-021) are discovered without explicit
registration. Recorded so nobody re-derives it as an argument either way.

**Consequences**

- New domains add a subfolder inside each relevant type folder, not a new top-level folder.
- ADR-010's note about "no domain folder to host a scoped `CLAUDE.md` yet" is resolved
  differently than ADR-021 planned: scoped guidance stays path-based
  (`app/Http/Controllers/Organizations/CLAUDE.md`), following whatever directory the guidance
  actually concerns.
- This is reversible. Moving from type-first-with-subfolders to domain-first later is a
  mechanical relocation, which is part of why the cheaper option is correct now.
- Revisit if a single domain's file count makes its slice of the tree hard to hold in one
  view — roughly, when one domain owns more files than the whole of `app/` does today.
