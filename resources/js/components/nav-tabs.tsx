import { Link } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import type { NavItem } from '@/types';

type Props = {
    items: NavItem[];
    label: string;
    className?: string;
};

/**
 * Horizontal tabs with an underline that slides to the active tab.
 *
 * The indicator is measured from the DOM rather than positioned per tab, so it animates
 * between them and stays correct when labels change width. It is hidden until the first
 * measurement, which avoids a frame of it sitting at the left edge.
 */
export function NavTabs({ items, label, className }: Props) {
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const listRef = useRef<HTMLElement>(null);
    const [indicator, setIndicator] = useState<{
        left: number;
        width: number;
    } | null>(null);

    const measure = useCallback(() => {
        const list = listRef.current;
        const active = list?.querySelector<HTMLElement>(
            '[data-current="true"]',
        );

        if (!list || !active) {
            setIndicator(null);

            return;
        }

        setIndicator({
            left: active.offsetLeft,
            width: active.offsetWidth,
        });
    }, []);

    useEffect(() => {
        measure();

        window.addEventListener('resize', measure);

        return () => window.removeEventListener('resize', measure);
    }, [measure, items]);

    return (
        <nav
            ref={listRef}
            aria-label={label}
            className={cn('relative flex gap-6', className)}
        >
            {items.map((item) => {
                const isCurrent = isCurrentOrParentUrl(item.href);

                return (
                    <Link
                        key={toUrl(item.href)}
                        href={item.href}
                        data-current={isCurrent}
                        aria-current={isCurrent ? 'page' : undefined}
                        className={cn(
                            'group relative inline-block cursor-pointer py-3 text-sm font-medium whitespace-nowrap focus:outline-none',
                            isCurrent
                                ? 'text-foreground'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        <span className="-mx-2.5 flex h-8 items-center rounded-lg px-2.5 group-hover:bg-accent group-focus-visible:bg-accent">
                            {item.icon && <item.icon className="mr-2 size-4" />}
                            {item.title}
                        </span>
                    </Link>
                );
            })}

            <span
                aria-hidden="true"
                className={cn(
                    'absolute bottom-0 h-0.5 bg-foreground transition-all',
                    indicator ? 'opacity-100' : 'opacity-0',
                )}
                style={{
                    left: `${indicator?.left ?? 0}px`,
                    width: `${indicator?.width ?? 0}px`,
                }}
            />
        </nav>
    );
}
