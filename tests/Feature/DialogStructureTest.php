<?php

use Illuminate\Support\Facades\File;

/**
 * React Aria inverts Radix's dialog nesting: DialogTrigger is the root and holds the
 * trigger and the Dialog side by side. Writing it the Radix way — the trigger nested
 * inside the Dialog — compiles, type checks and renders *nothing*, because a closed
 * Dialog renders none of its children, the trigger included.
 *
 * That is invisible to tsc and to the linter, so it is asserted here instead.
 */
it('never nests a dialog trigger inside a dialog', function () {
    $offenders = collect(File::allFiles(resource_path('js')))
        ->filter(fn ($file) => $file->getExtension() === 'tsx')
        ->reject(fn ($file) => str_contains($file->getPathname(), '/components/ui/'))
        ->filter(function ($file) {
            $source = (string) file_get_contents($file->getPathname());

            // An opening <Dialog …> whose next dialog-related tag is <DialogTrigger>.
            return (bool) preg_match('/<Dialog[\s>][^<]*(?:<(?!\/?Dialog)[^>]*>[^<]*)*<DialogTrigger/s', $source);
        })
        ->map(fn ($file) => str_replace(resource_path('js').'/', '', $file->getPathname()))
        ->values()
        ->all();

    expect($offenders)->toBe([]);
});
