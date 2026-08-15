import { AppContent } from '@/components/app-content';
import { AppFooter } from '@/components/app-footer';
import { AppHeader } from '@/components/app-header';
import { AppShell } from '@/components/app-shell';
import type { AppLayoutProps } from '@/types';

// The header renders no breadcrumb row; pages still declare `breadcrumbs` for the
// alternative sidebar template, which does render them.
export default function AppHeaderLayout({ children }: AppLayoutProps) {
    return (
        <AppShell variant="header">
            <AppHeader />
            <AppContent variant="header">{children}</AppContent>
            <AppFooter />
        </AppShell>
    );
}
