import { router } from '@inertiajs/react';
import { useState } from 'react';
import OrganizationInvitationController from '@/actions/App/Http/Controllers/Organizations/OrganizationInvitationController';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { DashboardInvitation } from '@/types';

type Props = {
    invitations: DashboardInvitation[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export default function PendingInvitationsModal({
    invitations,
    open,
    onOpenChange,
}: Props) {
    const [processingId, setProcessingId] = useState<number | null>(null);

    const acceptInvitation = (invitation: DashboardInvitation) => {
        router.visit(OrganizationInvitationController.accept(invitation), {
            onStart: () => setProcessingId(invitation.id),
            onFinish: () => setProcessingId(null),
        });
    };

    const declineInvitation = (invitation: DashboardInvitation) => {
        router.visit(OrganizationInvitationController.decline(invitation), {
            onStart: () => setProcessingId(invitation.id),
            onFinish: () => setProcessingId(null),
            onSuccess: () => {
                if (invitations.length === 1) {
                    onOpenChange(false);
                }
            },
        });
    };

    return (
        <Dialog isOpen={open} onOpenChange={onOpenChange}>
            <DialogHeader>
                <DialogTitle>Pending organization invitations</DialogTitle>
                <DialogDescription>
                    Accept or decline the organizations you have been invited to
                    join.
                </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
                {invitations.map((invitation) => (
                    <div
                        key={invitation.id}
                        data-test="pending-invitation-row"
                        className="rounded-lg border p-4"
                    >
                        <div className="space-y-1">
                            <p className="font-medium">
                                {invitation.organization.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {invitation.inviterName} invited you to join
                                this organization.
                            </p>
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <Button
                                variant="secondary"
                                data-test="pending-invitation-decline"
                                isDisabled={processingId === invitation.id}
                                onPress={() => declineInvitation(invitation)}
                            >
                                Decline
                            </Button>

                            <Button
                                data-test="pending-invitation-accept"
                                isDisabled={processingId === invitation.id}
                                onPress={() => acceptInvitation(invitation)}
                            >
                                Accept
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </Dialog>
    );
}
