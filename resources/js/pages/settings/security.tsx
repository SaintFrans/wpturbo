import { Form, Head } from '@inertiajs/react';
import { useRef } from 'react';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import InputError from '@/components/input-error';
import type { Props as ManagePasskeysProps } from '@/components/manage-passkeys';
import ManagePasskeys from '@/components/manage-passkeys';
import type { Props as ManageTwoFactorProps } from '@/components/manage-two-factor';
import ManageTwoFactor from '@/components/manage-two-factor';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import {
    Frame,
    FrameControl,
    FrameDescription,
    FrameFooter,
    FrameGroup,
    FrameHeader,
    FrameLabel,
    FramePanel,
    FrameRow,
    FrameTitle,
} from '@/components/ui/frame';
import { edit } from '@/routes/security';

type Props = {
    passwordRules: string;
} & ManagePasskeysProps &
    ManageTwoFactorProps;

export default function Security(props: Props) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <>
            <Head title="Security settings" />

            <h1 className="sr-only">Security settings</h1>

            <Form
                {...SecurityController.update.form()}
                options={{ preserveScroll: true }}
                resetOnError={[
                    'password',
                    'password_confirmation',
                    'current_password',
                ]}
                resetOnSuccess
                onError={(errors) => {
                    if (errors.password) {
                        passwordInput.current?.focus();
                    }

                    if (errors.current_password) {
                        currentPasswordInput.current?.focus();
                    }
                }}
                className="w-full"
            >
                {({ errors, processing, isDirty, clearErrors }) => (
                    <Frame>
                        <FrameHeader>
                            <FrameTitle>Password</FrameTitle>
                            <FrameDescription>
                                You can change your password here.
                            </FrameDescription>
                        </FrameHeader>

                        <FramePanel padded={false}>
                            {/* One change, three fields: no rules between them. */}
                            <FrameGroup divided={false}>
                                <FrameRow>
                                    <FrameLabel htmlFor="current_password">
                                        Current password
                                        <FrameDescription>
                                            You must confirm your current
                                            password to make changes.
                                        </FrameDescription>
                                    </FrameLabel>
                                    <FrameControl className="flex-col items-stretch gap-1">
                                        <PasswordInput
                                            id="current_password"
                                            ref={currentPasswordInput}
                                            name="current_password"
                                            autoComplete="current-password"
                                            placeholder="Current password"
                                        />
                                        <InputError
                                            message={errors.current_password}
                                        />
                                    </FrameControl>
                                </FrameRow>

                                <FrameRow>
                                    <FrameLabel htmlFor="password">
                                        New password
                                        <FrameDescription>
                                            Choose a long, random password you
                                            do not use elsewhere.
                                        </FrameDescription>
                                    </FrameLabel>
                                    <FrameControl className="flex-col items-stretch gap-1">
                                        <PasswordInput
                                            id="password"
                                            ref={passwordInput}
                                            name="password"
                                            autoComplete="new-password"
                                            placeholder="New password"
                                            passwordrules={props.passwordRules}
                                        />
                                        <InputError message={errors.password} />
                                    </FrameControl>
                                </FrameRow>

                                <FrameRow>
                                    <FrameLabel htmlFor="password_confirmation">
                                        Confirm new password
                                        <FrameDescription>
                                            Enter your new password again.
                                        </FrameDescription>
                                    </FrameLabel>
                                    <FrameControl className="flex-col items-stretch gap-1">
                                        <PasswordInput
                                            id="password_confirmation"
                                            name="password_confirmation"
                                            autoComplete="new-password"
                                            placeholder="Confirm password"
                                            passwordrules={props.passwordRules}
                                        />
                                        <InputError
                                            message={
                                                errors.password_confirmation
                                            }
                                        />
                                    </FrameControl>
                                </FrameRow>
                            </FrameGroup>
                        </FramePanel>

                        {isDirty && (
                            <FrameFooter>
                                <Button
                                    // A native reset fires the DOM reset event, which is
                                    // what clears Inertia's dirty state — calling reset()
                                    // does not when the fields are already at defaults.
                                    type="reset"
                                    variant="ghost"
                                    size="sm"
                                    onPress={() => clearErrors()}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    isDisabled={processing}
                                    data-test="update-password-button"
                                >
                                    Save
                                </Button>
                            </FrameFooter>
                        )}
                    </Frame>
                )}
            </Form>

            <ManageTwoFactor
                canManageTwoFactor={props.canManageTwoFactor}
                requiresConfirmation={props.requiresConfirmation}
                twoFactorEnabled={props.twoFactorEnabled}
            />

            <ManagePasskeys
                canManagePasskeys={props.canManagePasskeys}
                passkeys={props.passkeys}
            />
        </>
    );
}

Security.layout = {
    breadcrumbs: [
        {
            title: 'Security settings',
            href: edit(),
        },
    ],
};
