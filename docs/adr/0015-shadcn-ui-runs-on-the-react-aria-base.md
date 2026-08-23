# ADR-015 — shadcn/ui runs on the React Aria base

**2026-08-15** · **Status**: Accepted

**Decision** — Switched the shadcn base from Radix to React Aria: `components.json` moved
from `"style": "new-york"` to `"style": "aria-vega"`, all primitives were re-added from the
aria registry, and the thirteen `@radix-ui/*` packages were removed. Vega is the style
formerly called new-york, so the app looks the same.

**Alternatives** — Stay on Radix (fully supported, not deprecated); move to the Base UI
registry instead.

**Why** — Requested. React Aria became a first-class shadcn base in July 2026 and brings
Adobe's accessibility work — focus management, keyboard interaction and screen-reader
behaviour — as the foundation of every primitive.

**This was not an under-the-hood swap, and could not be.** shadcn's aria components expose
React Aria's own API, so call-sites had to change:

| Radix                                                                         | React Aria                                                                 |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `<DialogContent>` inside `<Dialog>`                                           | `<Dialog>` is the content                                                  |
| `open` / `onOpenChange`                                                       | `isOpen` / `onOpenChange`                                                  |
| `onClick` / `disabled`                                                        | `onPress` / `isDisabled`                                                   |
| `onSelect` on menu items                                                      | `onAction`                                                                 |
| `asChild`                                                                     | `href`, `LinkButton`, or a `render` prop                                   |
| `<TooltipProvider>` + `<Tooltip><TooltipTrigger/><TooltipContent/></Tooltip>` | `<TooltipTrigger>` holds trigger and `<Tooltip>` side by side; no provider |
| `<DropdownMenu>` root                                                         | `<DropdownMenuTrigger>` is the root                                        |
| `side` / `align` / `sideOffset`                                               | `placement`                                                                |
| `<SelectItem value>`                                                          | `<SelectItem id>`, with `selectedKey` / `onSelectionChange`                |

There is no codemod for this: `shadcn migrate` offers only `icons`, `rtl` and `radix`, and
that last one converts individual Radix packages to the unified `radix-ui` package. 95 type
errors across 35 files were worked through by hand and by targeted scripts.

**Consequences**

- **`RouterProvider` is wired to Inertia in `app.tsx`.** React Aria components navigate
  through their own `href`, so without it every link inside a primitive would need to wrap
  an Inertia `<Link>`. This is what makes `LinkButton`, `SidebarMenuButton href` and
  `DropdownMenuItem href` perform client-side visits.
- **Inertia's `prefetch` is lost** on links that are now React Aria components: the sidebar
  nav, the app logo and the user menu's Settings item. `RouterProvider` calls
  `router.visit()`, which has no hover-prefetch equivalent. Navigation still works; it is
  marginally less eager. Restoring it would mean going back to wrapping Inertia `<Link>`s,
  which is the pattern React Aria is built to avoid.
- **`navigation-menu` does not exist in the aria registry.** Its only consumer used the three
  structural wrappers and no menu behaviour, so `app-header` now uses semantic
  `<nav>/<ul>/<li>` and the primitive is deleted.
- **`sonner` was rewired.** The registry version reads the theme from `next-themes`; it now
  uses this app's `useAppearance` hook, and `next-themes` was removed rather than run a
  second theme system.
- The CLI's `use-mobile.ts` was discarded in favour of the existing `use-mobile.tsx`, which
  is SSR-safe via `useSyncExternalStore`. The CLI version flashes on first render.
- Five unused primitives were deleted (toggle, toggle-group, skeleton, icon, collapsible);
  the CLI re-added `skeleton`, `textarea` and `input-group` as dependencies of others.
- **`sidebar.tsx` and `dropdown-menu.tsx` carry a local fix.** They passed
  `data-active={isActive}` and `data-inset={inset}` straight through. React renders a `false`
  data attribute as the string `"false"` rather than omitting it, and the variants match on
  presence (`data-active:`, not `data-[active=true]`), so every sidebar button painted its
  active background permanently. Both now pass `|| undefined`. **`shadcn add --overwrite`
  will drop this** — re-check it after any component update.
- **Two dialogs kept the Radix nesting** — trigger inside `<Dialog>` rather than beside it
  under `<DialogTrigger>` — which renders nothing at all, hiding the delete-account and
  remove-passkey buttons. Fixed, and `tests/Feature/DialogStructureTest.php` now asserts
  against that shape, since neither tsc nor the linter can see it.
- **Verification is thin.** There are no frontend tests. Lint, `tsc`, the production build
  and 93 backend tests pass, and the unauthenticated pages were checked in a browser, but
  the authenticated flows have not been exercised. See
  [OPEN_QUESTIONS.md](../OPEN_QUESTIONS.md) (Q9).
