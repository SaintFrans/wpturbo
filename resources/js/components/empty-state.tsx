import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
    title: string;
    description?: ReactNode;
    /** An illustration or icon, shown above the title. */
    illustration?: ReactNode;
    /** Primary action, typically a Button or LinkButton. */
    action?: ReactNode;
    className?: string;
};

/**
 * The standard "nothing here yet" panel: illustration, one-line title, a sentence of
 * explanation, one action. Used by every list before its first record exists, so the
 * proportions stay identical across servers, applications and everything after them.
 */
export function EmptyState({
    title,
    description,
    illustration,
    action,
    className,
}: Props) {
    return (
        <div className={cn('flex justify-center rounded-lg py-10', className)}>
            <div className="flex max-w-2xl flex-col items-center justify-center gap-y-1.5 text-center">
                {illustration && <div className="mb-6">{illustration}</div>}

                <h2 className="text-sm font-medium text-foreground">{title}</h2>

                {description && (
                    <div className="max-w-100 text-center text-sm leading-5 text-muted-foreground">
                        {description}
                    </div>
                )}

                {action && <div className="mt-6">{action}</div>}
            </div>
        </div>
    );
}
