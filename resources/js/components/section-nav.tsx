import { Link } from '@inertiajs/react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import type { NavItem } from '@/types';

type Props = {
    items: NavItem[];
    /** Names the nav for screen readers, e.g. "Settings" or "server-1". */
    label: string;
    className?: string;
};

/**
 * The second navigation level: sections *within* one resource or area.
 *
 * The top nav carries tenant-scoped areas; this carries the sections of whatever you have
 * opened — a server's facilities, an application's tabs, the settings pages. Contextual by
 * design, so each resource type can present its own sections (ADR-016).
 *
 * Plain links rather than buttons: these navigate, they do not act, and an Inertia <Link>
 * keeps prefetching available.
 */
export function SectionNav({ items, label, className }: Props) {
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <nav
            aria-label={label}
            className={cn('flex flex-col gap-y-1', className)}
        >
            {items.map((item) => {
                // Exact match, not isCurrentOrParentUrl: sibling sections can be literal
                // path prefixes of each other (e.g. `/settings` and `/settings/members`),
                // which would otherwise highlight both at once.
                const isCurrent = isCurrentUrl(item.href);

                return (
                    <Link
                        key={toUrl(item.href)}
                        href={item.href}
                        prefetch
                        aria-current={isCurrent ? 'page' : undefined}
                        className={cn(
                            'inline-flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:bg-accent',
                            isCurrent
                                ? 'bg-accent font-medium text-foreground'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                        )}
                    >
                        {item.icon && <item.icon className="size-4" />}
                        {item.title}
                    </Link>
                );
            })}
        </nav>
    );
}
