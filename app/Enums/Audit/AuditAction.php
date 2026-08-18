<?php

namespace App\Enums\Audit;

enum AuditAction: string
{
    case InvitationCreated = 'invitation.created';
    case InvitationCancelled = 'invitation.cancelled';
    case InvitationAccepted = 'invitation.accepted';
    case InvitationDeclined = 'invitation.declined';

    case MemberRoleUpdated = 'member.role_updated';
    case MemberRemoved = 'member.removed';
    case MemberLeft = 'member.left';

    case OrganizationDeleted = 'organization.deleted';

    /**
     * Get the display label for the action.
     */
    public function label(): string
    {
        return match ($this) {
            self::InvitationCreated => 'Invitation sent',
            self::InvitationCancelled => 'Invitation cancelled',
            self::InvitationAccepted => 'Invitation accepted',
            self::InvitationDeclined => 'Invitation declined',
            self::MemberRoleUpdated => 'Member role updated',
            self::MemberRemoved => 'Member removed',
            self::MemberLeft => 'Member left',
            self::OrganizationDeleted => 'Organization deleted',
        };
    }
}
