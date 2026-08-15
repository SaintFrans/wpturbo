import { router } from '@inertiajs/react';
import { KeyRound } from 'lucide-react';
import { destroy } from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyRegistrationController';
import {
    Frame,
    FrameDescription,
    FrameGroup,
    FrameHeader,
    FramePanel,
    FrameTitle,
} from '@/components/ui/frame';
import PasskeyItem from '@/components/passkey-item';
import PasskeyRegistration from '@/components/passkey-register';
import type { Passkey } from '@/types/auth';

export type Props = {
    canManagePasskeys?: boolean;
    passkeys?: Passkey[];
};

const EmptyState = () => {
    return (
        <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <KeyRound className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-medium">No passkeys yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
                Add a passkey to sign in without a password
            </p>
        </div>
    );
};

export default function ManagePasskeys(props: Props) {
    const passkeys = props.passkeys ?? [];

    const handleDelete = (id: number, onError: () => void) => {
        router.delete(destroy.url(id), {
            preserveScroll: true,
            onError,
        });
    };

    const handleRegisterSuccess = () => {
        router.reload();
    };

    if (!(props.canManagePasskeys ?? false)) {
        return null;
    }

    return (
        <Frame>
            <FrameHeader
                action={
                    <PasskeyRegistration onSuccess={handleRegisterSuccess} />
                }
            >
                <FrameTitle>Passkeys</FrameTitle>
                <FrameDescription>
                    Sign in without a password, using your device.
                </FrameDescription>
            </FrameHeader>

            <FramePanel padded={false}>
                <FrameGroup>
                    {passkeys.length > 0 ? (
                        passkeys.map((passkey) => (
                            <PasskeyItem
                                key={passkey.id}
                                passkey={passkey}
                                onDelete={handleDelete}
                            />
                        ))
                    ) : (
                        <EmptyState />
                    )}
                </FrameGroup>
            </FramePanel>
        </Frame>
    );
}
