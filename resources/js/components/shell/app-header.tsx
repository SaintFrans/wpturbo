import { Link, router, usePage } from '@inertiajs/react';
import {
    Building2,
    Check,
    LayoutGrid,
    LogOut,
    Menu,
    Moon,
    Plus,
    Settings,
    Sun,
} from 'lucide-react';
import { useState } from 'react';
import CreateOrganizationModal from '@/components/organizations/create-organization-modal';
import { AppLogoIcon } from '@/components/shell/app-logo';
import { AppSearch } from '@/components/shell/app-search';
import { NavTabs } from '@/components/shell/nav-tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Switch } from '@/components/ui/switch';
import { useAppearance } from '@/hooks/use-appearance';
import { useInitials } from '@/hooks/use-initials';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { useSwitchOrganization } from '@/hooks/use-switch-organization';
import { pageHasSections } from '@/lib/sections';
import { cn, toUrl } from '@/lib/utils';
import { dashboard, logout } from '@/routes';
import { index as clients } from '@/routes/clients';
import { edit as profile } from '@/routes/profile';
import type { NavItem, Organization, User } from '@/types';

/**
 * One menu bar, built on shadcn's `sidebar-16` header: sticky, `--header-height` tall, with the
 * sidebar toggle first and a vertical separator after it.
 *
 * Ours is three zones on a `1fr auto 1fr` grid: logo and the tenant-scoped _areas_ on the left,
 * the search dead centre, and the account menu on the right. The equal flanks are what centre
 * the search on the header rather than on its neighbours.
 *
 * Areas are the first navigation level (ADR-016); sections *within* a resource belong in the
 * section sidebar `SectionLayout` renders below this bar — never here.
 *
 * Settings does not live in the areas: it is one destination carrying both scopes — the person's
 * sections and the organization's, as two groups of one sidebar (ADR-046) — reached from the
 * account menu rather than from a pill in the bar.
 */
export function AppHeader() {
    const page = usePage();
    const { currentOrganization } = page.props;
    const dashboardUrl = currentOrganization
        ? dashboard(currentOrganization.handle)
        : '/';

    // The toggle is rendered only where there is a sidebar to toggle. The header sits above the
    // sidebar in the tree, so it asks the page rather than being told.
    const hasSections = pageHasSections(page.component);

    const areaNavItems: NavItem[] = [
        { title: 'Overview', href: dashboardUrl, icon: LayoutGrid },
        ...(currentOrganization
            ? [
                  {
                      title: 'Clients',
                      href: clients(currentOrganization.handle),
                      icon: Building2,
                  },
              ]
            : []),
    ];

    return (
        <header className="sticky top-0 z-50 flex w-full items-center border-b bg-background">
            {/* Equal flanks, so the search is centred on the header rather than on whatever
                happens to be beside it. */}
            <div className="grid h-(--header-height) w-full grid-cols-[1fr_auto_1fr] items-center gap-2 px-4">
                <div className="flex min-w-0 items-center gap-4">
                    {/* Below `md` the section sidebar is a sheet with no visible edge to grab, so
                    the header keeps a way in. From `md` up the sidebar carries its own collapse
                    button in its footer. */}
                    {hasSections && (
                        <>
                            <SidebarTrigger className="size-8 md:hidden" />
                            <Separator
                                orientation="vertical"
                                className="mr-2 md:hidden data-vertical:h-4 data-vertical:self-auto"
                            />
                        </>
                    )}

                    {/* The areas, for screens too narrow for the pill nav. SheetTrigger is the root
                    and holds the trigger *and* the sheet — the React Aria inversion. Nesting it
                    inside a sheet renders neither. */}
                    <SheetTrigger>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Open navigation"
                            className="shrink-0 lg:hidden"
                        >
                            <Menu className="size-5" />
                        </Button>
                        <SheetContent
                            side="left"
                            className="flex w-64 flex-col bg-sidebar"
                        >
                            <SheetTitle className="sr-only">
                                Navigation
                            </SheetTitle>
                            <SheetHeader className="text-left">
                                <AppLogoIcon className="size-6 fill-current text-foreground" />
                            </SheetHeader>
                            <div className="flex flex-1 flex-col gap-1 p-2 text-sm">
                                {areaNavItems.map((item) => (
                                    <Link
                                        key={item.title}
                                        href={item.href}
                                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 font-medium hover:bg-accent"
                                    >
                                        {item.icon && (
                                            <item.icon className="size-4" />
                                        )}
                                        {item.title}
                                    </Link>
                                ))}
                            </div>
                        </SheetContent>
                    </SheetTrigger>

                    <Link
                        href={dashboardUrl}
                        prefetch
                        className="hidden shrink-0 rounded-md text-foreground focus:outline-none sm:block"
                        aria-label="Overview"
                    >
                        <AppLogoIcon className="size-5 fill-current" />
                    </Link>

                    <NavTabs
                        items={areaNavItems}
                        label="Areas"
                        variant="pill"
                        className="hidden lg:flex"
                    />
                </div>

                <AppSearch />

                <div className="flex min-w-0 items-center justify-end gap-1">
                    <AccountMenu />
                </div>
            </div>
        </header>
    );
}

/**
 * The bar's right-hand control: one button, showing the active organization, like Linear's
 * workspace switcher. The menu it opens carries the person at the top, one Settings item covering
 * both scopes (ADR-046), and "Switch organization" at the bottom, where the switcher used to be its
 * own separate control beside this one. Settings used to be an area in the bar; it moved here so
 * the bar carries only Overview and Clients.
 *
 * There are **no separator rules between the items in the account section** — the groups are told
 * apart by the section label and the spacing around it, which is what keeps a menu this short from
 * looking like a form. Every row carries a leading icon so the labels share one column; a row
 * without one hangs out to the left and the list stops reading as a list. "Switch organization" is
 * set off from the account section by one `DropdownMenuSeparator`.
 *
 * "Switch organization" is a `DropdownMenuSub`, not a flat section: the organization list and
 * "New organization" sit one layer down, in its `DropdownMenuSubContent`, behind the one row this
 * menu shows for the tenant scope. `DropdownMenuSub` is `SubmenuTriggerPrimitive` underneath, so
 * the same React Aria inversion applies — `DropdownMenuSubTrigger` and `DropdownMenuSubContent`
 * are siblings inside it, not nested.
 *
 * `DropdownMenuTrigger` is the root and holds the trigger *and* the menu — the React Aria
 * inversion. Written the Radix way it renders neither, silently.
 *
 * A menu item cannot itself be a dialog trigger, so "New organization" opens
 * `CreateOrganizationModal` through `isOpen`/`onOpenChange` state rather than as a nested trigger.
 */
function AccountMenu() {
    const page = usePage();
    const { auth, currentOrganization } = page.props;
    const organizations = page.props.organizations ?? [];
    const getInitials = useInitials();
    const switchOrganization = useSwitchOrganization();
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    return (
        <>
            <DropdownMenuTrigger>
                <Button
                    variant="outline"
                    shape="pill"
                    data-test="account-menu-trigger"
                    aria-label="Account and organization menu"
                    className="h-9 min-w-0 gap-2 ps-1 pe-3 sm:h-8"
                >
                    <Avatar className="size-6 shrink-0 overflow-hidden rounded-full">
                        <AvatarFallback className="rounded-full bg-neutral-200 text-[10px] text-black dark:bg-neutral-700 dark:text-white">
                            {getInitials(currentOrganization?.name ?? '?')}
                        </AvatarFallback>
                    </Avatar>

                    <span className="hidden max-w-40 truncate text-sm font-medium sm:block">
                        {currentOrganization?.name ?? 'Select organization'}
                    </span>
                </Button>

                <DropdownMenu className="w-64" placement="bottom end">
                    <AccountMenuContent user={auth.user} />

                    <DropdownMenuSeparator />

                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger
                            data-test="organization-switcher-trigger"
                            className="gap-2.5"
                        >
                            <Building2 className="text-muted-foreground" />
                            Switch organization
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                            {organizations.map((organization: Organization) => (
                                <DropdownMenuItem
                                    key={organization.id}
                                    data-test="organization-switcher-item"
                                    className="cursor-pointer gap-2.5"
                                    onAction={() =>
                                        switchOrganization(organization)
                                    }
                                >
                                    <Avatar className="size-4 shrink-0 overflow-hidden rounded-full">
                                        <AvatarFallback className="rounded-full bg-neutral-200 text-[8px] text-black dark:bg-neutral-700 dark:text-white">
                                            {getInitials(organization.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="truncate">
                                        {organization.name}
                                    </span>
                                    {currentOrganization?.id ===
                                        organization.id && (
                                        <Check className="ms-auto size-4 text-muted-foreground" />
                                    )}
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuItem
                                data-test="organization-switcher-new-organization"
                                className="cursor-pointer gap-2.5"
                                onAction={() => setIsCreateOpen(true)}
                            >
                                <Plus className="text-muted-foreground" />
                                New organization
                            </DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                </DropdownMenu>
            </DropdownMenuTrigger>

            {/* Driven by state: the menu closes on action, then the dialog opens. */}
            <CreateOrganizationModal
                isOpen={isCreateOpen}
                onOpenChange={setIsCreateOpen}
            />
        </>
    );
}

function UserAvatar({ user, className }: { user: User; className?: string }) {
    const getInitials = useInitials();

    return (
        <Avatar className={cn('overflow-hidden rounded-full', className)}>
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="rounded-full bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                {getInitials(user.name)}
            </AvatarFallback>
        </Avatar>
    );
}

function AccountMenuContent({ user }: { user: User }) {
    const cleanup = useMobileNavigation();
    const { resolvedAppearance, updateAppearance } = useAppearance();

    const handleLogout = () => {
        cleanup();
        router.flushAll();
        router.visit(logout());
    };

    return (
        <>
            <DropdownMenuLabel className="flex items-center gap-2.5 px-2 py-2 font-normal">
                <UserAvatar user={user} className="size-8 shrink-0" />
                <div className="grid min-w-0 flex-1 text-left">
                    <span className="truncate text-sm leading-tight font-semibold text-foreground">
                        {user.name}
                    </span>
                    <span className="truncate text-xs leading-tight text-muted-foreground">
                        {user.email}
                    </span>
                </div>
            </DropdownMenuLabel>

            {/*
             * One Settings item, not two (ADR-046). The person's settings and the organization's
             * are two groups of one sidebar now, so the menu points at the first of them — Profile
             * — and the organization's sections are one click away in the sidebar beside it.
             *
             * href routes through the RouterProvider wired to Inertia in app.tsx.
             */}
            <DropdownMenuItem
                href={toUrl(profile())}
                onAction={cleanup}
                className="gap-2.5"
            >
                <Settings className="text-muted-foreground" />
                Settings
            </DropdownMenuItem>

            {/*
             * Theme sits in the menu rather than in Account settings: it is a per-device display
             * preference, so it belongs where it can be flipped from any page.
             *
             * Just light and dark — no "System" option. A normal DropdownMenuItem, like the rows
             * around it: the whole row toggles the preference, not only the switch inside it. The
             * `Switch` is read-only and its own clicks fall through (`pointer-events-none`), so the
             * one toggle happens in `onAction` rather than twice. The leading icon follows the
             * resolved theme — Sun while light, Moon while dark — rather than a static glyph.
             *
             * `shouldCloseOnSelect={false}` — every other item's action navigates or logs out, so
             * the menu closing behind it is right; this one flips a preference you often want to
             * see take effect, then keep looking at, without reopening the menu.
             */}
            <DropdownMenuItem
                onAction={() =>
                    updateAppearance(
                        resolvedAppearance === 'dark' ? 'light' : 'dark',
                    )
                }
                shouldCloseOnSelect={false}
                data-test="appearance-toggle"
                className="gap-2.5"
            >
                {resolvedAppearance === 'dark' ? (
                    <Moon className="text-muted-foreground" />
                ) : (
                    <Sun className="text-muted-foreground" />
                )}
                <span className="flex-1">Theme</span>
                <Switch
                    size="sm"
                    isReadOnly
                    aria-hidden="true"
                    isSelected={resolvedAppearance === 'dark'}
                    className="pointer-events-none"
                />
            </DropdownMenuItem>

            <DropdownMenuItem
                onAction={handleLogout}
                data-test="logout-button"
                className="gap-2.5"
            >
                <LogOut className="text-muted-foreground" />
                Log out
            </DropdownMenuItem>
        </>
    );
}
