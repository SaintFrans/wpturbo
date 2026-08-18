import { usePage } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import { SectionLayout } from '@/components/section-layout';
import { SectionNav } from '@/components/section-nav';
import { edit } from '@/routes/organizations';
import { index as auditLog } from '@/routes/organizations/audit-log';
import { index as members } from '@/routes/organizations/members';
import type { NavItem } from '@/types';

/**
 * The second navigation level for the Settings area (ADR-016).
 *
 * Settings is a tenant-scoped area in the header's second row, so its sections live here rather
 * than with the account settings. Roles and Billing join this list as they are built. The handle
 * comes from the shared `currentOrganization` prop because layouts resolved in `app.tsx` receive
 * children only, not page props.
 *
 * "Audit log" is shown to every member, the same as "Members" — the policy (Owner/Admin only,
 * ADR-032) is the real control. A Member who follows this link gets a 403, which is an accepted
 * rough edge rather than a reason to thread `permissions` through a layout that otherwise
 * receives none of a page's props.
 */
export default function OrganizationSettingsLayout({
    children,
}: PropsWithChildren) {
    const { currentOrganization } = usePage().props;
    const handle = currentOrganization?.handle;

    const navItems: NavItem[] = handle
        ? [
              { title: 'General', href: edit(handle), icon: null },
              { title: 'Members', href: members(handle), icon: null },
              { title: 'Audit log', href: auditLog(handle), icon: null },
          ]
        : [];

    return (
        <SectionLayout
            title="Settings"
            nav={<SectionNav items={navItems} label="Settings" />}
        >
            {children}
        </SectionLayout>
    );
}
