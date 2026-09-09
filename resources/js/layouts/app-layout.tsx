import { usePage } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import { AppHeader } from '@/components/shell/app-header';
import { SidebarProvider } from '@/components/ui/sidebar';

/**
 * The application shell: one menu bar, and a row beneath it holding whatever the page's own
 * second-layer layout puts there — the centred content box (`ContentLayout`) or a section sidebar
 * and its inset (`SectionLayout`).
 *
 * The frame is shadcn's `sidebar-16` block, kept structurally identical so the sidebar's collapse
 * animation, its offset and the mobile sheet all behave as shipped (ADR-042): a wrapper declaring
 * `--header-height`, a `SidebarProvider` stacked with `flex-col`, the header, then the row.
 *
 * `--header-height` lives here rather than in `app.css` because that is where the block puts it:
 * the layout that owns the header owns the measurement. It is load-bearing in three directions —
 * the header's height, the section sidebar's offset and its height.
 */
export default function AppLayout({ children }: PropsWithChildren) {
    const isOpen = usePage().props.sidebarOpen;

    return (
        <div className="[--header-height:calc(--spacing(14))]">
            <SidebarProvider defaultOpen={isOpen} className="flex flex-col">
                <AppHeader />
                <div className="flex flex-1">{children}</div>
            </SidebarProvider>
        </div>
    );
}
