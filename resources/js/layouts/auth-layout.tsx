import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { AppLogo } from '@/components/shell/app-logo';
import { home } from '@/routes';

type Props = {
    children: ReactNode;
    title?: string;
    description?: string;
};

/**
 * The shell for every page under `pages/auth/`: the mark, a title and a sentence, above a narrow
 * column. One layout, not a template behind a wrapper — the card and split variants the starter
 * kit shipped were never used.
 */
export default function AuthLayout({
    children,
    title = '',
    description = '',
}: Props) {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
            <div className="w-full max-w-sm">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col items-center gap-4">
                        <Link
                            href={home()}
                            className="flex flex-col items-center gap-2 font-medium"
                        >
                            <AppLogo className="h-7 w-auto fill-current text-foreground" />
                            <span className="sr-only">{title}</span>
                        </Link>

                        <div className="space-y-2 text-center">
                            <h1 className="text-xl font-medium">{title}</h1>
                            <p className="text-center text-sm text-muted-foreground">
                                {description}
                            </p>
                        </div>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
