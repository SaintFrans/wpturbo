# ADR-002 — Authentication is delegated to Fortify, with overridden responses

**Reconstructed** · **Status**: Accepted

**Decision** — Laravel Fortify provides registration, login, password reset, email
verification, 2FA (TOTP + recovery codes) and passkeys. Response contracts are overridden in
`app/Http/Responses/` to redirect to the team-prefixed dashboard.

**Alternatives** — Hand-rolled authentication; Laravel Breeze/Jetstream; Fortify with
default redirects.

**Why** — Authentication is the highest-consequence, most attacked, most subtly wrong part
of any application. Fortify is maintained by the framework team, receives security fixes,
and already implements the hard parts — 2FA, recovery codes, WebAuthn, password confirmation
and rate limiting — correctly. Writing this by hand would be strictly worse in exchange for
nothing. The response overrides are necessary because Fortify's defaults do not know about
tenant-prefixed URLs (ADR-007).

**Consequences** — Auth features are configured, not written. Custom behaviour goes through
Fortify's action and response contracts rather than by editing flows. Production password
policy is enforced centrally in `AppServiceProvider` (12 characters, mixed case, numbers,
symbols, breach-checked), relaxed in local and test environments so fixtures stay simple.
