# ADR-036 — Retention: 30 days for deleted organizations, 24 months for audit entries

**2026-08-18** · **Status**: Accepted. Resolves Q14; completes
[ADR-032](0032-an-append-only-audit-log-built-now-while-there-are.md) and
[ADR-034](0034-deleting-an-organization-soft-deletes-its-whole-tree.md).

**Decision** — Four retention rules, each with a different reason:

| Data                                                               | Kept          | Then                             |
| ------------------------------------------------------------------ | ------------- | -------------------------------- |
| Soft-deleted organizations, with their memberships and invitations | 30 days       | Hard-deleted by a scheduled task |
| Audit entries                                                      | 24 months     | Deleted                          |
| `organization_handles`                                             | Indefinitely  | Never removed                    |
| Invoices and payment records                                       | Not held here | Stripe's problem                 |

**Alternatives** — Keep everything indefinitely, which is what the code does today; 12 months for
audit entries with the personal fields pseudonymised afterwards, which was the recommendation
before NIS2 turned out to apply.

**Why there is a number at all.** There is no statutory maximum. The GDPR sets a principle rather
than a period — data may be kept only as long as it is necessary for the purpose it was collected
for, and the controller has to determine and justify that themselves. So the obligation is not to
stay under a limit; it is to have an answer. This is that answer.

**30 days for deleted organizations**, because soft-delete is a recovery window and not an
archive. [ADR-034](0034-deleting-an-organization-soft-deletes-its-whole-tree.md)
makes restore an operator procedure; 30 days is longer than anyone takes to notice they deleted
the wrong thing, and short enough to defend as data minimisation. Note what is being kept in the
meantime: the organization's name, its handle history, its memberships, and the email address of
everyone ever invited.

**24 months for audit entries.** Twelve was the first recommendation, on the reasoning that
incidents surface within months. Two years was chosen instead because an incident found late is
exactly the case where a log matters, and because the Cyberbeveiligingswet — which took effect on
15 August 2026 and names managed service providers explicitly — may well apply here. **Whether it
does is unsettled** and is parked (see [SECURITY.md](../SECURITY.md) §1): this platform manages
servers its customers own rather than supplying its own, and that distinction may matter.

The period does not depend on the answer. Two years is defensible on its own, and if the
obligation turns out not to apply, nothing here needs revisiting.

**Pseudonymising instead of deleting was rejected.** Under NIS2 the useful question in an incident
is _who_, so stripping the actor is exactly the wrong reduction. Over a 24-month window the
complexity buys little, and a clean delete is easier to prove than a partial scrub.

**Handles are never removed** because they hold no personal data and are the only thing preventing
a stale link resolving to a different tenant ([ADR-006](0006-slug-uniqueness-includes-soft-deleted-teams.md)).

**Consequences**

- A scheduled task hard-deletes organizations soft-deleted more than 30 days ago, and audit
  entries older than 24 months. Neither exists yet; `routes/console.php` currently prunes only
  expired invitations.
- **Audit entries survive the organization's purge.** They are not part of the tree ADR-034
  deletes, so the record of a deletion outlives the deleted thing by up to 24 months.
- **The 30-day rule assumes no financial records live here.** Billing runs through Stripe, which
  holds what the seven-year fiscal retention obligation covers. If invoice data is ever stored in
  this application, this ADR is wrong and the purge needs an exception before that data arrives —
  not after.
- These periods are a choice, not a legal maximum, so they must appear in whatever privacy
  statement and processor agreement the first customer gets. There are no customers yet; the
  numbers are recorded here so the agreement can be written against something.
- **This ADR covers retention only**, and deliberately does not resolve whether NIS2 applies.
  Its other obligations are organisational, parked, and addressed by no decision in this log.
