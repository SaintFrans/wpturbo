<?php

use Illuminate\Support\Facades\File;

/**
 * React Aria's Button renders `type="button"` unless told otherwise, so a submit
 * button written the plain HTML way — no `type` at all — renders inside an Inertia
 * <Form> and does nothing when pressed.
 *
 * The signature of such a button is `isDisabled={processing}` (it reflects the form's
 * submit state) with neither `type="submit"` nor a press handler of its own. That
 * compiles, type checks and renders fine, so it is asserted here instead.
 */
it('gives every form submit button an explicit submit type', function () {
    $offenders = collect(File::allFiles(resource_path('js')))
        ->filter(fn ($file) => $file->getExtension() === 'tsx')
        ->reject(fn ($file) => str_contains($file->getPathname(), '/components/ui/'))
        ->flatMap(function ($file) {
            $source = (string) file_get_contents($file->getPathname());
            $relative = str_replace(resource_path('js').'/', '', $file->getPathname());

            preg_match_all('/<Button\b[^>]*>/s', $source, $matches);

            return collect($matches[0])
                ->filter(fn (string $tag) => str_contains($tag, 'isDisabled={processing}'))
                ->reject(fn (string $tag) => str_contains($tag, 'type="submit"')
                    || str_contains($tag, 'type="button"')
                    || str_contains($tag, 'onPress'))
                ->map(fn (string $tag) => $relative.': '.implode(' ', preg_split('/\s+/', trim($tag)) ?: []));
        })
        ->values()
        ->all();

    expect($offenders)->toBe([]);
});
