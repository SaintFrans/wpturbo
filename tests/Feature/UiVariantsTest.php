<?php

/**
 * `components/ui/` is generated, but three things in it are ours: the `shape` and `xl` variants on
 * Button (ADR-043) and the retuned control scale (ADR-044).
 *
 * Re-running `shadcn apply --preset` or `shadcn add button --overwrite` rewrites those files and
 * discards all three. That has already happened twice. The `shape` loss at least breaks the build,
 * because call sites pass `shape="pill"`; the retuned heights and the sidebar width fail *silently*
 * — the app simply goes back to feeling too big. These assertions turn a silent revert into a red
 * test, and the ADRs say what to re-apply.
 */
it('keeps the hand-written button variants after a registry overwrite', function () {
    $button = (string) file_get_contents(resource_path('js/components/ui/button.tsx'));

    expect($button)
        ->toContain('shape: {')
        ->toContain('pill: "rounded-full"')
        // Declared after `size`, or the per-size radius clamps beat the pill.
        ->toContain('xl:')
        ->and(strpos($button, 'shape: {'))->toBeGreaterThan(strpos($button, 'size: {'));
});

it('keeps the retuned control scale after a registry overwrite', function () {
    // The design's controls are 28-30px against a 56px header; Vega ships 36 (ADR-044).
    expect((string) file_get_contents(resource_path('js/components/ui/button.tsx')))
        ->toContain('"h-8 gap-1.5 rounded-[min(var(--radius-md),10px)] px-2.5')
        ->toContain('sm: "h-7 gap-1');

    expect((string) file_get_contents(resource_path('js/components/ui/input.tsx')))
        ->toContain('"h-8 w-full min-w-0');

    expect((string) file_get_contents(resource_path('js/components/ui/sidebar.tsx')))
        ->toContain('const SIDEBAR_WIDTH = "14.5rem"')
        ->toContain('default: "h-7 text-sm"');
});

/**
 * The other half of ADR-044: container spacing is Vega's and must stay that way. Tightening the
 * controls was only defensible because it left cards, dialogs and frames alone.
 */
it('leaves the container spacing at vega values', function () {
    expect((string) file_get_contents(resource_path('js/components/ui/card.tsx')))
        ->toContain('[--card-spacing:--spacing(6)]');

    expect((string) file_get_contents(resource_path('css/app.css')))
        ->toContain('--radius:')
        // One surface for header, sidebar and content (ADR-042) — also reverted by a preset run.
        ->toContain('--sidebar: var(--background)');
});

/**
 * The command palette is hand-built on top of the generated `command.tsx`: a muted plate carrying
 * the input and a keyboard-hint footer, with the results floating on it as a raised panel.
 *
 * Two pieces of it fail silently under `shadcn add command --overwrite`. `CommandPanel` and
 * `CommandFooter` simply stop existing, which breaks the build. The Escape handler does not: the
 * search field swallows Escape to clear itself and stops propagation, so without the capture-phase
 * handler the palette's own footer advertises "Esc — Close" while Escape does nothing at all.
 */
it('keeps the command palette shell after a registry overwrite', function () {
    $command = (string) file_get_contents(resource_path('js/components/ui/command.tsx'));

    expect($command)
        ->toContain('data-slot="command-panel"')
        ->toContain('data-slot="command-footer"')
        // Capture, not bubble: the search field stops Escape before it reaches an ancestor.
        ->toContain('onKeyDownCapture');
});
