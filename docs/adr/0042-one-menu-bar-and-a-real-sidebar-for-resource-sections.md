# ADR-042 — One menu bar, and a real sidebar for resource sections

**2026-09-07** · **Status**: Accepted, **amends [ADR-016](0016-top-navigation-for-areas-contextual-navigation-for.md)**, **amended by [ADR-046](0046-settings-is-one-area-with-a-group-per-scope.md)**

> **The section sidebar takes groups, not a flat list ([ADR-046](0046-settings-is-one-area-with-a-group-per-scope.md), same day).**
> `SectionLayout`'s prop is `groups: NavGroup[]`, one `SidebarGroup` each, so one sidebar can carry
> more than one scope: Settings holds the person's sections and the organization's, and the two
> layouts named below are one `SettingsLayout`.

> **Amended the same day: the shell is shadcn's `sidebar-16` block, verbatim as a starting point.**
> The structure below was rebuilt against it rather than approximated: a wrapper declaring
> `[--header-height:calc(--spacing(14))]`, `SidebarProvider className="flex flex-col"`, the header,
> then `<div className="flex flex-1">` holding the sidebar and its inset. The sidebar carries the
> block's own `top-(--header-height) h-[calc(100svh-var(--header-height))]!`, and **the collapse
> toggle sits first in the header** followed by a vertical separator, which is where the block puts
> it — so the collapse animation, the persisted `sidebar_state` cookie and the mobile sheet are all
> the component's behaviour, unmodified.
>
> Two consequences. `--app-header-height` is gone: the token lives on the shell wrapper, as the
> block declares it, and `app.css` no longer carries a layout measurement. And **the header, the
> sidebar and the content are one surface** — `--sidebar` is now `var(--background)` in both themes,
> so the hairline borders do all the separating, matching the design.
>
> **The collapse control lives in the sidebar's footer, and collapsing leaves an icon rail.**
> `collapsible="icon"` plus `SidebarRail`, from `sidebar-07` rather than `sidebar-16`: the sidebar
> collapses to a 48px rail of icons instead of disappearing, so the sections stay reachable at both
> widths. The control is the last item in `SidebarFooter`, under a `SidebarSeparator`, and is a
> `SidebarMenuButton` with an icon and a label — the same shape as the items above it, which means
> it collapses to its icon and gains its tooltip for free. The header keeps a `SidebarTrigger` only
> below `md`, where the sidebar is a sheet with no edge to grab.
>
> This makes an icon **mandatory** on every section nav item, and a tooltip mandatory on every
> section nav button: at rail width they are the whole item. `ShellStructureTest` asserts both,
> because a missing one renders a blank square rather than an error.
>
> Where we knowingly differ from the block: the areas stay in the header rather than moving into the
> sidebar (ADR-016 is unchanged — the sidebar is for sections of one resource); the toggle renders
> only on pages that have a sidebar, from the shared list in `lib/sections.ts`; and search is the ⌘K
> palette rather than the block's inert `SidebarInput`.

**Decision** — The shell is one menu bar plus, where a resource or area has sections, shadcn's
own `Sidebar` below it.

- **The menu bar** is a single row of three zones on a `1fr auto 1fr` grid: logo and the
  tenant-scoped _areas_ as a pill nav on the left, the search (⌘K) dead centre, the organization
  switcher and the account avatar on the right. The equal flanks are what hold the search on the
  header's centre line rather than on its neighbours'. It replaces the two-row header — identity
  row plus area row — that ADR-016 prescribed.
- **The second level is a sidebar on the left**, not a sticky column beside a centred reading
  column. `SectionLayout` renders `Sidebar` + `SidebarInset`; `SectionNav` renders its items as
  `SidebarMenuButton`s. It is offset below the bar with `--header-height` and becomes the
  sheet `Sidebar` provides for itself below `md`.
- **Content is boxed and centred** on the app surface: `max-w-6xl` for a page with no sections,
  `max-w-4xl` inside a section inset. One background for the bar, the sidebar and the content;
  the borders separate them.
- **The inset content panel is gone**, and with it the `--panel` token, the hairline ring, and
  the corner overlay that redrew the panel's rounded top behind the sticky header.
- **The footer is gone.** It carried links to the Laravel starter kit's own documentation.

The two navigation levels of ADR-016 stand unchanged; only their shapes do. Sections of a single
resource still never appear in the bar.

**Alternatives**

- **Keep the two-row header.** Row one held identity and account, row two the areas — 122px of
  chrome before any content, for six links. One row carries the same navigation.
- **Keep the floating inset panel.** Its rounded top had to be redrawn inside the sticky header
  by an `aria-hidden` overlay, and a fixed-position sidebar cannot respect a floating panel's
  corners without more of the same. The panel was costing custom CSS to defend a card edge.
- **Keep `SectionNav` as styled links in a sticky column.** It looked close enough to a sidebar
  to invite one, without the collapse, the mobile sheet, the keyboard shortcut or the persisted
  state that `Sidebar` already has.
- **Put the section sidebar at page level, beside the bar rather than under it.** The area nav
  would then sit above only part of the page. Nesting it under the bar keeps one bar over
  everything.

**Why** — The chrome now costs one row instead of two, the second level is a component we did not
write, and a full-height sidebar gives resource sections room to grow: a site will have more
sections than a settings page has, and they will not all fit in a 40-character sticky column.

Removing the panel removes the only piece of layout in the app that existed to defend a visual
edge rather than to arrange content.

**Consequences**

- `SectionLayout` is the only place that may render a `Sidebar` for the second level; a second
  one inside the same `SidebarProvider` would fight it. `tests/Feature/ShellStructureTest.php`
  asserts both that and the header offset.
- `AppShell` mounts `SidebarProvider` for both variants, because the menu bar layout now has a
  sidebar too.
- The second layer inside `AppLayout` is a layout, not part of it: `app.tsx` composes
  `[AppLayout, ContentLayout]` by default and `[AppLayout, OrganizationSettingsLayout]` or
  `[AppLayout, AccountLayout]` for an area with sections. Adding an area with sections means
  adding its layout to that map.
- `--header-height` is declared on the shell wrapper and is load-bearing in three directions: the
  header's height, the sidebar's offset, and the sidebar's height.
- Search is navigation-only, and deliberately so — there are no servers or sites to search yet.
  Extend `app-search.tsx` as resource domains are built rather than leaving a box that appears to
  search records it cannot reach.
