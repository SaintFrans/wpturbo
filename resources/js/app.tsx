import { createInertiaApp, router } from '@inertiajs/react';
import type { ComponentType } from 'react';
import { RouterProvider } from 'react-aria-components';
import { FlashToaster } from '@/components/flash-toaster';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import ContentLayout from '@/layouts/content-layout';
import SettingsLayout from '@/layouts/settings-layout';
import { SECTION_PAGE_PREFIXES } from '@/lib/sections';
import type { SectionPagePrefix } from '@/lib/sections';

/**
 * The second layer for each area that has sections. Keyed by `SectionPagePrefix`, so a prefix
 * added to that list without a layout here fails to type check — and `app-header` stays in step
 * about when to render the sidebar toggle.
 *
 * Both settings prefixes resolve to the same layout: the two scopes are two URL spaces but one
 * Settings sidebar, with a group each (ADR-046).
 */
const sectionLayouts: Record<SectionPagePrefix, ComponentType> = {
    'organizations/settings/': SettingsLayout,
    'settings/': SettingsLayout,
};

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        if (name === 'welcome') {
            return null;
        }

        if (name.startsWith('auth/')) {
            return AuthLayout;
        }

        const prefix = SECTION_PAGE_PREFIXES.find((candidate) =>
            name.startsWith(candidate),
        );

        return [AppLayout, prefix ? sectionLayouts[prefix] : ContentLayout];
    },
    strictMode: true,
    withApp(app) {
        // Routes React Aria's own links and menu items through Inertia, so an `href` on a
        // React Aria component performs a client-side visit instead of a full page load.
        // Without this, every such component would need to wrap an Inertia <Link>.
        //
        // React Aria needs no tooltip provider; each TooltipTrigger owns its own delay.
        return (
            <RouterProvider navigate={(href) => router.visit(href)}>
                {app}
                <FlashToaster />
            </RouterProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
}).catch((error: unknown) => {
    // A rejection here means the app never mounted, so it must stay visible.
    console.error('Failed to initialise the Inertia app', error);
});

// This will set light / dark mode on load...
initializeTheme();
