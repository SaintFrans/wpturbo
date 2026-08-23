# ADR-033 — Invitation codes are stored hashed

**2026-08-18** · **Status**: Accepted, **implemented 2026-08-18**. Amends
[ADR-009](0009-the-invitation-code-alone-does-not-grant-access.md); closes
[G6](../SECURITY.md).

**Decision** — `organization_invitations.code` becomes `code_hash`, holding a SHA-256 digest of
the code. The plaintext exists only in the URL that goes out by email; the application looks an
invitation up by hashing the incoming value. "Resend" issues a **new** code and invalidates the
old one, because the old one can no longer be recovered.

**Alternatives** — Leave it in plaintext, relying on ADR-009's email match; encrypt reversibly so
support can still retrieve the link.

**Why** — An invitation code is an access credential, and [SECURITY.md](../SECURITY.md) §5 already
requires credentials to be encrypted at rest. Plaintext means a database read yields working
invitation links for every pending invitation at once. ADR-009's requirement that the invitee also
control the mailbox is a real second factor and it is why this is a gap rather than a hole — but
"mitigated" is not "closed", and this is a two-line change.

**Hashing rather than encrypting**, because reversible storage protects against a stolen database
dump and not against anything with application access, which is a materially weaker guarantee for
the same work. SHA-256 rather than bcrypt because the value must be _looked up_, not verified
against a known row, and 64 random characters have far more entropy than any password — the slow
hashing that protects weak secrets buys nothing here.

**Stated cost.** An invitation link can never be shown again — not in the UI, not by an operator
reading the database, not for support. Resending means issuing a new link and killing the old one.
That is stricter than today and, on reflection, the behaviour we would want anyway: a "resend"
that revives an old link leaves two valid credentials in two inboxes.

**Consequences**

- The route key is no longer a plain column. Binding resolves by hashing the incoming segment,
  so `getRouteKeyName()` cannot carry it alone.
- `UniqueOrganizationInvitation` and the prune job never touched the code to begin with — they
  match on `email`/`organization_id`/`accepted_at`/`expires_at` — so hashing changed nothing there.
- Any future invite-style token — server enrolment in [Q2](../OPEN_QUESTIONS.md) especially —
  follows this shape rather than inventing its own.
- Existing rows cannot be migrated, since the plaintext cannot be recovered from itself in a
  meaningful way. There is no production data; local databases are rebuilt.

**What implementation found that this entry did not anticipate.** Three routes were binding
`{invitation}` by the plain code column, and only one of them — the emailed link, resolved by
`FortifyServiceProvider` from the login/register query string — is actually reached by someone who
isn't authenticated yet. The other two, `invitations.accept`/`invitations.decline` (the dashboard's
"pending invitations" modal) and `organizations.invitations.destroy` (cancelling from the members
settings page), are only ever hit by an already-authenticated user, and their real authorisation
was always [ADR-009](0009-the-invitation-code-alone-does-not-grant-access.md)'s email-match
check or the organisation's own permission gate — never the code's secrecy. Hashing would have
forced the members page to keep exposing something usable as a lookup key regardless, which is the
exact exposure this ADR closes, had those two stayed code-bound. They now bind by `id`
(`{invitation:id}`) instead: no loss of security, since `ValidOrganizationInvitation` and
`cancelInvitation` are unmoved, and one fewer place capable of leaking a usable link. `code_hash`
now backs exactly one lookup — the genuinely pre-authentication one — which is the shape this
entry actually intended.
