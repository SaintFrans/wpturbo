import { usePasskeyRegister } from '@laravel/passkeys/react';
import { router } from '@inertiajs/react';
import { KeyRound, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { destroy } from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyRegistrationController';
import { EmptyState } from '@/components/empty-state';
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
import {
    Frame,
    FrameDescription,
    FrameGroup,
    FrameHeader,
    FramePanel,
    FrameTitle,
} from '@/components/ui/frame';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Passkey } from '@/types/auth';

export type Props = {
    canManagePasskeys?: boolean;
    passkeys?: Passkey[];
};

/**
 * The Passkeys card on Account → Security: the list, the row, and the registration dialog.
 *
 * All three are one feature and have no other caller, so they live in one file rather than in
 * three that can only be read together.
 */
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
                        <EmptyState
                            title="No passkeys yet"
                            description="Add a passkey to sign in without a password."
                            illustration={
                                <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
                                    <KeyRound className="size-7 text-muted-foreground" />
                                </div>
                            }
                        />
                    )}
                </FrameGroup>
            </FramePanel>
        </Frame>
    );
}

type PasskeyItemProps = {
    passkey: Passkey;
    onDelete: (id: number, onError: () => void) => void;
};

function PasskeyItem({ passkey, onDelete }: PasskeyItemProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = () => {
        setIsDeleting(true);
        onDelete(passkey.id, () => setIsDeleting(false));
    };

    return (
        <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <KeyRound className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <p className="font-medium tracking-tight">
                            {passkey.name}
                        </p>
                        {passkey.authenticator && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase ring-1 ring-border ring-inset">
                                {passkey.authenticator}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Added {passkey.created_at_diff}
                        {passkey.last_used_at_diff && (
                            <>
                                <span className="mx-1 text-muted-foreground/50">
                                    /
                                </span>
                                Last used {passkey.last_used_at_diff}
                            </>
                        )}
                    </p>
                </div>
            </div>

            <DialogTrigger>
                <Button
                    variant="destructive"
                    size="icon-sm"
                    aria-label={`Remove ${passkey.name}`}
                >
                    <Trash2 />
                </Button>

                <Dialog>
                    <DialogHeader>
                        <DialogTitle>Remove passkey</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove the "{passkey.name}"
                            passkey? You will no longer be able to use it to
                            sign in.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="gap-2">
                        <DialogClose variant="secondary">Cancel</DialogClose>
                        <Button
                            variant="destructive"
                            onPress={handleDelete}
                            isDisabled={isDeleting}
                        >
                            {isDeleting ? 'Removing…' : 'Remove passkey'}
                        </Button>
                    </DialogFooter>
                </Dialog>
            </DialogTrigger>
        </div>
    );
}

type PasskeyRegistrationProps = {
    onSuccess: () => void;
};

/**
 * Suggests a name for the passkey from the browser and platform, so the list stays
 * readable when someone registers several.
 */
function detectDeviceName(): string {
    if (typeof navigator === 'undefined') {
        return '';
    }

    const ua = navigator.userAgent;

    const browser = [
        { pattern: /Edg|Edge/, name: 'Edge' },
        { pattern: /OPR|Opera|OPiOS/, name: 'Opera' },
        { pattern: /Firefox|FxiOS/, name: 'Firefox' },
        { pattern: /Chrome|CriOS/, name: 'Chrome' },
        { pattern: /Safari/, name: 'Safari' },
    ].find(({ pattern }) => pattern.test(ua))?.name;

    const os = [
        { pattern: /iPhone/, name: 'iPhone' },
        { pattern: /iPad|Macintosh(?=.*Mobile)/, name: 'iPad' },
        { pattern: /Android/, name: 'Android' },
        { pattern: /Mac/, name: 'Mac' },
        { pattern: /Windows/, name: 'Windows' },
    ].find(({ pattern }) => pattern.test(ua))?.name;

    return [browser, os].filter(Boolean).join(' on ') || '';
}

function PasskeyRegistration({ onSuccess }: PasskeyRegistrationProps) {
    const [name, setName] = useState(detectDeviceName);
    const [isOpen, setIsOpen] = useState(false);

    const { register, isLoading, error, isSupported } = usePasskeyRegister({
        onSuccess: () => {
            setName(detectDeviceName());
            setIsOpen(false);
            onSuccess();
        },
    });

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!name.trim()) {
            return;
        }

        await register(name);
    };

    // Reopening should offer the suggested name again rather than an empty field.
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setName(detectDeviceName());
        }

        setIsOpen(open);
    };

    if (!isSupported) {
        return (
            <span className="text-sm text-muted-foreground">
                Passkeys are not supported in this browser.
            </span>
        );
    }

    return (
        <DialogTrigger isOpen={isOpen} onOpenChange={handleOpenChange}>
            <Button variant="outline" size="sm">
                Add passkey
            </Button>

            <Dialog>
                <DialogHeader>
                    <DialogTitle>Add a passkey</DialogTitle>
                    <DialogDescription>
                        Your browser will ask you to confirm with your device.
                        Name the passkey so you can recognise it later.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-2">
                        <Label htmlFor="passkey-name">Passkey name</Label>
                        <Input
                            id="passkey-name"
                            type="text"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="e.g. MacBook Pro, iPhone"
                            autoFocus
                        />

                        {error && <InputError message={error} />}
                    </div>

                    <DialogFooter className="gap-2">
                        <DialogClose variant="secondary">Cancel</DialogClose>

                        <Button
                            type="submit"
                            isDisabled={isLoading || !name.trim()}
                        >
                            {isLoading ? 'Registering…' : 'Register passkey'}
                        </Button>
                    </DialogFooter>
                </form>
            </Dialog>
        </DialogTrigger>
    );
}
