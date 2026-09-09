import { Form } from '@inertiajs/react';
import { Eye, EyeOff, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import AlertError from '@/components/alert-error';
import TwoFactorSetupModal from '@/components/account/two-factor-setup-modal';
import { Button } from '@/components/ui/button';
import {
    Frame,
    FrameControl,
    FrameDescription,
    FrameGroup,
    FrameHeader,
    FrameLabel,
    FramePanel,
    FrameRow,
    FrameTitle,
} from '@/components/ui/frame';
import { useTwoFactorAuth } from '@/hooks/use-two-factor-auth';
import { disable, enable, regenerateRecoveryCodes } from '@/routes/two-factor';

export type Props = {
    canManageTwoFactor?: boolean;
    requiresConfirmation?: boolean;
    twoFactorEnabled?: boolean;
};

export default function ManageTwoFactor(props: Props) {
    const requiresConfirmation = props.requiresConfirmation ?? false;
    const twoFactorEnabled = props.twoFactorEnabled ?? false;

    const {
        qrCodeSvg,
        hasSetupData,
        manualSetupKey,
        clearSetupData,
        clearTwoFactorAuthData,
        fetchSetupData,
        recoveryCodesList,
        fetchRecoveryCodes,
        errors,
    } = useTwoFactorAuth();
    const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
    const prevTwoFactorEnabled = useRef(twoFactorEnabled);

    useEffect(() => {
        if (prevTwoFactorEnabled.current && !twoFactorEnabled) {
            clearTwoFactorAuthData();
        }

        prevTwoFactorEnabled.current = twoFactorEnabled;
    }, [twoFactorEnabled, clearTwoFactorAuthData]);

    if (!(props.canManageTwoFactor ?? false)) {
        return null;
    }

    return (
        <Frame>
            <FrameHeader>
                <FrameTitle>Security</FrameTitle>
                <FrameDescription>
                    Enable extra security for your account.
                </FrameDescription>
            </FrameHeader>

            <FramePanel padded={false}>
                <FrameGroup>
                    <FrameRow>
                        <FrameLabel>
                            Two-factor authentication
                            <FrameDescription>
                                When enabled you will be prompted for a secure,
                                random token from your phone's authentication
                                application.
                            </FrameDescription>
                        </FrameLabel>

                        <FrameControl>
                            {twoFactorEnabled ? (
                                <Form {...disable.form()}>
                                    {({ processing }) => (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            type="submit"
                                            isDisabled={processing}
                                        >
                                            Disable 2FA
                                        </Button>
                                    )}
                                </Form>
                            ) : hasSetupData ? (
                                <Button
                                    size="sm"
                                    onPress={() => setShowSetupModal(true)}
                                >
                                    <ShieldCheck />
                                    Continue setup
                                </Button>
                            ) : (
                                <Form
                                    {...enable.form()}
                                    onSuccess={() => setShowSetupModal(true)}
                                >
                                    {({ processing }) => (
                                        <Button
                                            size="sm"
                                            type="submit"
                                            isDisabled={processing}
                                        >
                                            Enable 2FA
                                        </Button>
                                    )}
                                </Form>
                            )}
                        </FrameControl>
                    </FrameRow>

                    {twoFactorEnabled && (
                        <TwoFactorRecoveryCodes
                            recoveryCodesList={recoveryCodesList}
                            fetchRecoveryCodes={fetchRecoveryCodes}
                            errors={errors}
                        />
                    )}
                </FrameGroup>
            </FramePanel>

            <TwoFactorSetupModal
                isOpen={showSetupModal}
                onClose={() => setShowSetupModal(false)}
                requiresConfirmation={requiresConfirmation}
                twoFactorEnabled={twoFactorEnabled}
                qrCodeSvg={qrCodeSvg}
                manualSetupKey={manualSetupKey}
                clearSetupData={clearSetupData}
                fetchSetupData={fetchSetupData}
                errors={errors}
            />
        </Frame>
    );
}

type RecoveryCodesProps = {
    recoveryCodesList: string[];
    fetchRecoveryCodes: () => Promise<void>;
    errors: string[];
};

/**
 * The recovery-codes row of the Security card: hidden until asked for, and regenerable once
 * visible. It is a row of this card and has no other caller, so it lives with it.
 */
function TwoFactorRecoveryCodes({
    recoveryCodesList,
    fetchRecoveryCodes,
    errors,
}: RecoveryCodesProps) {
    const [codesAreVisible, setCodesAreVisible] = useState<boolean>(false);
    const codesSectionRef = useRef<HTMLDivElement | null>(null);
    const canRegenerateCodes = recoveryCodesList.length > 0 && codesAreVisible;

    const toggleCodesVisibility = useCallback(async () => {
        if (!codesAreVisible && !recoveryCodesList.length) {
            await fetchRecoveryCodes();
        }

        setCodesAreVisible(!codesAreVisible);

        if (!codesAreVisible) {
            setTimeout(() => {
                codesSectionRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                });
            });
        }
    }, [codesAreVisible, recoveryCodesList.length, fetchRecoveryCodes]);

    useEffect(() => {
        if (!recoveryCodesList.length) {
            // Rejections are handled inside the hook and surfaced through `errors`.
            void fetchRecoveryCodes();
        }
    }, [recoveryCodesList.length, fetchRecoveryCodes]);

    const RecoveryCodeIconComponent = codesAreVisible ? EyeOff : Eye;

    return (
        <>
            <FrameRow>
                <FrameLabel>
                    Recovery codes
                    <FrameDescription>
                        Store recovery codes somewhere safe. They let you regain
                        access if you lose your 2FA device.
                    </FrameDescription>
                </FrameLabel>

                <FrameControl className="gap-2">
                    {canRegenerateCodes && (
                        <Form
                            {...regenerateRecoveryCodes.form()}
                            options={{ preserveScroll: true }}
                            onSuccess={fetchRecoveryCodes}
                        >
                            {({ processing }) => (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    type="submit"
                                    isDisabled={processing}
                                    aria-describedby="regenerate-warning"
                                >
                                    <RefreshCw /> Regenerate
                                </Button>
                            )}
                        </Form>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        onPress={toggleCodesVisibility}
                        aria-expanded={codesAreVisible}
                        aria-controls="recovery-codes-section"
                    >
                        <RecoveryCodeIconComponent
                            className="size-4"
                            aria-hidden="true"
                        />
                        {codesAreVisible ? 'Hide' : 'Show'} recovery codes
                    </Button>
                </FrameControl>
            </FrameRow>

            <div className="px-4">
                <div
                    id="recovery-codes-section"
                    className={`relative overflow-hidden transition-all duration-300 ${codesAreVisible ? 'h-auto opacity-100' : 'h-0 opacity-0'}`}
                    aria-hidden={!codesAreVisible}
                >
                    <div className="mt-3 space-y-3">
                        {errors?.length ? (
                            <AlertError errors={errors} />
                        ) : (
                            <>
                                <div
                                    ref={codesSectionRef}
                                    className="grid gap-1 rounded-lg bg-muted p-4 font-mono text-sm"
                                    role="list"
                                    aria-label="Recovery codes"
                                >
                                    {recoveryCodesList.length ? (
                                        recoveryCodesList.map((code, index) => (
                                            <div
                                                key={index}
                                                role="listitem"
                                                className="select-text"
                                            >
                                                {code}
                                            </div>
                                        ))
                                    ) : (
                                        <div
                                            className="space-y-2"
                                            aria-label="Loading recovery codes"
                                        >
                                            {Array.from(
                                                { length: 8 },
                                                (_, index) => (
                                                    <div
                                                        key={index}
                                                        className="h-4 animate-pulse rounded bg-muted-foreground/20"
                                                        aria-hidden="true"
                                                    />
                                                ),
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="text-xs text-muted-foreground select-none">
                                    <p id="regenerate-warning">
                                        Each recovery code can be used once to
                                        access your account and will be removed
                                        after use. If you need more, click{' '}
                                        <span className="font-bold">
                                            Regenerate codes
                                        </span>{' '}
                                        above.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
