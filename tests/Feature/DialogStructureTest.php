<?php

use Illuminate\Support\Facades\File;

/**
 * Source with its comments removed. A comment that names a tag — this suite's own explanations
 * included — would otherwise read as markup.
 */
function sourceWithoutComments(string $path): string
{
    $source = (string) file_get_contents($path);

    return (string) preg_replace('#/\*.*?\*/|//[^\n]*#s', '', $source);
}

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
            $source = sourceWithoutComments($file->getPathname());

            // An opening <Dialog …> whose next dialog-related tag is <DialogTrigger>.
            return (bool) preg_match('/<Dialog[\s>][^<]*(?:<(?!\/?Dialog)[^>]*>[^<]*)*<DialogTrigger/s', $source);
        })
        ->map(fn ($file) => str_replace(resource_path('js').'/', '', $file->getPathname()))
        ->values()
        ->all();

    expect($offenders)->toBe([]);
});

/**
 * The sheet is the same primitive: `SheetTrigger` is React Aria's DialogTrigger and holds the
 * trigger *and* the sheet. Writing it the Radix way — the trigger nested inside `<Sheet>` or
 * `<SheetContent>` — renders neither, silently. It cost the header's mobile navigation, which
 * had no hamburger at all until the menu bar was rebuilt.
 */
it('never nests a sheet trigger inside a sheet', function () {
    $offenders = collect(File::allFiles(resource_path('js')))
        ->filter(fn ($file) => $file->getExtension() === 'tsx')
        ->reject(fn ($file) => str_contains($file->getPathname(), '/components/ui/'))
        ->filter(function ($file) {
            $source = sourceWithoutComments($file->getPathname());

            // An opening <Sheet …> or <SheetContent …> whose next sheet-related tag is <SheetTrigger>.
            return (bool) preg_match('/<Sheet(?:Content)?[\s>][^<]*(?:<(?!\/?Sheet)[^<>]*>[^<]*)*<SheetTrigger/s', $source);
        })
        ->map(fn ($file) => str_replace(resource_path('js').'/', '', $file->getPathname()))
        ->values()
        ->all();

    expect($offenders)->toBe([]);
});
