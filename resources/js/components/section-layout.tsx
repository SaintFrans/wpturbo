import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
    /** Names the area, shown above the nav. */
    title: string;
    /** Usually a <SectionNav>. */
    nav: ReactNode;
    children: ReactNode;
    className?: string;
};

/**
 * The standard arrangement for an area with sections: a sticky nav on the left, a centred
 * reading column, and a spacer on the right that keeps the column optically centred rather
 * than pushed right by the nav.
 *
 * The nav sticks below the app header, whose height is `--app-header-height` — a token
 * rather than a number, so the two cannot drift apart.
 *
 * On small screens the nav stacks above the content instead of sticking.
 */
export function SectionLayout({ title, nav, children, className }: Props) {
    return (
        <div
            className={cn(
                'flex w-full flex-col items-start justify-center gap-x-6 gap-y-4 md:flex-row',
                className,
            )}
        >
            <div className="w-full shrink-0 space-y-6 md:sticky md:top-[calc(var(--app-header-height)+1.5rem)] md:ml-auto md:w-40 lg:w-48">
                <h1 className="text-base/8 font-medium text-foreground sm:text-xl/8">
                    {title}
                </h1>
                {nav}
            </div>

            <div className="mx-auto flex w-full max-w-[900px] flex-col">
                <div className="flex flex-col gap-y-6 pb-24 md:mt-14 md:pb-0">
                    {children}
                </div>
            </div>

            {/* Balances the nav so the reading column sits in the middle of the page. */}
            <div
                aria-hidden="true"
                className="mr-auto hidden w-full xl:block xl:max-w-48"
            />
        </div>
    );
}
