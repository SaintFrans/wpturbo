import { usePage } from '@inertiajs/react';
import { ChevronsUpDown } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { UserInfo } from '@/components/user-info';
import { UserMenuContent } from '@/components/user-menu-content';
import { useIsMobile } from '@/hooks/use-mobile';

export function NavUser() {
    const { auth, currentTeam } = usePage().props;
    const { state } = useSidebar();
    const isMobile = useIsMobile();

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                {/* In React Aria the trigger is the root of the menu. */}
                <DropdownMenuTrigger>
                    <SidebarMenuButton
                        size="lg"
                        className="group text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent"
                        data-test="sidebar-menu-button"
                    >
                        <UserInfo user={auth.user} team={currentTeam} />
                        <ChevronsUpDown className="ml-auto size-4" />
                    </SidebarMenuButton>
                    <DropdownMenu
                        className="min-w-56 rounded-lg"
                        placement={
                            isMobile || state !== 'collapsed'
                                ? 'bottom end'
                                : 'left'
                        }
                    >
                        <UserMenuContent user={auth.user} />
                    </DropdownMenu>
                </DropdownMenuTrigger>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
