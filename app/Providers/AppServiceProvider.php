<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\DevCommands;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureDevCommands();
    }

    /**
     * Configure the processes started by "php artisan dev".
     *
     * By default Laravel starts Vite through the package manager, as `pnpm run dev`.
     * The `dev` script in package.json runs `php artisan dev`, so leaving that default in
     * place would make the two call each other forever. Registering Vite+ directly under
     * the same "vite" name overrides the default and breaks the cycle.
     *
     * Do not point this back at a package.json script without changing that script too.
     */
    protected function configureDevCommands(): void
    {
        DevCommands::register('vp dev', 'vite');
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
