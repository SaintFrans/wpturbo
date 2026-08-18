import { Head } from '@inertiajs/react';
import { ScrollText } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import {
    Frame,
    FrameDescription,
    FrameGroup,
    FrameHeader,
    FramePanel,
    FrameTitle,
} from '@/components/ui/frame';
import type { AuditLogEntry, Organization } from '@/types';

type Props = {
    organization: Organization;
    entries: AuditLogEntry[];
};

export default function OrganizationAuditLog({ organization, entries }: Props) {
    return (
        <>
            <Head title={`${organization.name} audit log`} />

            <Frame>
                <FrameHeader>
                    <FrameTitle>Audit log</FrameTitle>
                    <FrameDescription>
                        Who invited, removed, promoted or deleted what in this
                        organization. The most recent 100 entries.
                    </FrameDescription>
                </FrameHeader>

                <FramePanel padded={entries.length === 0}>
                    {entries.length === 0 ? (
                        <EmptyState
                            title="Nothing recorded yet"
                            description="Membership and invitation changes in this organization will appear here."
                            illustration={
                                <ScrollText className="size-10 text-muted-foreground" />
                            }
                        />
                    ) : (
                        <FrameGroup>
                            {entries.map((entry) => (
                                <div
                                    key={entry.id}
                                    data-test="audit-log-row"
                                    className="flex items-center justify-between gap-4 px-4 py-3"
                                >
                                    <div>
                                        <div className="font-medium">
                                            {entry.actorName ?? 'System'}
                                            {' — '}
                                            {entry.actionLabel}
                                        </div>
                                        {entry.targetLabel && (
                                            <div className="text-sm text-muted-foreground">
                                                {entry.targetLabel}
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-sm whitespace-nowrap text-muted-foreground">
                                        {new Date(
                                            entry.createdAt,
                                        ).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </FrameGroup>
                    )}
                </FramePanel>
            </Frame>
        </>
    );
}
