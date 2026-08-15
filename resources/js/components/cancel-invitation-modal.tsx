import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { destroy as destroyInvitation } from '@/routes/teams/invitations';
import type { Team, TeamInvitation } from '@/types';

type Props = {
    team: Team;
    invitation: TeamInvitation | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export default function CancelInvitationModal({
    team,
    invitation,
    open,
    onOpenChange,
}: Props) {
    const [processing, setProcessing] = useState(false);

    const cancelInvitation = () => {
        if (!invitation) {
            return;
        }

        router.visit(destroyInvitation([team.slug, invitation.code]), {
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Dialog isOpen={open} onOpenChange={onOpenChange}>
            <DialogHeader>
                <DialogTitle>Cancel invitation</DialogTitle>
                <DialogDescription>
                    Are you sure you want to cancel the invitation for{' '}
                    <strong>{invitation?.email}</strong>?
                </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2">
                <DialogClose variant="secondary">Keep invitation</DialogClose>

                <Button
                    variant="destructive"
                    data-test="cancel-invitation-confirm"
                    isDisabled={processing}
                    onPress={cancelInvitation}
                >
                    Cancel invitation
                </Button>
            </DialogFooter>
        </Dialog>
    );
}
