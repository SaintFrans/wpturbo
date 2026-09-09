import type { PropsWithChildren } from 'react';

/**
 * The default second layer inside `AppLayout`: one centred, boxed column on the app surface, for
 * pages with no sections. The box owns the page's horizontal padding, so pages add none.
 *
 * It is a layout rather than part of `AppLayout` because the second layer is what varies — an area
 * with sections swaps this for `SectionLayout`, which puts a sidebar beside the content. Both sit
 * in the same row below the menu bar.
 */
export default function ContentLayout({ children }: PropsWithChildren) {
    return (
        <main className="flex w-full flex-1 flex-col bg-background">
            <div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-20 sm:px-8 sm:pt-8">
                {children}
            </div>
        </main>
    );
}
