import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import PendingInvitationsModal from '@/components/organizations/pending-invitations-modal';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import type { DashboardInvitation } from '@/types';

type Props = {
    pendingInvitations?: DashboardInvitation[];
};

export default function Dashboard({ pendingInvitations = [] }: Props) {
    const [showInvitations, setShowInvitations] = useState(
        pendingInvitations.length > 0,
    );

    return (
        <>
            <Head title="Overview" />
            <PendingInvitationsModal
                invitations={pendingInvitations}
                open={pendingInvitations.length > 0 && showInvitations}
                onOpenChange={setShowInvitations}
            />
            <div className="flex w-full flex-col">
                <EmptyState
                    title="Nothing to show here yet"
                    description="Servers and applications will appear here once the hosting domain is built. Until then, this dashboard is a placeholder."
                    illustration={
                        <div className="relative size-32 overflow-hidden rounded-xl border border-sidebar-border">
                            <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                        </div>
                    }
                />
            </div>
        </>
    );
}
