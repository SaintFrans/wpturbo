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
import { destroy as destroyMember } from '@/routes/teams/members';
import type { Team, TeamMember } from '@/types';

type Props = {
    team: Team;
    member: TeamMember | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export default function RemoveMemberModal({
    team,
    member,
    open,
    onOpenChange,
}: Props) {
    const [processing, setProcessing] = useState(false);

    const removeMember = () => {
        if (!member) {
            return;
        }

        router.visit(destroyMember([team.slug, member.id]), {
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Dialog isOpen={open} onOpenChange={onOpenChange}>
            <DialogHeader>
                <DialogTitle>Remove team member</DialogTitle>
                <DialogDescription>
                    Are you sure you want to remove{' '}
                    <strong>{member?.name}</strong> from this team?
                </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2">
                <DialogClose variant="secondary">Cancel</DialogClose>

                <Button
                    variant="destructive"
                    data-test="remove-member-confirm"
                    isDisabled={processing}
                    onPress={removeMember}
                >
                    Remove member
                </Button>
            </DialogFooter>
        </Dialog>
    );
}
