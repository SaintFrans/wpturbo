import * as React from 'react';
import { SidebarInset } from '@/components/ui/sidebar';
import type { AppVariant } from '@/types';

type Props = React.ComponentProps<'main'> & {
    variant?: AppVariant;
};

export function AppContent({ variant = 'sidebar', children, ...props }: Props) {
    if (variant === 'sidebar') {
        return <SidebarInset {...props}>{children}</SidebarInset>;
    }

    return (
        // The page sits on the app background; the content is an inset panel with its own
        // surface and hairline ring. The outer sm:px-2 plus the inner sm:px-6 add up to the
        // header's sm:px-8, so content and navigation share one gutter.
        <main className="flex flex-1 flex-col px-0 py-px sm:px-2" {...props}>
            <div className="relative mx-auto flex w-full grow flex-col items-stretch bg-panel ring-sidebar-border sm:rounded-lg sm:ring-1">
                <div className="mx-auto w-full max-w-[1920px] px-4 pt-4 pb-20 sm:px-6 sm:pt-10">
                    {children}
                </div>
            </div>
        </main>
    );
}
