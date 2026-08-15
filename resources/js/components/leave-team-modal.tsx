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
import { leave as leaveTeamAction } from '@/routes/teams';
import type { Team } from '@/types';

type Props = {
    team: Team | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export default function LeaveTeamModal({ team, open, onOpenChange }: Props) {
    const [processing, setProcessing] = useState(false);

    const leaveTeam = () => {
        if (!team) {
            return;
        }

        router.visit(leaveTeamAction(team.slug), {
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Dialog isOpen={open} onOpenChange={onOpenChange}>
            <DialogHeader>
                <DialogTitle>Leave team</DialogTitle>
                <DialogDescription>
                    Are you sure you want to leave <strong>{team?.name}</strong>
                    ?
                </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2">
                <DialogClose variant="secondary">Cancel</DialogClose>

                <Button
                    variant="destructive"
                    data-test="leave-team-confirm"
                    isDisabled={processing}
                    onPress={leaveTeam}
                >
                    Leave team
                </Button>
            </DialogFooter>
        </Dialog>
    );
}
