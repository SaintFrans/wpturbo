import { Form, Head, router } from '@inertiajs/react';
import { ChevronDown, Mail, UserPlus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import CancelInvitationModal from '@/components/cancel-invitation-modal';
import DeleteTeamModal from '@/components/delete-team-modal';
import InputError from '@/components/input-error';
import InviteMemberModal from '@/components/invite-member-modal';
import RemoveMemberModal from '@/components/remove-member-modal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Frame,
    FrameControl,
    FrameDescription,
    FrameFooter,
    FrameGroup,
    FrameHeader,
    FrameLabel,
    FramePanel,
    FrameRow,
    FrameTitle,
} from '@/components/ui/frame';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipTrigger } from '@/components/ui/tooltip';
import { useInitials } from '@/hooks/use-initials';
import { edit, index, update } from '@/routes/teams';
import { update as updateMember } from '@/routes/teams/members';
import type {
    RoleOption,
    Team,
    TeamInvitation,
    TeamMember,
    TeamPermissions,
} from '@/types';

type Props = {
    team: Team;
    members: TeamMember[];
    invitations: TeamInvitation[];
    permissions: TeamPermissions;
    availableRoles: RoleOption[];
};

export default function TeamEdit({
    team,
    members,
    invitations,
    permissions,
    availableRoles,
}: Props) {
    const getInitials = useInitials();

    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(
        null,
    );
    const [cancelInvitationDialogOpen, setCancelInvitationDialogOpen] =
        useState(false);
    const [invitationToCancel, setInvitationToCancel] =
        useState<TeamInvitation | null>(null);

    const pageTitle = useMemo(
        () =>
            permissions.canUpdateTeam
                ? `Edit ${team.name}`
                : `View ${team.name}`,
        [permissions.canUpdateTeam, team.name],
    );

    const updateMemberRole = (member: TeamMember, newRole: string) => {
        router.visit(updateMember([team.slug, member.id]), {
            data: { role: newRole },
            preserveScroll: true,
        });
    };

    const confirmRemoveMember = (member: TeamMember) => {
        setMemberToRemove(member);
        setRemoveMemberDialogOpen(true);
    };

    const confirmCancelInvitation = (invitation: TeamInvitation) => {
        setInvitationToCancel(invitation);
        setCancelInvitationDialogOpen(true);
    };

    return (
        <>
            <Head title={pageTitle} />

            <h1 className="sr-only">{pageTitle}</h1>

            <div className="flex flex-col gap-y-6">
                {permissions.canUpdateTeam ? (
                    <Form
                        {...update.form(team.slug)}
                        setDefaultsOnSuccess
                        className="w-full"
                    >
                        {({ errors, processing, isDirty, clearErrors }) => (
                            <Frame>
                                <FrameHeader>
                                    <FrameTitle>General</FrameTitle>
                                    <FrameDescription>
                                        Settings for this team.
                                    </FrameDescription>
                                </FrameHeader>

                                <FramePanel padded={false}>
                                    <FrameGroup>
                                        <FrameRow>
                                            <FrameLabel htmlFor="name">
                                                Team name
                                                <FrameDescription>
                                                    Appears in the switcher and
                                                    in this team's web address.
                                                </FrameDescription>
                                            </FrameLabel>
                                            <FrameControl className="flex-col items-stretch gap-1">
                                                <Input
                                                    id="name"
                                                    name="name"
                                                    data-test="team-name-input"
                                                    defaultValue={team.name}
                                                    required
                                                />
                                                <InputError
                                                    message={errors.name}
                                                />
                                            </FrameControl>
                                        </FrameRow>
                                    </FrameGroup>
                                </FramePanel>

                                {isDirty && (
                                    <FrameFooter>
                                        <Button
                                            type="reset"
                                            variant="ghost"
                                            size="sm"
                                            onPress={() => clearErrors()}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            size="sm"
                                            data-test="team-save-button"
                                            isDisabled={processing}
                                        >
                                            Save
                                        </Button>
                                    </FrameFooter>
                                )}
                            </Frame>
                        )}
                    </Form>
                ) : (
                    <Frame>
                        <FrameHeader>
                            <FrameTitle>{team.name}</FrameTitle>
                            <FrameDescription>
                                You do not have permission to change this team's
                                settings.
                            </FrameDescription>
                        </FrameHeader>
                    </Frame>
                )}

                <Frame>
                    <FrameHeader
                        action={
                            permissions.canCreateInvitation ? (
                                <Button
                                    size="sm"
                                    data-test="invite-member-button"
                                    onPress={() => setInviteDialogOpen(true)}
                                >
                                    <UserPlus /> Invite member
                                </Button>
                            ) : null
                        }
                    >
                        <FrameTitle>Members</FrameTitle>
                        <FrameDescription>
                            Who belongs to this team, and what they can do.
                        </FrameDescription>
                    </FrameHeader>

                    <FramePanel padded={false}>
                        <FrameGroup>
                            {members.map((member) => (
                                <div
                                    key={member.id}
                                    data-test="member-row"
                                    className="flex items-center justify-between gap-4 px-4 py-3"
                                >
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-10 w-10">
                                            {member.avatar ? (
                                                <AvatarImage
                                                    src={member.avatar}
                                                    alt={member.name}
                                                />
                                            ) : null}
                                            <AvatarFallback>
                                                {getInitials(member.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-medium">
                                                {member.name}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {member.email}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {member.role !== 'owner' &&
                                        permissions.canUpdateMember ? (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        data-test="member-role-trigger"
                                                    >
                                                        {member.role_label}
                                                        <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenu>
                                                    {availableRoles.map(
                                                        (role) => (
                                                            <DropdownMenuItem
                                                                key={role.value}
                                                                data-test="member-role-option"
                                                                onAction={() =>
                                                                    updateMemberRole(
                                                                        member,
                                                                        role.value,
                                                                    )
                                                                }
                                                            >
                                                                {role.label}
                                                            </DropdownMenuItem>
                                                        ),
                                                    )}
                                                </DropdownMenu>
                                            </DropdownMenu>
                                        ) : (
                                            <Badge variant="secondary">
                                                {member.role_label}
                                            </Badge>
                                        )}

                                        {member.role !== 'owner' &&
                                        permissions.canRemoveMember ? (
                                            <TooltipTrigger>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    data-test="member-remove-button"
                                                    onPress={() =>
                                                        confirmRemoveMember(
                                                            member,
                                                        )
                                                    }
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                                <Tooltip>Remove member</Tooltip>
                                            </TooltipTrigger>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </FrameGroup>
                    </FramePanel>
                </Frame>

                {invitations.length > 0 ? (
                    <Frame>
                        <FrameHeader>
                            <FrameTitle>Pending invitations</FrameTitle>
                            <FrameDescription>
                                Invitations that have not been accepted yet.
                            </FrameDescription>
                        </FrameHeader>

                        <FramePanel padded={false}>
                            <FrameGroup>
                                {invitations.map((invitation) => (
                                    <div
                                        key={invitation.code}
                                        data-test="invitation-row"
                                        className="flex items-center justify-between gap-4 px-4 py-3"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                                <Mail className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <div className="font-medium">
                                                    {invitation.email}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {invitation.role_label}
                                                </div>
                                            </div>
                                        </div>

                                        {permissions.canCancelInvitation ? (
                                            <TooltipTrigger>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    data-test="invitation-cancel-button"
                                                    onPress={() =>
                                                        confirmCancelInvitation(
                                                            invitation,
                                                        )
                                                    }
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                                <Tooltip>
                                                    Cancel invitation
                                                </Tooltip>
                                            </TooltipTrigger>
                                        ) : null}
                                    </div>
                                ))}
                            </FrameGroup>
                        </FramePanel>
                    </Frame>
                ) : null}

                {permissions.canDeleteTeam && !team.isPersonal ? (
                    <Frame>
                        <FrameHeader>
                            <FrameTitle className="text-destructive">
                                Danger
                            </FrameTitle>
                            <FrameDescription>
                                Destructive settings that cannot be undone.
                            </FrameDescription>
                        </FrameHeader>

                        <FramePanel padded={false}>
                            <FrameRow>
                                <FrameLabel>
                                    Delete team
                                    <FrameDescription>
                                        Deleting this team permanently removes
                                        it, along with its memberships and
                                        pending invitations.
                                    </FrameDescription>
                                </FrameLabel>

                                <FrameControl>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        data-test="delete-team-button"
                                        onPress={() =>
                                            setDeleteDialogOpen(true)
                                        }
                                    >
                                        Delete team
                                    </Button>
                                </FrameControl>
                            </FrameRow>
                        </FramePanel>
                    </Frame>
                ) : null}
            </div>

            {permissions.canCreateInvitation ? (
                <InviteMemberModal
                    team={team}
                    availableRoles={availableRoles}
                    open={inviteDialogOpen}
                    onOpenChange={setInviteDialogOpen}
                />
            ) : null}

            <RemoveMemberModal
                team={team}
                member={memberToRemove}
                open={removeMemberDialogOpen}
                onOpenChange={setRemoveMemberDialogOpen}
            />

            <CancelInvitationModal
                team={team}
                invitation={invitationToCancel}
                open={cancelInvitationDialogOpen}
                onOpenChange={setCancelInvitationDialogOpen}
            />

            {permissions.canDeleteTeam && !team.isPersonal ? (
                <DeleteTeamModal
                    team={team}
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                />
            ) : null}
        </>
    );
}

TeamEdit.layout = (props: { team: { name: string; slug: string } }) => ({
    breadcrumbs: [
        {
            title: 'Teams',
            href: index(),
        },
        {
            title: props.team.name,
            href: edit(props.team.slug),
        },
    ],
});
