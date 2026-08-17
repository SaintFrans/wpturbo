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
import { leave as leaveOrganizationAction } from '@/routes/organizations';
import type { Organization } from '@/types';

type Props = {
    organization: Organization | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export default function LeaveOrganizationModal({
    organization,
    open,
    onOpenChange,
}: Props) {
    const [processing, setProcessing] = useState(false);

    const leaveOrganization = () => {
        if (!organization) {
            return;
        }

        router.visit(leaveOrganizationAction(organization.handle), {
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Dialog isOpen={open} onOpenChange={onOpenChange}>
            <DialogHeader>
                <DialogTitle>Leave organization</DialogTitle>
                <DialogDescription>
                    Are you sure you want to leave{' '}
                    <strong>{organization?.name}</strong>?
                </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2">
                <DialogClose variant="secondary">Cancel</DialogClose>

                <Button
                    variant="destructive"
                    data-test="leave-organization-confirm"
                    isDisabled={processing}
                    onPress={leaveOrganization}
                >
                    Leave organization
                </Button>
            </DialogFooter>
        </Dialog>
    );
}
