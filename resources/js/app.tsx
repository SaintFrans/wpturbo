import { createInertiaApp, router } from '@inertiajs/react';
import { RouterProvider } from 'react-aria-components';
import { Toaster } from '@/components/ui/sonner';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import OrganizationSettingsLayout from '@/layouts/organizations/settings-layout';
import AccountLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            // Order matters: the organization settings area is more specific than the
            // organizations list beneath it.
            case name.startsWith('organizations/settings/'):
                return [AppLayout, OrganizationSettingsLayout];
            case name.startsWith('settings/'):
                return [AppLayout, AccountLayout];
            default:
                return AppLayout;
        }
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
                <Toaster />
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
