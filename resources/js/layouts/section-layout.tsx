import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { ReactNode } from 'react';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    useSidebar,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import type { NavGroup } from '@/types';

type Props = {
    /** Names the sidebar for screen readers, e.g. "Settings" or "site-1". */
    title: string;
    /**
     * The sections, in one or more labelled groups. Every item needs an icon — see below. One
     * group is the common case; Settings uses two, for the person and the organization.
     */
    groups: NavGroup[];
    children: ReactNode;
    className?: string;
};

/**
 * The standard arrangement for an area or resource with sections: a sidebar on the left, and a
 * centred content box beside it.
 *
 * The sidebar is shadcn's own, offset below the header exactly as the `sidebar-16` block does —
 * `top-(--header-height)` with a matching `!` height, because the container is fixed to the
 * viewport. `collapsible="icon"` and the `SidebarRail` come from `sidebar-07`: collapsing leaves
 * an icon rail rather than nothing, which is why every item needs an icon *and* a tooltip. Below
 * `md` the whole thing is the sheet `Sidebar` provides for itself (ADR-042).
 *
 * This is the only place in the app that may render a second-level `Sidebar`; two inside one
 * `SidebarProvider` fight over the same state. `tests/Feature/ShellStructureTest.php` asserts it.
 */
export function SectionLayout({ title, groups, children, className }: Props) {
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <>
            <Sidebar
                collapsible="icon"
                aria-label={title}
                className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
            >
                <SidebarContent>
                    {/*
                     * One `SidebarGroup` per scope. A sidebar may span more than one — Settings
                     * carries the person's sections and the organization's (ADR-046) — and the
                     * group label is what says which is which. It is hidden at rail width, where
                     * the groups are told apart by their spacing alone.
                     */}
                    {groups.map((group) => (
                        <SidebarGroup key={group.title}>
                            <SidebarGroupLabel className="truncate">
                                {group.title}
                            </SidebarGroupLabel>
                            <SidebarGroupContent>
                                {/*
                                 * The second navigation level: sections *within* one resource or
                                 * area (ADR-016). The menu bar carries the tenant-scoped areas;
                                 * this carries the sections of whatever you have opened, so it is
                                 * built from the sidebar menu rather than from styled links.
                                 */}
                                <SidebarMenu
                                    aria-label={group.title}
                                    className="gap-0.5"
                                >
                                    {group.items.map((item) => {
                                        // Exact match, not isCurrentOrParentUrl: sibling sections
                                        // can be literal path prefixes of each other (e.g.
                                        // `/settings` and `/settings/members`), which would
                                        // highlight both at once.
                                        const isCurrent = isCurrentUrl(
                                            item.href,
                                        );

                                        return (
                                            <SidebarMenuItem
                                                key={toUrl(item.href)}
                                            >
                                                <SidebarMenuButton
                                                    href={toUrl(item.href)}
                                                    // Safe as a plain boolean:
                                                    // `SidebarMenuButton` renders `data-active`
                                                    // and its variant matches on the value
                                                    // `true`, not on the attribute's presence.
                                                    isActive={isCurrent}
                                                    aria-current={
                                                        isCurrent
                                                            ? 'page'
                                                            : undefined
                                                    }
                                                    // Required, not decorative: at rail width the
                                                    // tooltip is the only label left.
                                                    tooltip={item.title}
                                                >
                                                    {item.icon && <item.icon />}
                                                    <span>{item.title}</span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        );
                                    })}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    ))}
                </SidebarContent>

                <SidebarFooter>
                    <SidebarCollapseButton />
                </SidebarFooter>

                <SidebarRail />
            </Sidebar>

            <SidebarInset>
                <div
                    className={cn(
                        'mx-auto flex w-full max-w-4xl flex-col gap-y-6 px-4 pt-6 pb-20 sm:px-8 sm:pt-8',
                        className,
                    )}
                >
                    {children}
                </div>
            </SidebarInset>
        </>
    );
}

/**
 * The sidebar's own collapse control, as the last item in its footer: an icon with a label, the
 * same shape as every other item above it, so it reads as part of the nav rather than as chrome
 * bolted on. At rail width it collapses to its icon and gains its tooltip like they do.
 *
 * On mobile the sidebar is a sheet, so the same press closes it — which is what "collapse" means
 * there. The label follows the state, so the icon is never the only clue.
 */
function SidebarCollapseButton() {
    const { state, isMobile, toggleSidebar } = useSidebar();
    const isCollapsed = state === 'collapsed' && !isMobile;
    const label = isCollapsed ? 'Expand sidebar' : 'Collapse sidebar';

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton
                    onPress={() => toggleSidebar()}
                    tooltip={label}
                    className="text-muted-foreground"
                >
                    {isCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
                    <span>{label}</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
