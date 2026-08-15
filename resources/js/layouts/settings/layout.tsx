import type { PropsWithChildren } from 'react';
import { SectionLayout } from '@/components/section-layout';
import { SectionNav } from '@/components/section-nav';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import { index as teams } from '@/routes/teams';
import type { NavItem } from '@/types';

const settingsNavItems: NavItem[] = [
    { title: 'Profile', href: edit(), icon: null },
    { title: 'Security', href: editSecurity(), icon: null },
    { title: 'Teams', href: teams(), icon: null },
    { title: 'Appearance', href: editAppearance(), icon: null },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    return (
        <SectionLayout
            title="Settings"
            nav={<SectionNav items={settingsNavItems} label="Settings" />}
        >
            {children}
        </SectionLayout>
    );
}
