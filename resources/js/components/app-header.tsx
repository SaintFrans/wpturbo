import { Link, usePage } from '@inertiajs/react';
import { Menu } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { NavTabs } from '@/components/nav-tabs';
import { OrganizationSwitcher } from '@/components/organization-switcher';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { toUrl } from '@/lib/utils';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

const supportNavItems: NavItem[] = [
    {
        title: 'Docs',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: null,
    },
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: null,
    },
];

export function AppHeader() {
    const page = usePage();
    const { auth, currentOrganization } = page.props;
    const getInitials = useInitials();
    const dashboardUrl = currentOrganization
        ? dashboard(currentOrganization.publicId)
        : '/';

    // Tenant-scoped areas. Servers, Applications and DNS join this row as they are built
    // (ADR-016); sections *within* a resource belong in a SectionNav, not here.
    //
    // Account settings and organization administration are deliberately absent: both hang off the
    // avatar menu, keeping this row for the product itself.
    const areaNavItems: NavItem[] = [
        { title: 'Overview', href: dashboardUrl, icon: null },
    ];

    return (
        <div className="sticky top-0 z-30 bg-background">
            {/* Row one: identity and account. Persistent at every depth. */}
            <header className="mx-auto max-w-[1920px] px-4 sm:px-8">
                <nav className="flex h-16.5 items-center gap-5">
                    <div className="lg:hidden">
                        <Sheet>
                            <SheetTrigger>
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Open navigation"
                                >
                                    <Menu className="size-5" />
                                </Button>
                            </SheetTrigger>
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
                                <div className="flex flex-1 flex-col gap-4 p-4 text-sm">
                                    <div className="flex flex-col gap-3">
                                        {areaNavItems.map((item) => (
                                            <Link
                                                key={item.title}
                                                href={item.href}
                                                className="font-medium"
                                            >
                                                {item.title}
                                            </Link>
                                        ))}
                                    </div>
                                    <div className="mt-auto flex flex-col gap-3">
                                        {supportNavItems.map((item) => (
                                            <a
                                                key={item.title}
                                                href={toUrl(item.href)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-medium"
                                            >
                                                {item.title}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>

                    <Link
                        href={dashboardUrl}
                        prefetch
                        className="hidden rounded-md text-foreground focus:outline-none sm:block"
                        aria-label="Overview"
                    >
                        <AppLogoIcon className="size-6 fill-current" />
                    </Link>

                    <div className="-ml-1 flex min-w-0 items-center sm:ml-0">
                        <OrganizationSwitcher inHeader />
                    </div>

                    <div aria-hidden="true" className="flex-1" />

                    <div className="flex items-center gap-1">
                        <div className="hidden items-center xl:flex">
                            {supportNavItems.map((item) => (
                                <a
                                    key={item.title}
                                    href={toUrl(item.href)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex h-8 items-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:bg-accent"
                                >
                                    {item.title}
                                </a>
                            ))}
                        </div>

                        <DropdownMenuTrigger>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full p-1"
                                aria-label="Account"
                            >
                                <Avatar className="size-8 overflow-hidden rounded-full">
                                    <AvatarImage
                                        src={auth.user.avatar}
                                        alt={auth.user.name}
                                    />
                                    <AvatarFallback className="rounded-full bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                                        {getInitials(auth.user.name)}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                            <DropdownMenu
                                className="w-56"
                                placement="bottom end"
                            >
                                <UserMenuContent user={auth.user} />
                            </DropdownMenu>
                        </DropdownMenuTrigger>
                    </div>
                </nav>
            </header>

            {/* Row two: the areas themselves. */}
            <div className="relative z-10 border-b border-sidebar-border/60 sm:border-none">
                <div className="mx-auto w-full max-w-[1920px] overflow-x-auto px-4 sm:px-8">
                    <NavTabs items={areaNavItems} label="Areas" />
                </div>
            </div>

            {/*
                The content panel scrolls underneath this sticky header, which would cut its
                rounded top off with a hard edge. This redraws the panel's top corners and
                top border as part of the header, so the panel always appears to begin just
                below it however far the page is scrolled.
            */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 -bottom-8 hidden px-0 sm:block sm:px-2"
            >
                <div className="relative -mx-px -mt-px h-8">
                    {/* Mask whatever passes outside the rounded corners. */}
                    <div className="absolute -top-px -left-px size-4 bg-background" />
                    <div className="absolute -top-px -right-px size-4 bg-background" />

                    {/* The panel's own top edge and corners. */}
                    <div className="absolute inset-x-4 top-0 h-px border-t border-sidebar-border bg-panel" />
                    <div className="absolute top-0 left-0 size-4 rounded-tl-lg border-t border-l border-sidebar-border bg-panel" />
                    <div className="absolute top-0 right-0 size-4 rounded-tr-lg border-t border-r border-sidebar-border bg-panel" />
                </div>
            </div>
        </div>
    );
}
