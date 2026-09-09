import { Form } from '@inertiajs/react';
import type { PropsWithChildren, ReactNode } from 'react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { store } from '@/routes/organizations';

type Props = PropsWithChildren<{
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}>;

/**
 * Pass a trigger as children, or drive it with isOpen/onOpenChange. A menu item cannot
 * double as a dialog trigger in React Aria, so callers inside a menu use the controlled form.
 */
export default function CreateOrganizationModal({
    children,
    isOpen,
    onOpenChange,
}: Props) {
    const [internalOpen, setInternalOpen] = useState(false);

    const open = isOpen ?? internalOpen;
    const setOpen = onOpenChange ?? setInternalOpen;

    const body: ReactNode = (
        <Form
            key={String(open)}
            {...store.form()}
            className="space-y-6"
            onSuccess={() => setOpen(false)}
        >
            {({ errors, processing }) => (
                <>
                    <DialogHeader>
                        <DialogTitle>Create a new organization</DialogTitle>
                        <DialogDescription>
                            Create a new organization to collaborate with
                            others.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-2">
                        <Label htmlFor="name">Organization name</Label>
                        <Input
                            id="name"
                            name="name"
                            data-test="create-organization-name"
                            placeholder="My organization"
                            required
                        />
                        <InputError message={errors.name} />
                    </div>

                    <DialogFooter className="gap-2">
                        <DialogClose variant="secondary">Cancel</DialogClose>

                        <Button
                            type="submit"
                            data-test="create-organization-submit"
                            isDisabled={processing}
                        >
                            Create organization
                        </Button>
                    </DialogFooter>
                </>
            )}
        </Form>
    );

    if (!children) {
        return (
            <Dialog isOpen={open} onOpenChange={setOpen}>
                {body}
            </Dialog>
        );
    }

    return (
        <DialogTrigger isOpen={open} onOpenChange={setOpen}>
            {children}
            <Dialog>{body}</Dialog>
        </DialogTrigger>
    );
}
