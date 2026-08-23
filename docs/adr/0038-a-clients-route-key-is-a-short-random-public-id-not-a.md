# ADR-038 — A client's route key is a short random public id, not a handle

**2026-08-20** · **Status**: Accepted. Narrows [ADR-030](0030-the-tenant-url-identifier-is-a-name-seeded-separately.md)
for resources below the tenant segment.

**Decision** — `Client` is addressed by `clients.public_id`: five characters drawn at random from
a 30-character alphabet, assigned once on create, never regenerated, never reissued while any row
— soft-deleted included — still holds it. There is no `client_handles` history table, and no
reserved-word list. The trait is `App\Concerns\GeneratesPublicId`, flat in `Concerns/` because it
belongs to no one domain.

Alongside it, three permissions: `client:create` and `client:update` for every role including
Member, `client:delete` for Owner and Admin only.

**Alternatives** — A name-seeded handle plus a `client_handles` table, mirroring `Organization`
exactly, which is what ADR-030's closing line suggests. The row id itself, which is what was
originally asked for. A ULID.

**Why not the row id.** It was requested, and it is the one option that is actually cheaper. It
was rejected because a sequential key in a URL publishes the platform's own scale: `/clients/4711`
tells any customer roughly how many clients every agency on the platform has between them, and
makes the growth rate readable by watching the number climb. The id is not an authorisation factor
in either design — reads go through `$organization->clients()`, so guessing one buys nothing — so
this is about what the number _says_, not what it _opens_. Five random characters cost one loop and
say nothing.

**Why not a handle with a history table.** ADR-030's history table exists to stop a released handle
being re-claimed by a _different tenant_, because the organization handle is the tenant segment of
the URL: a stale bookmark would then resolve to another agency's data. A client id sits **inside**
`/org/{organization}/`, which the membership middleware has already guarded by the time the id is
read. The worst a reissued client id can do is resolve to a different client of the same
organization — visible to that organization anyway (ADR-037), and not a cross-tenant leak. A table
and a write on every save is a poor price for that. Checking soft-deleted rows, which is nearly
free, closes the same door well enough here.

**Why the id is not readable.** A handle earns its cost where a human types or recognises the URL —
which is true of the tenant segment and not of a client. Nobody navigates to a client by guessing
its slug; they arrive from the list. Skipping the slug also skips the collision suffix, the
reserved-word list and the second editable field, none of which would have paid for themselves.

**Why Members may create and edit clients.** This is the first capability any Member holds. A
client is an organisational label, and the administrator-only alternative means the person doing
the work asks someone else to type a customer's name — friction with no safety return, since a
wrong client name is corrected by editing it. Deleting is different: it regroups everything tagged
to that client, so it stays with Owner and Admin, which is also the shape ADR-037 predicted
(`client:delete` as a permission, not a visibility rule).

**Consequences**

- **[SECURITY.md](../SECURITY.md) §5 rule 7 now names two schemes**, with the criterion between them:
  `GeneratesHandle` for anything occupying the tenant segment, `GeneratesPublicId` for resources
  below it. Inventing a _third_ is still out.
- `Site`, `Server` and `Domain` should take `GeneratesPublicId` unless someone shows a case for a
  readable, editable key. That reverses ADR-030's closing suggestion for those three; the
  reasoning above applies to them unchanged.
- **`clients` is soft-deleted, but deleting one client force-deletes it.** The soft delete exists
  for the organization's own deletion, which takes the whole tree down together so a restore is
  coherent (ADR-019, ADR-034). `OrganizationController::destroy` gained
  `$organization->clients()->delete()`; `ClientController::destroy` calls `forceDelete()`.
- **Three audit actions** — `client.created`, `client.updated`, `client.deleted` — recorded from
  the first commit rather than retrofitted, which is the whole argument of ADR-032.
- **No rate limiter on client creation**, deliberately: it sends no mail, costs no money and
  touches no customer server, which are the three triggers in §5 rule 8. A member could create
  clients in bulk; the blast radius is rows in one tenant's own table. Revisit if it becomes a
  support problem.
- **A client is `name` + `contact_email` + optional `contact_phone`.** Both of the first two are
  required: a client nothing can reach is a record nothing can act on, and every later feature that
  mails one would carry the gap. `contact_email` is validated for shape, **not** for uniqueness —
  two clients of one agency can share a contact person, so a unique index would be wrong rather
  than merely strict. There is deliberately no separate contact-person name: a client is as often a
  person as a company, and a second name field made every record ask which of the two it was.
- Route binding uses `scopeBindings()`, so `{client}` resolves through the organization's own
  relation. A client belonging to another tenant is a 404 at the router, not something a controller
  method has to remember.
