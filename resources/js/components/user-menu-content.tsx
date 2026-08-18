import { router } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    LogOut,
    Monitor,
    Moon,
    Sun,
    UserRound,
    SwatchBook,
} from 'lucide-react';
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import type { Appearance } from '@/hooks/use-appearance';
import { useAppearance } from '@/hooks/use-appearance';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { cn, toUrl } from '@/lib/utils';
import { logout } from '@/routes';
import { edit } from '@/routes/profile';
import type { User } from '@/types';

type Props = {
    user: User;
};

const themes: { value: Appearance; icon: LucideIcon; label: string }[] = [
    { value: 'system', icon: Monitor, label: 'System' },
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
];

export function UserMenuContent({ user }: Props) {
    const cleanup = useMobileNavigation();
    const { appearance, updateAppearance } = useAppearance();

    const handleLogout = () => {
        cleanup();
        router.flushAll();
        router.visit(logout());
    };

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                {/* href routes through the RouterProvider wired to Inertia in app.tsx. */}
                <DropdownMenuItem href={toUrl(edit())} onAction={cleanup}>
                    <UserRound className="mr-2" />
                    Account
                </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onAction={handleLogout} data-test="logout-button">
                <LogOut className="mr-2" />
                Log out
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            {/*
             * Theme sits in the menu rather than in Account settings: it is a per-device display
             * preference, so it belongs where it can be flipped from any page. Rendered inside a
             * Header, the one menu slot that accepts arbitrary content — plain elements would
             * break React Aria's menu collection.
             */}
            <DropdownMenuLabel className="relative flex cursor-default items-center justify-between gap-2 rounded-sm px-2 py-1 text-sm font-thin text-foreground outline-hidden select-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
                <div className="flex items-center gap-4">
                    <SwatchBook />
                    Theme
                </div>
                <div className="flex h-6.5 gap-x-1 rounded-sm bg-muted p-0.5 shadow-inner">
                    {themes.map(({ value, icon: Icon, label }) => (
                        <button
                            key={value}
                            type="button"
                            aria-label={label}
                            aria-pressed={appearance === value}
                            data-test={`appearance-${value}`}
                            onClick={() => updateAppearance(value)}
                            className={cn(
                                'flex h-5.5 w-6 items-center justify-center rounded transition-colors *:size-4',
                                appearance === value
                                    ? 'border border-border bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                            )}
                        >
                            <Icon />
                        </button>
                    ))}
                </div>
            </DropdownMenuLabel>
        </>
    );
}
