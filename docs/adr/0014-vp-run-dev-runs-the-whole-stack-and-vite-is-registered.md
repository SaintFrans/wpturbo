# ADR-014 — `vp run dev` runs the whole stack, and Vite is registered directly

**2026-08-15** · **Status**: Accepted

**Decision** — `package.json`'s `dev` script runs `php artisan dev`, so `vp run dev` and
`composer dev` both start the full stack. `AppServiceProvider::configureDevCommands()`
overrides Laravel's Vite dev process to run `vp dev` directly instead of the default
`pnpm run dev`.

**Alternatives** — Leave `dev` as `vp dev` and require `composer dev` for the full stack;
name the Vite-only script `dev:vite` and have `artisan dev` call that.

**Why** — `vp run dev` looks like the command that runs the app, so people reached for it,
got Vite alone, and found nothing on `:8000` — made worse by `laravel-vite-plugin` printing
an `APP_URL: http://localhost:8000` banner that reads like a server it started. Making the
obvious command do the obvious thing is worth more than preserving the split.

**The override is load-bearing, not decoration.** Laravel registers its Vite process as
`pnpm run dev`, which resolves to the `dev` script — now `php artisan dev`. Left alone, the
command and the script would spawn each other without end. Registering `vp dev` under the
same `vite` name takes package.json out of that path entirely. Routing through a
`dev:vite` script would have worked too, but leaves the same trap one rename away.

**Consequences**

- Do not point the `vite` dev process back at a package.json script without changing the
  `dev` script in the same edit. `tests/Feature/DevCommandsTest.php` fails if anyone does.
- `vp dev` still means Vite alone — useful with Herd or Valet, and what the Vite+ docs
  describe. The `vp <name>` versus `vp run <name>` distinction now genuinely matters here.
- Run one stack at a time: concurrent `artisan dev` runs fight over the Vite port and
  `public/hot`.
