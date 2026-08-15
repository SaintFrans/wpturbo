import { Head } from '@inertiajs/react';
import AppearanceTabs from '@/components/appearance-tabs';
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
import { edit as editAppearance } from '@/routes/appearance';

export default function Appearance() {
    return (
        <>
            <Head title="Appearance settings" />

            <h1 className="sr-only">Appearance settings</h1>

            <Frame>
                <FrameHeader>
                    <FrameTitle>Appearance</FrameTitle>
                    <FrameDescription>
                        How the interface looks on this device.
                    </FrameDescription>
                </FrameHeader>

                <FramePanel padded={false}>
                    <FrameGroup>
                        <FrameRow>
                            <FrameLabel>
                                Theme
                                <FrameDescription>
                                    Follow your system setting, or pick light or
                                    dark.
                                </FrameDescription>
                            </FrameLabel>
                            <FrameControl>
                                <AppearanceTabs />
                            </FrameControl>
                        </FrameRow>
                    </FrameGroup>
                </FramePanel>
            </Frame>
        </>
    );
}

Appearance.layout = {
    breadcrumbs: [
        {
            title: 'Appearance settings',
            href: editAppearance(),
        },
    ],
};
