import { router, usePage } from '@inertiajs/react';
import { switchMethod } from '@/routes/organizations';
import type { Organization } from '@/types';

/**
 * Switching tenants keeps you where you were standing. The tenant is the first path segment
 * (ADR-031), so the handle is swapped in place rather than dropping you on the new
 * organization's dashboard; a URL that carries no handle falls back to a reload.
 */
export function useSwitchOrganization() {
    const currentOrganization = usePage().props.currentOrganization;

    return (organization: Organization) => {
        const previousHandle = currentOrganization?.handle;

        router.visit(switchMethod(organization.handle), {
            onFinish: () => {
                if (!previousHandle || typeof window === 'undefined') {
                    router.reload();

                    return;
                }

                const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
                const segment = `/${previousHandle}`;

                if (currentUrl.includes(segment)) {
                    router.visit(
                        currentUrl.replace(segment, `/${organization.handle}`),
                        { replace: true },
                    );

                    return;
                }

                router.reload();
            },
        });
    };
}
