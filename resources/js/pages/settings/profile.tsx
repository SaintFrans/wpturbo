import { Form, Head, Link, usePage } from '@inertiajs/react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import InputError from '@/components/input-error';
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
import { Input } from '@/components/ui/input';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import type { Auth } from '@/types';

type PageProps = {
    auth: Auth;
};

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<PageProps>().props;

    return (
        <>
            <Head title="Profile settings" />

            <h1 className="sr-only">Profile settings</h1>

            <Form
                {...ProfileController.update.form()}
                options={{ preserveScroll: true }}
                className="w-full"
            >
                {({ processing, errors, isDirty, clearErrors }) => (
                    <Frame>
                        <FrameHeader>
                            <FrameTitle>General</FrameTitle>
                            <FrameDescription>
                                General settings related to your profile.
                            </FrameDescription>
                        </FrameHeader>

                        <FramePanel padded={false}>
                            <FrameGroup>
                                <FrameRow>
                                    <FrameLabel htmlFor="name">
                                        Name
                                        <FrameDescription>
                                            Your full name.
                                        </FrameDescription>
                                    </FrameLabel>
                                    <FrameControl className="flex-col items-stretch gap-1">
                                        <Input
                                            id="name"
                                            name="name"
                                            defaultValue={auth.user.name}
                                            required
                                            autoComplete="name"
                                            placeholder="Full name"
                                        />
                                        <InputError message={errors.name} />
                                    </FrameControl>
                                </FrameRow>

                                <FrameRow>
                                    <FrameLabel htmlFor="email">
                                        Email address
                                        <FrameDescription>
                                            The email address used for
                                            authentication and notifications.
                                        </FrameDescription>
                                        {mustVerifyEmail &&
                                            auth.user.email_verified_at ===
                                                null && (
                                                <FrameDescription className="mt-2">
                                                    Your email address is
                                                    unverified.{' '}
                                                    <Link
                                                        href={send()}
                                                        as="button"
                                                        className="text-foreground underline underline-offset-4"
                                                    >
                                                        Re-send the verification
                                                        email.
                                                    </Link>
                                                    {status ===
                                                        'verification-link-sent' && (
                                                        <span className="mt-1 block font-medium text-green-600">
                                                            A new verification
                                                            link has been sent.
                                                        </span>
                                                    )}
                                                </FrameDescription>
                                            )}
                                    </FrameLabel>
                                    <FrameControl className="flex-col items-stretch gap-1">
                                        <Input
                                            id="email"
                                            type="email"
                                            name="email"
                                            defaultValue={auth.user.email}
                                            required
                                            autoComplete="username"
                                            placeholder="Email address"
                                        />
                                        <InputError message={errors.email} />
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
                                    data-test="update-profile-button"
                                >
                                    Save
                                </Button>
                            </FrameFooter>
                        )}
                    </Frame>
                )}
            </Form>

            <DeleteUser />
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Profile settings',
            href: edit(),
        },
    ],
};
