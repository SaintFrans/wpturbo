<?php

use Illuminate\Foundation\DevCommands;

/**
 * Read the scripts block from package.json.
 *
 * @return array<string, string>
 */
function packageScripts(): array
{
    /** @var array{scripts?: array<string, string>} $package */
    $package = json_decode((string) file_get_contents(base_path('package.json')), true);

    return $package['scripts'] ?? [];
}

it('starts vite through vite+ rather than a package manager script', function () {
    $vite = collect(DevCommands::commands())->firstWhere('name', 'vite');

    expect($vite)->not->toBeNull()
        ->and($vite['command'])->toBe('vp dev');
});

it('does not let the dev script and the dev command start each other', function () {
    // package.json's "dev" script runs `php artisan dev`. If any process that `artisan dev`
    // starts shelled back into that script, the two would spawn each other without end.
    expect(packageScripts()['dev'] ?? null)->toBe('php artisan dev');

    foreach (DevCommands::commands() as $command) {
        expect($command['command'])->not->toMatch('/\b(?:npm|pnpm|yarn|bun|vp) run dev$/');
    }
});

it('still starts the server, queue and logs alongside vite', function () {
    $names = collect(DevCommands::commands())->pluck('name');

    expect($names)->toContain('server', 'queue', 'logs', 'vite');
});
