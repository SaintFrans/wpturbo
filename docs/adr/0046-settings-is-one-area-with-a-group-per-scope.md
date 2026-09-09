# ADR-046 — Settings is one area, with a sidebar group per scope

**2026-09-07** · **Status**: Accepted, **amends [ADR-016](0016-top-navigation-for-areas-contextual-navigation-for.md) and [ADR-042](0042-one-menu-bar-and-a-real-sidebar-for-resource-sections.md)**

**Decision** — There is one Settings destination. Its sidebar carries two groups: **Account**
(Profile, Security) first, then the **current organization** (General, Members, Audit log) below
it, labelled with the organization's own name.

- `SettingsLayout` replaces `AccountLayout` and `OrganizationSettingsLayout`. Both page prefixes —
  `settings/` and `organizations/settings/` — resolve to it in `app.tsx`.
- `SectionLayout` now takes `groups: NavGroup[]` instead of `items: NavItem[]`, and renders one
  `SidebarGroup` per group. A layout with a single group passes one; nothing else changes.
- **The account menu has one "Settings" row**, not "Settings" and "Account" side by side. It points
  at `/settings/profile`, the first section of the first group; the organization's sections are one
  click away in the sidebar it opens.
- **The two URL spaces are unchanged.** Personal settings stay at `/settings/…` and the
  organization's at `/org/{organization}/settings/…`, each keeping its own middleware. This is a
  navigation decision, not a routing one.
- The organization group is **omitted** when there is no current organization, rather than rendered
  with links whose handle cannot be built.

**Alternatives**

- **Keep the two menu rows.** "Settings" and "Account" are the same word twice for a reader who
  does not already know that one means the tenant and the other the person. The scopes are worth
  distinguishing; two top-level entries is an expensive way to do it, and the sidebar can say it
  with a group label instead.
- **Merge the URLs too — one `/settings/…` tree covering both.** That would put tenant-scoped pages
  outside the `/org/{organization}` prefix that ADR-031 exists to enforce, and would mean
  reintroducing "which organization is this?" as page state rather than URL state. Rejected: the
  navigation problem does not justify weakening the tenancy boundary in the URL.
- **Make Settings an area pill again.** Reversed twice already (ADR-016). A settings screen does
  not earn a permanent slot beside the resource-owning areas.
- **Label the second group "Organization".** Stable, but it does not say _which_ organization —
  and multi-organization membership is a first-class scenario (ADR-025). The name is the useful
  label; the group is dropped entirely when there is no organization to name.

**Why** — A person reading the account menu had to know the project's internal scoping to pick
between two rows. One destination with two labelled groups is the pattern every tool with both
scopes settles on, and the sidebar is where the distinction is cheap to draw: the group label sits
next to the sections it governs rather than competing with them for a menu row.

**Consequences**

- **The sidebar spans the tenancy boundary; nothing else does.** Every organization link is built
  from `currentOrganization` and every one of those routes still runs `EnsureOrganizationMembership`
  and its policy. The sidebar shows links, and a link is not an authorisation — the same rule that
  already applies to "Audit log", which every member can see and only Owners and Admins can open.
- Adding a section to either scope means adding it to the right group in `settings-layout.tsx`.
  A future third scope (billing under the organization, say) is a third group, not a third layout.
- `SectionLayout`'s single caller for a resource — a site, later — passes one group with the
  resource's name as its label, which is the shape this change generalises to.
- At rail width the group labels are hidden (shadcn's own behaviour), so the two groups are told
  apart only by the spacing between them. Accepted: the tooltips still name every item.
- `tests/Feature/ShellStructureTest.php` asserts both halves — one layout carrying both scopes, and
  one Settings row in the account menu.
