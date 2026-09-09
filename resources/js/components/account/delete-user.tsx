import { Form } from '@inertiajs/react';
import { useRef } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
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
import {
    Frame,
    FrameControl,
    FrameDescription,
    FrameHeader,
    FrameLabel,
    FramePanel,
    FrameRow,
    FrameTitle,
} from '@/components/ui/frame';
import { Label } from '@/components/ui/label';

export default function DeleteUser() {
    const passwordInput = useRef<HTMLInputElement>(null);

    return (
        <Frame>
            <FrameHeader>
                <FrameTitle className="text-destructive-foreground">
                    Danger
                </FrameTitle>
                <FrameDescription>
                    Destructive settings that cannot be undone.
                </FrameDescription>
            </FrameHeader>

            <FramePanel padded={false}>
                <FrameRow>
                    <FrameLabel>
                        Delete account
                        <FrameDescription>
                            Deleting your user will permanently delete all user
                            data. You should download any data that you wish to
                            retain.
                        </FrameDescription>
                    </FrameLabel>

                    <FrameControl>
                        {/* DialogTrigger is the root: it holds the trigger and the
                            Dialog side by side. Nesting the trigger inside the Dialog
                            renders neither, because the Dialog is closed. */}
                        <DialogTrigger>
                            <Button
                                variant="destructive"
                                size="sm"
                                data-test="delete-user-button"
                            >
                                Delete account
                            </Button>

                            <Dialog>
                                <DialogHeader>
                                    <DialogTitle>
                                        Are you sure you want to delete your
                                        account?
                                    </DialogTitle>
                                    <DialogDescription>
                                        Once your account is deleted, all of its
                                        resources and data will also be
                                        permanently deleted. Please enter your
                                        password to confirm you would like to
                                        permanently delete your account.
                                    </DialogDescription>
                                </DialogHeader>

                                <Form
                                    {...ProfileController.destroy.form()}
                                    options={{
                                        preserveScroll: true,
                                    }}
                                    onError={() =>
                                        passwordInput.current?.focus()
                                    }
                                    resetOnSuccess
                                    className="space-y-6"
                                >
                                    {({
                                        resetAndClearErrors,
                                        processing,
                                        errors,
                                    }) => (
                                        <>
                                            <div className="grid gap-2">
                                                <Label
                                                    htmlFor="password"
                                                    className="sr-only"
                                                >
                                                    Password
                                                </Label>

                                                <PasswordInput
                                                    id="password"
                                                    name="password"
                                                    ref={passwordInput}
                                                    placeholder="Password"
                                                    autoComplete="current-password"
                                                />

                                                <InputError
                                                    message={errors.password}
                                                />
                                            </div>

                                            <DialogFooter className="gap-2">
                                                <DialogClose
                                                    variant="ghost"
                                                    onPress={() =>
                                                        resetAndClearErrors()
                                                    }
                                                >
                                                    Cancel
                                                </DialogClose>

                                                <Button
                                                    variant="destructive"
                                                    type="submit"
                                                    isDisabled={processing}
                                                    data-test="confirm-delete-user-button"
                                                >
                                                    Delete account
                                                </Button>
                                            </DialogFooter>
                                        </>
                                    )}
                                </Form>
                            </Dialog>
                        </DialogTrigger>
                    </FrameControl>
                </FrameRow>
            </FramePanel>
        </Frame>
    );
}
