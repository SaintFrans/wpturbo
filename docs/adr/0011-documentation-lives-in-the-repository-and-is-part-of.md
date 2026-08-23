# ADR-011 — Documentation lives in the repository and is part of the definition of done

**2026-08-15** · **Status**: Accepted

**Decision** — Architecture, data model, security posture, open questions and this log are
maintained as Markdown in the repository. Documentation is updated in the same change as
the code it describes, never deferred.

**Alternatives** — An external wiki or Notion space; documentation written at milestones;
no formal documentation, relying on the code.

**Why** — The platform is going to grow several large domains (servers, sites, agents,
monitoring, billing) on top of a foundation only partly designed. Documentation that lives
elsewhere goes stale invisibly and gets skipped under delivery pressure. In the repository
it is reviewed alongside the code and is available to whoever — or whatever — is working on
the codebase. Deferring documentation updates to "later" reliably means never; the cost of
a stale architecture document is worse than having none, because it invites trust it has
not earned.

**Consequences** — Every change that alters behaviour, data shape or security posture
updates the relevant documents in the same change. `CLAUDE.md` encodes this as a mandatory
step.
