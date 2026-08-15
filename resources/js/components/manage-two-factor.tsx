import { Form } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import TwoFactorRecoveryCodes from '@/components/two-factor-recovery-codes';
import TwoFactorSetupModal from '@/components/two-factor-setup-modal';
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
import { disable, enable } from '@/routes/two-factor';

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
