import type { PropsWithChildren } from 'react';
import { SectionLayout } from '@/components/section-layout';
import { SectionNav } from '@/components/section-nav';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

const accountNavItems: NavItem[] = [
    { title: 'Profile', href: edit(), icon: null },
    { title: 'Security', href: editSecurity(), icon: null },
];

export default function AccountLayout({ children }: PropsWithChildren) {
    return (
        <SectionLayout
            title="Account"
            nav={<SectionNav items={accountNavItems} label="Account" />}
        >
            {children}
        </SectionLayout>
    );
}
