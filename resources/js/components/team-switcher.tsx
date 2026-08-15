import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Check, ChevronsUpDown, Plus, Users } from 'lucide-react';
import CreateTeamModal from '@/components/create-team-modal';
import { Button, LinkButton } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { toUrl } from '@/lib/utils';
import { dashboard } from '@/routes';
import { switchMethod } from '@/routes/teams';
import type { Team } from '@/types';

type TeamSwitcherProps = {
    inHeader?: boolean;
};

export function TeamSwitcher({ inHeader = false }: TeamSwitcherProps) {
    const page = usePage();
    const isMobile = useIsMobile();
    const [createTeamOpen, setCreateTeamOpen] = useState(false);
    const currentTeam = page.props.currentTeam;
    const teams = page.props.teams ?? [];
    const dashboardUrl = currentTeam ? dashboard(currentTeam.slug) : '/';

    const switchTeam = (team: Team) => {
        const previousTeamSlug = currentTeam?.slug;

        router.visit(switchMethod(team.slug), {
            onFinish: () => {
                if (!previousTeamSlug || typeof window === 'undefined') {
                    router.reload();

                    return;
                }

                const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
                const segment = `/${previousTeamSlug}`;

                if (currentUrl.includes(segment)) {
                    router.visit(currentUrl.replace(segment, `/${team.slug}`), {
                        replace: true,
                    });

                    return;
                }

                router.reload();
            },
        });
    };

    return (
        <>
            {/* Two controls, not one: the name navigates to the team's dashboard, the
                chevron opens the switcher. Splitting them means the common action — going
                home — does not require opening a menu first. */}
            <div
                className={
                    inHeader
                        ? 'flex min-w-0 items-center gap-0.5'
                        : 'flex w-full items-center gap-0.5'
                }
            >
                <LinkButton
                    href={toUrl(dashboardUrl)}
                    variant="ghost"
                    data-test="team-switcher-name"
                    className={
                        inHeader
                            ? 'h-8 min-w-0 gap-2 px-2 font-medium'
                            : 'h-8 min-w-0 flex-1 justify-start gap-2 px-2 font-semibold'
                    }
                >
                    <Users
                        className={
                            inHeader
                                ? 'hidden'
                                : 'hidden size-4 shrink-0 group-data-[collapsible=icon]:block'
                        }
                    />
                    <span
                        className={
                            inHeader
                                ? 'max-w-40 truncate xl:max-w-60'
                                : 'truncate group-data-[collapsible=icon]:hidden'
                        }
                    >
                        {currentTeam?.name ?? 'Select team'}
                    </span>
                </LinkButton>

                <DropdownMenuTrigger>
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        data-test="team-switcher-trigger"
                        aria-label="Switch team"
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                        <ChevronsUpDown className="size-4" />
                    </Button>
                    <DropdownMenu
                        className={inHeader ? 'w-56' : 'min-w-56 rounded-lg'}
                        // Left edge of the menu lines up with the chevron that opened it.
                        placement={
                            !inHeader && !isMobile ? 'right' : 'bottom start'
                        }
                    >
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Teams
                        </DropdownMenuLabel>
                        {teams.map((team) => (
                            <DropdownMenuItem
                                key={team.id}
                                data-test="team-switcher-item"
                                className={
                                    inHeader
                                        ? 'cursor-pointer gap-2'
                                        : 'cursor-pointer gap-2 p-2'
                                }
                                onAction={() => switchTeam(team)}
                            >
                                {team.name}
                                {currentTeam?.id === team.id && (
                                    <Check
                                        className={
                                            inHeader
                                                ? 'ml-auto size-4'
                                                : 'ml-auto h-4 w-4'
                                        }
                                    />
                                )}
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            data-test="team-switcher-new-team"
                            className={
                                inHeader
                                    ? 'cursor-pointer gap-2'
                                    : 'cursor-pointer gap-2 p-2'
                            }
                            onAction={() => setCreateTeamOpen(true)}
                        >
                            <Plus className={inHeader ? 'size-4' : 'h-4 w-4'} />
                            <span className="text-muted-foreground">
                                New team
                            </span>
                        </DropdownMenuItem>
                    </DropdownMenu>
                </DropdownMenuTrigger>
            </div>

            {/* Driven by state: the menu closes on action, then the dialog opens. */}
            <CreateTeamModal
                isOpen={createTeamOpen}
                onOpenChange={setCreateTeamOpen}
            />
        </>
    );
}
