import { Form, Head } from '@inertiajs/react';
import { useState } from 'react';
import DeleteOrganizationModal from '@/components/delete-organization-modal';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { update } from '@/routes/organizations';
import type { Organization, OrganizationPermissions } from '@/types';

type Props = {
    organization: Organization;
    permissions: OrganizationPermissions;
};

export default function OrganizationGeneralSettings({
    organization,
    permissions,
}: Props) {
    // The handle is collapsed behind a Change link: it is stable for the life of the
    // organization, so surfacing it as an editable field invites changes that break links.
    const [handleEditorOpen, setHandleEditorOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    return (
        <>
            <Head title={`${organization.name} settings`} />

            <div className="flex flex-col gap-y-6">
                {permissions.canUpdateOrganization ? (
                    <Form
                        {...update.form(organization.handle)}
                        setDefaultsOnSuccess
                        className="w-full"
                    >
                        {({ errors, processing, isDirty, clearErrors }) => (
                            <Frame>
                                <FrameHeader>
                                    <FrameTitle>General</FrameTitle>
                                    <FrameDescription>
                                        General settings related to the
                                        organization.
                                    </FrameDescription>
                                </FrameHeader>

                                <FramePanel padded={false}>
                                    <FrameGroup>
                                        <FrameRow>
                                            <FrameLabel htmlFor="name">
                                                Organization name
                                                <FrameDescription>
                                                    The name used to identify
                                                    your organization. Changing
                                                    it does not change the web
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

                                                {!(
                                                    handleEditorOpen ||
                                                    Boolean(errors.handle)
                                                ) && (
                                                    <p className="text-sm text-muted-foreground">
                                                        Your handle is{' '}
                                                        <span className="font-medium text-foreground">
                                                            {
                                                                organization.handle
                                                            }
                                                        </span>
                                                        .{' '}
                                                        <button
                                                            type="button"
                                                            data-test="organization-handle-change"
                                                            className="text-primary hover:underline"
                                                            onClick={() =>
                                                                setHandleEditorOpen(
                                                                    true,
                                                                )
                                                            }
                                                        >
                                                            Change
                                                        </button>
                                                    </p>
                                                )}
                                            </FrameControl>
                                        </FrameRow>

                                        {(handleEditorOpen ||
                                            Boolean(errors.handle)) && (
                                            <FrameRow>
                                                <FrameLabel htmlFor="handle">
                                                    Handle
                                                    <FrameDescription>
                                                        The handle used to
                                                        identify your
                                                        organization in URLs.
                                                        Existing links stop
                                                        working if you change
                                                        it.
                                                    </FrameDescription>
                                                </FrameLabel>
                                                <FrameControl className="flex-col items-stretch gap-1">
                                                    <Input
                                                        id="handle"
                                                        name="handle"
                                                        data-test="organization-handle-input"
                                                        defaultValue={
                                                            organization.handle
                                                        }
                                                        required
                                                    />
                                                    <InputError
                                                        message={errors.handle}
                                                    />
                                                </FrameControl>
                                            </FrameRow>
                                        )}
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
