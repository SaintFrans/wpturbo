# ADR-044 — The control scale is one step tighter than Vega; the spacing scale is not

**2026-09-07** · **Status**: Accepted, **extends [ADR-043](0043-the-style-is-aria-vega-at-large-radius-with-app-level.md)**

**Decision** — Keep Vega's container spacing exactly as shipped, and shift the **control** scale
one step down.

|                 | Vega | Ours | Design |
| --------------- | ---- | ---- | ------ |
| Button default  | 36   | 32   | 32     |
| Button sm       | 32   | 28   | —      |
| Button lg       | 40   | 36   | —      |
| Button xl (CTA) | 44   | 40   | ~40    |
| Input, select   | 36   | 32   | —      |
| Sidebar row     | 32   | 28   | 30     |
| Header search   | 36   | 28   | 29     |
| Nav pill        | 32   | 28   | 25     |
| Sidebar width   | 256  | 232  | 233    |
| Body text       | 14   | 14   | 14     |

Untouched, deliberately: `--radius` (0.875rem), `Card`'s `--card-spacing: 6`, the dialog's own
padding, `ui/frame`'s padding, the pill shape, and the 56px header.

The radius clamps move down with the heights — the 32px step now carries
`rounded-[min(var(--radius-md),10px)]` and the 28px step `min(…,8px)` — so no control becomes a
stadium at a 14px radius.

**Alternatives**

- **`defaultVariants.size: "sm"`.** One line, but `default` becomes a size nobody uses and any
  later `size="default"` silently reintroduces a 36px control. Name and value drift apart.
- **`size="sm"` at each call site.** No component edit, but the decision is then repeated
  everywhere and new code defaults back to the roomier control.
- **Lower `--radius` or `--card-spacing` as well.** That is the change the design does _not_ ask
  for: its cards, dialogs and radii already match Vega. Only the control boxes differ.

**Why** — The design's own numbers, measured off the reference at a scale calibrated two
independent ways (Inter's cap height against 14px body text, and the header, which agree at ×2.25):
every control is 28–30px against a 56px header, with body text at 14px — the same text size we
already have. So what read as "too big" was never the spacing or the type; it was the control
boxes, plus a sidebar 23px too wide.

Container spacing and control size are separate scales in shadcn — `--card-spacing`, the dialog's
padding and `ui/frame` read no control height — which is what makes "minimalist chrome, generous
cards" a coherent position rather than a compromise.

**Consequences**

- Touch targets on the tightest rows are 28px, below the 32px comfortable minimum. Accepted for a
  dense desktop control plane; the mobile sheet inherits it, which is the one place to revisit if
  it proves awkward in use.
- `components/ui/` now carries three hand-edits — `shape`, `xl`, and this scale — and
  **`shadcn apply --preset` or `shadcn add --overwrite` discards all of them.** It has happened
  twice. `tests/Feature/UiVariantsTest.php` asserts each one, so a revert fails a test instead of
  quietly changing how the app feels. That test also guards `--sidebar: var(--background)`, which
  the same preset run reverted (ADR-042).
- `SIDEBAR_WIDTH` is a constant in `components/ui/sidebar.tsx`, not a token, so it is part of that
  same overwrite surface.
