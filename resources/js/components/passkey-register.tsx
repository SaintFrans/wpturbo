import { usePasskeyRegister } from '@laravel/passkeys/react';
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

type Props = {
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

export default function PasskeyRegistration({ onSuccess }: Props) {
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
