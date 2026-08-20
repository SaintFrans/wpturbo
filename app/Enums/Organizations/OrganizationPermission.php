<?php

namespace App\Enums\Organizations;

enum OrganizationPermission: string
{
    case UpdateOrganization = 'organization:update';
    case DeleteOrganization = 'organization:delete';

    case AddMember = 'member:add';
    case UpdateMember = 'member:update';
    case RemoveMember = 'member:remove';

    case CreateInvitation = 'invitation:create';
    case CancelInvitation = 'invitation:cancel';

    case CreateClient = 'client:create';
    case UpdateClient = 'client:update';
    case DeleteClient = 'client:delete';

    case ViewAuditLog = 'audit_log:view';
}
