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
import { store } from '@/routes/teams';

type Props = PropsWithChildren<{
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}>;

/**
 * Pass a trigger as children, or drive it with isOpen/onOpenChange. A menu item cannot
 * double as a dialog trigger in React Aria, so callers inside a menu use the controlled form.
 */
export default function CreateTeamModal({
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
                        <DialogTitle>Create a new team</DialogTitle>
                        <DialogDescription>
                            Create a new team to collaborate with others.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-2">
                        <Label htmlFor="name">Team name</Label>
                        <Input
                            id="name"
                            name="name"
                            data-test="create-team-name"
                            placeholder="My team"
                            required
                        />
                        <InputError message={errors.name} />
                    </div>

                    <DialogFooter className="gap-2">
                        <DialogClose variant="secondary">Cancel</DialogClose>

                        <Button
                            type="submit"
                            data-test="create-team-submit"
                            isDisabled={processing}
                        >
                            Create team
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
