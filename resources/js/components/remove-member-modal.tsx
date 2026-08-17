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
import { destroy as destroyMember } from '@/routes/organizations/members';
import type { Organization, OrganizationMember } from '@/types';

type Props = {
    organization: Organization;
    member: OrganizationMember | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export default function RemoveMemberModal({
    organization,
    member,
    open,
    onOpenChange,
}: Props) {
    const [processing, setProcessing] = useState(false);

    const removeMember = () => {
        if (!member) {
            return;
        }

        router.visit(destroyMember([organization.publicId, member.id]), {
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Dialog isOpen={open} onOpenChange={onOpenChange}>
            <DialogHeader>
                <DialogTitle>Remove organization member</DialogTitle>
                <DialogDescription>
                    Are you sure you want to remove{' '}
                    <strong>{member?.name}</strong> from this organization?
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
