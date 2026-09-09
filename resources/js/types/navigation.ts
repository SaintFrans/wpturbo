import type { InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';

export type NavItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
};

/**
 * A labelled set of section nav items. `SectionLayout` renders one `SidebarGroup` per group, so a
 * sidebar can carry more than one scope at once — the Settings sidebar holds the person's sections
 * and the organization's beneath them (ADR-046).
 */
export type NavGroup = {
    title: string;
    items: NavItem[];
};
