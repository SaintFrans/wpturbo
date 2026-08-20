import { Form } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { store as storeClient, update as updateClient } from '@/routes/clients';
import type { Client, Organization } from '@/types';

type Props = {
    organization: Organization;
    /** The client being edited, or null to create a new one. */
    client: Client | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

/**
 * One dialog for both creating and editing a client: the fields are identical, and a second
 * component would only mean two places to add the next one to.
 */
export default function SaveClientModal({
    organization,
    client,
    open,
    onOpenChange,
}: Props) {
    const isEditing = client !== null;

    return (
        <Dialog isOpen={open} onOpenChange={onOpenChange}>
            <Form
                // Remounts the form whenever the dialog opens or the client behind it changes,
                // so the defaults below are re-read instead of holding the previous client's.
                key={`${String(open)}-${client?.id ?? 'new'}`}
                {...(isEditing
                    ? updateClient.form([organization.handle, client.id])
                    : storeClient.form(organization.handle))}
                className="space-y-6"
                onSuccess={() => onOpenChange(false)}
            >
                {({ errors, processing }) => (
                    <>
                        <DialogHeader>
                            <DialogTitle>
                                {isEditing ? 'Edit client' : 'Add a client'}
                            </DialogTitle>
                            <DialogDescription>
                                Clients group the sites you build and maintain
                                for one customer. Only the name is required.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    data-test="client-name"
                                    defaultValue={client?.name ?? ''}
                                    placeholder="De Boer Bouw"
                                    autoComplete="off"
                                    autoFocus
                                    required
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="contact_name">
                                    Contact person
                                </Label>
                                <Input
                                    id="contact_name"
                                    name="contact_name"
                                    data-test="client-contact-name"
                                    defaultValue={client?.contactName ?? ''}
                                    placeholder="Optional"
                                    autoComplete="off"
                                />
                                <InputError message={errors.contact_name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="contact_email">
                                    Email address
                                </Label>
                                <Input
                                    id="contact_email"
                                    name="contact_email"
                                    type="email"
                                    data-test="client-contact-email"
                                    defaultValue={client?.contactEmail ?? ''}
                                    placeholder="Optional"
                                    autoComplete="off"
                                />
                                <InputError message={errors.contact_email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="contact_phone">
                                    Phone number
                                </Label>
                                <Input
                                    id="contact_phone"
                                    name="contact_phone"
                                    data-test="client-contact-phone"
                                    defaultValue={client?.contactPhone ?? ''}
                                    placeholder="Optional"
                                    autoComplete="off"
                                />
                                <InputError message={errors.contact_phone} />
                            </div>
                        </div>

                        <DialogFooter className="gap-2">
                            <DialogClose variant="secondary">
                                Cancel
                            </DialogClose>

                            <Button
                                type="submit"
                                data-test="client-submit"
                                isDisabled={processing}
                            >
                                {isEditing ? 'Save changes' : 'Add client'}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </Form>
        </Dialog>
    );
}
