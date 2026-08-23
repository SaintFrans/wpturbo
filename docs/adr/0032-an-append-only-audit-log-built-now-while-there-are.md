# ADR-032 — An append-only audit log, built now while there are five events

**2026-08-18** · **Status**: Accepted, **implemented 2026-08-18**. Closes [G5](../SECURITY.md).

**Decision** — One append-only table records who did what, to whom, in which organization, when
and from where. It is populated now with membership events — invite, cancel invitation, accept,
remove member, change role, delete organization, transfer ownership — and its shape is chosen for
the server operations that will follow. Owners and Admins can read their own organization's log;
nobody can edit or delete an entry through the application.

**Alternatives** — Design the shape now and build later; log only membership changes without
regard for what comes next; adopt an activity-log package; do nothing yet.

**Why the timing rather than the feature.** Nobody argues against an audit log; the question is
when. Right now there are five auditable actions and adding the log means touching five call
sites. Once servers exist there are dozens, each destructive, and retrofitting means finding every
one of them — with no way to tell which were missed, because a missing audit entry looks exactly
like an action that never happened.

[ADR-028](0028-admins-manage-members-below-their-own-role.md) made this sharper: membership
changes are no longer the Owner's exclusive act, so "who removed this person" now has more than
one possible answer and no record. [ADR-029](0029-recovering-an-abandoned-organization-is-a-manual.md)
step 5 already assumes a record exists.

**A package was rejected** because this is not a debugging aid. It is tenant-scoped data with an
authorisation story, shown to customers, that must survive the deletion of the things it describes
— a general-purpose activity log built around polymorphic relations to live records is the wrong
shape for "this organization was deleted".

**NIS2 changed why this is built, after it was decided.** It was accepted as a product and
hygiene decision. It has since been established that the Cyberbeveiligingswet applies to this
platform, which makes reconstructing an incident an obligation with a 24-hour clock on it rather
than a nice-to-have. The design does not change; the priority and the retention period do — see
[ADR-036](0036-retention-30-days-for-deleted-organizations-24-months.md).

**Consequences**

- Entries carry `organization_id` and are read through the organization relationship, like every
  other tenant-owned resource ([SECURITY.md](../SECURITY.md) §5 rule 1).
- **Owners and Admins read their own organization's log in the UI**, and the same table serves
  internal incident and support work. One record, two audiences — which is why entries name what
  was done rather than dumping payloads.
- **Append-only is a convention, not a database guarantee.** The model exposes no update or delete
  path and nothing in the application writes one; enforcing it properly needs database privileges
  or triggers, which is a deployment concern and out of scope here. Stated so nobody reads more
  assurance into it than exists.
- **An organization's entries outlive the organization.** Deleting a tenant must not delete the
  record of who deleted it, which means these rows are not part of ADR-034's soft-delete tree and
  the foreign key must tolerate a soft-deleted parent.
- The actor may be null: operator actions under ADR-029, and later the agent, are not users.
  Every renderer must handle that.
- Entries record what was done, never the contents of what was done. Server credentials, agent
  tokens and invitation codes never reach this table.
- **Retention is 24 months**, driven by NIS2 rather than by preference — see [ADR-036](0036-retention-30-days-for-deleted-organizations-24-months.md).

**What implementation found.**

1. **"Tolerate a soft-deleted parent" turned out to understate it.** `organization_id` and
   `target_id` carry no foreign key constraint at all, not merely one relaxed for soft deletes.
   ADR-036's eventual hard purge means the organization row itself may one day be gone while its
   entries live on for up to 24 months more, and the target (an invitation, a membership) is
   routinely already force-deleted in the _same request_ that writes the entry describing it — an
   invitation is gone the instant it is cancelled. A constrained key would have to choose between
   blocking that delete and cascading it away, and both are wrong. `target_label` is a snapshot
   taken at write time for the same reason: the target usually cannot be resolved by the time
   anyone reads this.
2. **Two events joined the list this entry did not name.** A member leaving voluntarily
   (`OrganizationController::leave`) and an invitee declining
   (`OrganizationInvitationController::decline`) are membership events in exactly the sense the
   decision already cared about — leaving them out would have meant every Admin-initiated removal
   was recorded and every self-initiated departure was not. Added as `member.left` and
   `invitation.declined`.
3. **Reading the log needed its own permission.** `OrganizationPermission::ViewAuditLog`, granted
   to Owner and Admin, checked in a new `OrganizationPolicy::viewAuditLog()`. This is the one
   deliberate exception to [ADR-037](0037-every-member-sees-everything-in-their-organization.md)'s
   "every member sees everything": the audit log is a record of administrative and destructive
   action, not a resource members need to see to do their job, and ADR-032 already said Owners and
   Admins specifically, not every member.
4. **The Settings nav tab is not permission-gated**, unlike the page itself. `OrganizationSettingsLayout`
   receives only `children` from `app.tsx`, not page props, and every sibling tab (`Members`) is
   already shown unconditionally to every member. Threading `permissions` into that layout for one
   tab was judged not worth a new pattern; a Member who follows the link gets the same 403 the
   policy already produces. Recorded as an accepted rough edge, not silently decided.
