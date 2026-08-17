import { Head } from '@inertiajs/react';
import { Eye, LogOut, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import CreateOrganizationModal from '@/components/create-organization-modal';
import LeaveOrganizationModal from '@/components/leave-organization-modal';
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
import { edit, index } from '@/routes/organizations';
import type { Organization } from '@/types';
import { toUrl } from '@/lib/utils';

type Props = {
    organizations: Organization[];
};

export default function OrganizationsIndex({ organizations }: Props) {
    const [leaveOrganizationDialogOpen, setLeaveOrganizationDialogOpen] =
        useState(false);
    const [organizationLeaving, setOrganizationLeaving] =
        useState<Organization | null>(null);

    const openLeaveOrganizationDialog = (organization: Organization) => {
        setOrganizationLeaving(organization);
        setLeaveOrganizationDialogOpen(true);
    };

    return (
        <>
            <Head title="Organizations" />

            <h1 className="sr-only">Organizations</h1>

            <Frame>
                <FrameHeader
                    action={
                        <CreateOrganizationModal>
                            <Button
                                size="sm"
                                data-test="organizations-new-organization-button"
                            >
                                <Plus /> New organization
                            </Button>
                        </CreateOrganizationModal>
                    }
                >
                    <FrameTitle>Organizations</FrameTitle>
                    <FrameDescription>
                        Manage your organizations and organization memberships.
                    </FrameDescription>
                </FrameHeader>

                <FramePanel padded={false}>
                    <FrameGroup>
                        {organizations.map((organization) => {
                            const canLeaveOrganization =
                                !organization.isPersonal &&
                                organization.role !== 'owner';

                            return (
                                <FrameRow
                                    key={organization.id}
                                    data-test="organization-row"
                                >
                                    <FrameLabel>
                                        <span className="flex items-center gap-2">
                                            {organization.name}
                                            {organization.isPersonal ? (
                                                <Badge variant="secondary">
                                                    Personal
                                                </Badge>
                                            ) : null}
                                        </span>
                                        <FrameDescription>
                                            {organization.roleLabel}
                                        </FrameDescription>
                                    </FrameLabel>

                                    <FrameControl className="gap-2 sm:max-w-none">
                                        {canLeaveOrganization ? (
                                            <TooltipTrigger>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    data-test="organization-leave-button"
                                                    onPress={() =>
                                                        openLeaveOrganizationDialog(
                                                            organization,
                                                        )
                                                    }
                                                >
                                                    <LogOut className="h-4 w-4" />
                                                </Button>
                                                <Tooltip>
                                                    Leave organization
                                                </Tooltip>
                                            </TooltipTrigger>
                                        ) : null}

                                        {organization.role === 'member' ? (
                                            <TooltipTrigger>
                                                <LinkButton
                                                    variant="ghost"
                                                    size="sm"
                                                    data-test="organization-view-button"
                                                    href={toUrl(
                                                        edit(
                                                            organization.publicId,
                                                        ),
                                                    )}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </LinkButton>
                                                <Tooltip>
                                                    View organization
                                                </Tooltip>
                                            </TooltipTrigger>
                                        ) : (
                                            <TooltipTrigger>
                                                <LinkButton
                                                    variant="ghost"
                                                    size="sm"
                                                    data-test="organization-edit-button"
                                                    href={toUrl(
                                                        edit(
                                                            organization.publicId,
                                                        ),
                                                    )}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </LinkButton>
                                                <Tooltip>
                                                    Edit organization
                                                </Tooltip>
                                            </TooltipTrigger>
                                        )}
                                    </FrameControl>
                                </FrameRow>
                            );
                        })}

                        {organizations.length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                                You don't belong to any organizations yet.
                            </p>
                        ) : null}
                    </FrameGroup>
                </FramePanel>
            </Frame>

            <LeaveOrganizationModal
                organization={organizationLeaving}
                open={leaveOrganizationDialogOpen}
                onOpenChange={setLeaveOrganizationDialogOpen}
            />
        </>
    );
}

OrganizationsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Organizations',
            href: index(),
        },
    ],
};
