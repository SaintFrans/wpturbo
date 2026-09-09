<?php

use Illuminate\Support\Facades\File;

/**
 * The shell's two levels are held together by one token, exactly as shadcn's `sidebar-16` block
 * holds them (ADR-042). The menu bar is sticky and the section sidebar's container is fixed to the
 * viewport, so the sidebar has to be pushed down by the bar's height and shortened by the same
 * amount. Get it wrong and the sidebar's first item hides underneath the bar — a layout bug no
 * type checker can see.
 */
it('offsets the section sidebar below the menu bar using the header height token', function () {
    expect((string) file_get_contents(resource_path('js/layouts/section-layout.tsx')))
        ->toContain('top-(--header-height)')
        ->toContain('h-[calc(100svh-var(--header-height))]!');

    // The block declares the token on the shell wrapper (`AppLayout`), not in the stylesheet.
    expect((string) file_get_contents(resource_path('js/layouts/app-layout.tsx')))
        ->toContain('[--header-height:calc(--spacing(14))]');

    expect((string) file_get_contents(resource_path('js/components/shell/app-header.tsx')))
        ->toContain('h-(--header-height)');
});

/**
 * Areas belong in the menu bar, sections in the section sidebar (ADR-016). The sidebar is
 * rendered by `SectionLayout` alone; a page or layout that mounts its own `Sidebar` would
 * produce two competing second levels inside one `SidebarProvider`.
 */
it('renders the section sidebar in one place only', function () {
    $offenders = collect(File::allFiles(resource_path('js')))
        ->filter(fn ($file) => $file->getExtension() === 'tsx')
        ->reject(fn ($file) => str_contains($file->getPathname(), '/components/ui/'))
        ->reject(fn ($file) => str_ends_with($file->getPathname(), '/layouts/section-layout.tsx'))
        ->filter(fn ($file) => (bool) preg_match(
            '/<Sidebar[\s>]/',
            (string) file_get_contents($file->getPathname())
        ))
        ->map(fn ($file) => str_replace(resource_path('js').'/', '', $file->getPathname()))
        ->values()
        ->all();

    expect($offenders)->toBe([]);
});

/**
 * The section sidebar collapses to an icon rail (`collapsible="icon"`, from shadcn's `sidebar-07`),
 * so an item without an icon collapses to a blank square and an item without a tooltip loses its
 * only label. Both render fine and type check, which is why they are asserted here.
 */
it('gives every section nav item an icon and a tooltip', function () {
    expect((string) file_get_contents(resource_path('js/layouts/section-layout.tsx')))
        ->toContain('collapsible="icon"');

    expect((string) file_get_contents(resource_path('js/layouts/section-layout.tsx')))
        ->toContain('tooltip={item.title}');

    $offenders = collect(File::allFiles(resource_path('js/layouts')))
        ->filter(fn ($file) => $file->getExtension() === 'tsx')
        ->filter(fn ($file) => str_contains(
            (string) file_get_contents($file->getPathname()),
            'icon: null'
        ))
        ->map(fn ($file) => str_replace(resource_path('js').'/', '', $file->getPathname()))
        ->values()
        ->all();

    expect($offenders)->toBe([]);
});

/**
 * Settings is one destination with two groups, not two destinations (ADR-046). Both page prefixes
 * resolve to `SettingsLayout`, and its sidebar carries the person's sections and the current
 * organization's. Split them again and the account menu grows a second entry that means almost the
 * same word — which is exactly what this replaced.
 */
it('renders one settings sidebar carrying both the account and the organization', function () {
    $layout = (string) file_get_contents(resource_path('js/layouts/settings-layout.tsx'));

    expect($layout)
        ->toContain("title: 'Account'")
        ->toContain('title: currentOrganization.name')
        ->toContain("from '@/routes/profile'")
        ->toContain("from '@/routes/security'")
        ->toContain("from '@/routes/organizations'")
        ->toContain("from '@/routes/organizations/members'")
        ->toContain("from '@/routes/organizations/audit-log'");

    // The organization group is dropped when there is no current organization rather than
    // rendering links whose handle cannot be built.
    expect($layout)->toContain('...(currentOrganization');

    $app = (string) file_get_contents(resource_path('js/app.tsx'));

    expect($app)
        ->toContain("'organizations/settings/': SettingsLayout")
        ->toContain("'settings/': SettingsLayout");
});

/**
 * One "Settings" row in the account menu, pointing at the Settings area's first section. A second
 * row for the other scope is the thing ADR-046 removed.
 */
it('offers a single settings entry in the account menu', function () {
    $header = (string) file_get_contents(resource_path('js/components/shell/app-header.tsx'));

    // The Settings row points at the account's own first section; the organization's sections
    // are one click away in the sidebar it opens, so the header no longer links them directly.
    expect($header)
        ->toMatch('/href=\{toUrl\(profile\(\)\)\}[^<]*<Settings /s')
        ->not->toContain("from '@/routes/organizations'");
});
