<?php

use Illuminate\Support\Facades\File;

/**
 * Controllers flash toasts through `Inertia::flash('toast', …)`, and exactly one component turns
 * those into a rendered notification. It has to be mounted, and it has to be listening.
 *
 * Both halves used to live apart — a `use-flash-toast` hook and sonner's `Toaster` — and the hook
 * ended up with no caller at all, so every flashed toast in the app was silently dropped. Nothing
 * failed: the server flashed, the client ignored it, and the only symptom was a missing message.
 */
it('mounts one flash toaster that listens for flashed toasts', function () {
    expect((string) file_get_contents(resource_path('js/app.tsx')))
        ->toContain('<FlashToaster />');

    expect((string) file_get_contents(resource_path('js/components/flash-toaster.tsx')))
        ->toContain("router.on('flash'")
        ->toContain('<Toaster />');
});

/**
 * The counterpart: the server side of that path is `Inertia::flash('toast', …)`, and it is the
 * only notification path (see `resources/js/CLAUDE.md`). A second one would mean a message that
 * appears in one place and not another.
 */
it('flashes toasts from the controllers through inertia', function () {
    $flashing = collect(File::allFiles(app_path('Http/Controllers')))
        ->filter(fn ($file) => str_contains(
            (string) file_get_contents($file->getPathname()),
            "Inertia::flash('toast'"
        ));

    expect($flashing)->not->toBeEmpty();
});
