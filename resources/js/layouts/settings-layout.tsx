import { usePage } from '@inertiajs/react';
import {
    ScrollText,
    ShieldCheck,
    SlidersHorizontal,
    User,
    Users,
} from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { SectionLayout } from '@/layouts/section-layout';
import { edit as editProfile } from '@/routes/profile';
import { edit as editOrganization } from '@/routes/organizations';
import { index as auditLog } from '@/routes/organizations/audit-log';
import { index as members } from '@/routes/organizations/members';
import { edit as editSecurity } from '@/routes/security';
import type { NavGroup } from '@/types';

/**
 * One Settings area with two groups in its sidebar: the person's settings first, then the current
 * organization's (ADR-046). They remain two scopes with two URL spaces — `/settings/…` belongs to
 * the person and `/org/{organization}/settings/…` to the tenant, each keeping its own middleware —
 * but a settings sidebar that shows both is one destination to learn rather than two.
 *
 * The organization group is labelled with the organization's name, not the word "Organization":
 * with several memberships, which one you are editing is the thing worth saying. The handle comes
 * from the shared `currentOrganization` prop because layouts resolved in `app.tsx` receive children
 * only, not page props — and the group is dropped entirely when there is no current organization,
 * rather than rendering links that cannot be built.
 *
 * "Audit log" is shown to every member, the same as "Members" — the policy (Owner/Admin only,
 * ADR-032) is the real control. A Member who follows this link gets a 403, which is an accepted
 * rough edge rather than a reason to thread `permissions` through a layout that otherwise receives
 * none of a page's props.
 *
 * Icons are not decoration: the sidebar collapses to an icon rail (ADR-042), where the icon is all
 * that is left of an item.
 */
export default function SettingsLayout({ children }: PropsWithChildren) {
    const { currentOrganization } = usePage().props;

    const groups: NavGroup[] = [
        {
            title: 'Account',
            items: [
                { title: 'Profile', href: editProfile(), icon: User },
                { title: 'Security', href: editSecurity(), icon: ShieldCheck },
            ],
        },
        ...(currentOrganization
            ? [
                  {
                      title: currentOrganization.name,
                      items: [
                          {
                              title: 'General',
                              href: editOrganization(
                                  currentOrganization.handle,
                              ),
                              icon: SlidersHorizontal,
                          },
                          {
                              title: 'Members',
                              href: members(currentOrganization.handle),
                              icon: Users,
                          },
                          {
                              title: 'Audit log',
                              href: auditLog(currentOrganization.handle),
                              icon: ScrollText,
                          },
                      ],
                  },
              ]
            : []),
    ];

    return (
        <SectionLayout title="Settings" groups={groups}>
            {children}
        </SectionLayout>
    );
}
