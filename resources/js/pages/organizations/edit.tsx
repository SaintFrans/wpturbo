import { Form, Head, router } from '@inertiajs/react';
import { ChevronDown, Mail, UserPlus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import CancelInvitationModal from '@/components/cancel-invitation-modal';
import DeleteOrganizationModal from '@/components/delete-organization-modal';
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
import { edit, index, update } from '@/routes/organizations';
import { update as updateMember } from '@/routes/organizations/members';
import type {
    RoleOption,
    Organization,
    OrganizationInvitation,
    OrganizationMember,
    OrganizationPermissions,
} from '@/types';

type Props = {
    organization: Organization;
    members: OrganizationMember[];
    invitations: OrganizationInvitation[];
    permissions: OrganizationPermissions;
    availableRoles: RoleOption[];
};

export default function OrganizationEdit({
    organization,
    members,
    invitations,
    permissions,
    availableRoles,
}: Props) {
    const getInitials = useInitials();

    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
    const [memberToRemove, setMemberToRemove] =
        useState<OrganizationMember | null>(null);
    const [cancelInvitationDialogOpen, setCancelInvitationDialogOpen] =
        useState(false);
    const [invitationToCancel, setInvitationToCancel] =
        useState<OrganizationInvitation | null>(null);

    const pageTitle = useMemo(
        () =>
            permissions.canUpdateOrganization
                ? `Edit ${organization.name}`
                : `View ${organization.name}`,
        [permissions.canUpdateOrganization, organization.name],
    );

    const updateMemberRole = (member: OrganizationMember, newRole: string) => {
        router.visit(updateMember([organization.publicId, member.id]), {
            data: { role: newRole },
            preserveScroll: true,
        });
    };

    const confirmRemoveMember = (member: OrganizationMember) => {
        setMemberToRemove(member);
        setRemoveMemberDialogOpen(true);
    };

    const confirmCancelInvitation = (invitation: OrganizationInvitation) => {
        setInvitationToCancel(invitation);
        setCancelInvitationDialogOpen(true);
    };

    return (
        <>
            <Head title={pageTitle} />

            <h1 className="sr-only">{pageTitle}</h1>

            <div className="flex flex-col gap-y-6">
                {permissions.canUpdateOrganization ? (
                    <Form
                        {...update.form(organization.publicId)}
                        setDefaultsOnSuccess
                        className="w-full"
                    >
                        {({ errors, processing, isDirty, clearErrors }) => (
                            <Frame>
                                <FrameHeader>
                                    <FrameTitle>General</FrameTitle>
                                    <FrameDescription>
                                        Settings for this organization.
                                    </FrameDescription>
                                </FrameHeader>

                                <FramePanel padded={false}>
                                    <FrameGroup>
                                        <FrameRow>
                                            <FrameLabel htmlFor="name">
                                                Organization name
                                                <FrameDescription>
                                                    Appears in the switcher and
                                                    in this organization's web
                                                    address.
                                                </FrameDescription>
                                            </FrameLabel>
                                            <FrameControl className="flex-col items-stretch gap-1">
                                                <Input
                                                    id="name"
                                                    name="name"
                                                    data-test="organization-name-input"
                                                    defaultValue={
                                                        organization.name
                                                    }
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
                                            data-test="organization-save-button"
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
                            <FrameTitle>{organization.name}</FrameTitle>
                            <FrameDescription>
                                You do not have permission to change this
                                organization's settings.
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
                            Who belongs to this organization, and what they can
                            do.
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

                {permissions.canDeleteOrganization &&
                !organization.isPersonal ? (
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
                                    Delete organization
                                    <FrameDescription>
                                        Deleting this organization permanently
                                        removes it, along with its memberships
                                        and pending invitations.
                                    </FrameDescription>
                                </FrameLabel>

                                <FrameControl>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        data-test="delete-organization-button"
                                        onPress={() =>
                                            setDeleteDialogOpen(true)
                                        }
                                    >
                                        Delete organization
                                    </Button>
                                </FrameControl>
                            </FrameRow>
                        </FramePanel>
                    </Frame>
                ) : null}
            </div>

            {permissions.canCreateInvitation ? (
                <InviteMemberModal
                    organization={organization}
                    availableRoles={availableRoles}
                    open={inviteDialogOpen}
                    onOpenChange={setInviteDialogOpen}
                />
            ) : null}

            <RemoveMemberModal
                organization={organization}
                member={memberToRemove}
                open={removeMemberDialogOpen}
                onOpenChange={setRemoveMemberDialogOpen}
            />

            <CancelInvitationModal
                organization={organization}
                invitation={invitationToCancel}
                open={cancelInvitationDialogOpen}
                onOpenChange={setCancelInvitationDialogOpen}
            />

            {permissions.canDeleteOrganization && !organization.isPersonal ? (
                <DeleteOrganizationModal
                    organization={organization}
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                />
            ) : null}
        </>
    );
}

OrganizationEdit.layout = (props: {
    organization: { name: string; publicId: string };
}) => ({
    breadcrumbs: [
        {
            title: 'Organizations',
            href: index(),
        },
        {
            title: props.organization.name,
            href: edit(props.organization.publicId),
        },
    ],
});
