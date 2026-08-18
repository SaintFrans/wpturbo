<?php

namespace App\Actions\Audit;

use App\Enums\Audit\AuditAction;
use App\Models\Audit\AuditLogEntry;
use App\Models\Organizations\Organization;
use App\Models\User;

class RecordAuditEntry
{
    /**
     * Append one entry to the organization's audit log.
     *
     * Deliberately takes an actor and an IP address rather than a `Request`: operator actions
     * (ADR-029) and, later, the agent are not HTTP requests, and this action must not assume one.
     * `$targetLabel` is a snapshot taken now — the target itself (a member, an invitation) is
     * frequently gone by the time anyone reads this, sometimes force-deleted in the very same
     * request that writes this entry.
     *
     * @param  array<string, mixed>  $context  Small, non-sensitive structured detail (e.g. a role
     *                                         transition). Never a payload — credentials, tokens
     *                                         and invitation codes never reach this table.
     */
    public function handle(
        Organization $organization,
        ?User $actor,
        AuditAction $action,
        ?string $targetLabel = null,
        ?string $targetType = null,
        ?int $targetId = null,
        array $context = [],
        ?string $ipAddress = null,
    ): AuditLogEntry {
        return AuditLogEntry::create([
            'organization_id' => $organization->id,
            'actor_id' => $actor?->id,
            'action' => $action,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'target_label' => $targetLabel,
            'context' => $context === [] ? null : $context,
            'ip_address' => $ipAddress,
        ]);
    }
}
