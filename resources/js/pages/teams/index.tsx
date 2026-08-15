import { Head } from '@inertiajs/react';
import { Eye, LogOut, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import CreateTeamModal from '@/components/create-team-modal';
import LeaveTeamModal from '@/components/leave-team-modal';
import { Badge } from '@/components/ui/badge';
import {
    Frame,
    FrameControl,
    FrameDescription,
    FrameGroup,
    FrameHeader,
    FrameLabel,
    FramePanel,
    FrameRow,
    FrameTitle,
} from '@/components/ui/frame';
import { Button, LinkButton } from '@/components/ui/button';
import { Tooltip, TooltipTrigger } from '@/components/ui/tooltip';
import { edit, index } from '@/routes/teams';
import type { Team } from '@/types';
import { toUrl } from '@/lib/utils';

type Props = {
    teams: Team[];
};

export default function TeamsIndex({ teams }: Props) {
    const [leaveTeamDialogOpen, setLeaveTeamDialogOpen] = useState(false);
    const [teamLeaving, setTeamLeaving] = useState<Team | null>(null);

    const openLeaveTeamDialog = (team: Team) => {
        setTeamLeaving(team);
        setLeaveTeamDialogOpen(true);
    };

    return (
        <>
            <Head title="Teams" />

            <h1 className="sr-only">Teams</h1>

            <Frame>
                <FrameHeader
                    action={
                        <CreateTeamModal>
                            <Button size="sm" data-test="teams-new-team-button">
                                <Plus /> New team
                            </Button>
                        </CreateTeamModal>
                    }
                >
                    <FrameTitle>Teams</FrameTitle>
                    <FrameDescription>
                        Manage your teams and team memberships.
                    </FrameDescription>
                </FrameHeader>

                <FramePanel padded={false}>
                    <FrameGroup>
                        {teams.map((team) => {
                            const canLeaveTeam =
                                !team.isPersonal && team.role !== 'owner';

                            return (
                                <FrameRow key={team.id} data-test="team-row">
                                    <FrameLabel>
                                        <span className="flex items-center gap-2">
                                            {team.name}
                                            {team.isPersonal ? (
                                                <Badge variant="secondary">
                                                    Personal
                                                </Badge>
                                            ) : null}
                                        </span>
                                        <FrameDescription>
                                            {team.roleLabel}
                                        </FrameDescription>
                                    </FrameLabel>

                                    <FrameControl className="gap-2 sm:max-w-none">
                                        {canLeaveTeam ? (
                                            <TooltipTrigger>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    data-test="team-leave-button"
                                                    onPress={() =>
                                                        openLeaveTeamDialog(
                                                            team,
                                                        )
                                                    }
                                                >
                                                    <LogOut className="h-4 w-4" />
                                                </Button>
                                                <Tooltip>Leave team</Tooltip>
                                            </TooltipTrigger>
                                        ) : null}

                                        {team.role === 'member' ? (
                                            <TooltipTrigger>
                                                <LinkButton
                                                    variant="ghost"
                                                    size="sm"
                                                    data-test="team-view-button"
                                                    href={toUrl(
                                                        edit(team.slug),
                                                    )}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </LinkButton>
                                                <Tooltip>View team</Tooltip>
                                            </TooltipTrigger>
                                        ) : (
                                            <TooltipTrigger>
                                                <LinkButton
                                                    variant="ghost"
                                                    size="sm"
                                                    data-test="team-edit-button"
                                                    href={toUrl(
                                                        edit(team.slug),
                                                    )}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </LinkButton>
                                                <Tooltip>Edit team</Tooltip>
                                            </TooltipTrigger>
                                        )}
                                    </FrameControl>
                                </FrameRow>
                            );
                        })}

                        {teams.length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                                You don't belong to any teams yet.
                            </p>
                        ) : null}
                    </FrameGroup>
                </FramePanel>
            </Frame>

            <LeaveTeamModal
                team={teamLeaving}
                open={leaveTeamDialogOpen}
                onOpenChange={setLeaveTeamDialogOpen}
            />
        </>
    );
}

TeamsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Teams',
            href: index(),
        },
    ],
};
