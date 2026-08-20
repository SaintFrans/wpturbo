import { Form } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { destroy as destroyClient } from '@/routes/clients';
import type { Client, Organization } from '@/types';

type Props = {
    organization: Organization;
    client: Client | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

/**
 * No type-the-name confirmation here, unlike deleting an organization: a client is a label, and
 * removing one destroys nothing but the grouping. The dialog is the whole safeguard, alongside
 * the permission that hides the button from members.
 */
export default function DeleteClientModal({
    organization,
    client,
    open,
    onOpenChange,
}: Props) {
    return (
        <Dialog isOpen={open} onOpenChange={onOpenChange}>
            {client ? (
                <Form
                    key={client.id}
                    {...destroyClient.form([organization.handle, client.id])}
                    className="space-y-6"
                    onSuccess={() => onOpenChange(false)}
                >
                    {({ processing }) => (
                        <>
                            <DialogHeader>
                                <DialogTitle>Delete this client?</DialogTitle>
                                <DialogDescription>
                                    <strong>"{client.name}"</strong> will be
                                    removed. Anything grouped under this client
                                    keeps existing and becomes ungrouped.
                                </DialogDescription>
                            </DialogHeader>

                            <DialogFooter className="gap-2">
                                <DialogClose variant="secondary">
                                    Cancel
                                </DialogClose>

                                <Button
                                    type="submit"
                                    variant="destructive"
                                    data-test="delete-client-confirm"
                                    isDisabled={processing}
                                >
                                    Delete client
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            ) : null}
        </Dialog>
    );
}
