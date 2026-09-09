# ADR-043 — The style is aria-vega at large radius, with app-level variants

**2026-09-07** · **Status**: Accepted, **extends [ADR-015](0015-shadcn-ui-runs-on-the-react-aria-base.md)**

**Decision** — One shadcn style, `aria-vega`, at `--radius: 0.875rem` (14px), plus two variants
added to `Button` in this repository:

- **`shape`** — `default` | `pill`. `pill` is `rounded-full`, declared _after_ `size` in the cva
  so it wins over that variant's per-size radius clamps.
- **`size="xl"`** — h-11, `px-5`, for a call to action that carries a page or a card.

`pill` is for **the single primary action of a page, card or empty state** — the full-width
auth submits and the empty state's action today. Toolbar actions, inline actions, dialog
submits and everything in the chrome stay Vega's own shape. `Card` gets nothing: Vega already
ships the soft treatment the design asks for.

**Alternatives**

- **`aria-nova` plus Luma-shaped variants.** Nova's card is `rounded-xl` with no shadow at
  `--card-spacing: 4`; getting to the design's soft, roomy card meant overriding radius, shadow,
  ring and spacing. Vega at 14px lands there by default — its card measures 19.6px against
  roughly 20px in the reference, with `shadow-xs` and `--card-spacing: 6` already set.
- **Install `aria-luma` alongside into a second namespace.** Two `Card`s and two `Button`s in one
  codebase, both needing every future update, and reviewers picking whichever they happened to
  import.
- **Raise `--radius` further to get pill buttons for free.** It would round the chrome with them.
  Vega's small sizes clamp their radius (`rounded-[min(var(--radius-md),10px)]`) precisely so a
  large `--radius` cannot turn a 32px control into a stadium; a global radius that produced pills
  would fight that clamp everywhere.

**Why** — The design is one style with two exceptions, not two styles mixed. Vega's own clamping
is the mechanism that makes a large radius safe: soft containers, crisp controls, from a single
token. Adding the exceptions as variants keeps them named at the call site — `shape="pill"` says
what it is, where a one-off `className="rounded-full h-11 px-5"` says nothing and drifts.

**Consequences**

- `components/ui/button.tsx` now carries a hand-written variant. `shadcn add button --overwrite`
  will discard it; re-add `shape`, and keep it declared after `size` or the clamps win.
- Small custom controls follow Vega's clamp rather than a bare `rounded-lg`: at 14px the menu
  bar's nav pill needed `rounded-[min(var(--radius-md),10px)]` to stay a rounded square.
- `--radius` is now a design decision, not a default. Changing it moves every container, and the
  clamps mean it will not move the small controls with them.
- The style change also brought `iconLibrary: lucide` (matching what the app already imports) and
  Inter as the sans face.
