export type OrganizationRole = 'owner' | 'admin' | 'member';

export type Organization = {
    id: number;
    name: string;
    handle: string;
    role?: OrganizationRole;
    roleLabel?: string;
    isCurrent?: boolean;
};

export type OrganizationMember = {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    role: OrganizationRole;
    role_label: string;
};

export type OrganizationInvitation = {
    id: number;
    email: string;
    role: OrganizationRole;
    role_label: string;
    created_at: string;
};

// Unlike the other two, this carries the invitation's plaintext code — it is built from the
// query string of the emailed link, never read back from storage (ADR-033).
export type OrganizationInvitationContext = {
    code: string;
    organizationName: string;
};

export type DashboardInvitation = {
    id: number;
    inviterName: string;
    organization: {
        name: string;
        handle: string;
    };
};

export type OrganizationPermissions = {
    canUpdateOrganization: boolean;
    canDeleteOrganization: boolean;
    canAddMember: boolean;
    canUpdateMember: boolean;
    canRemoveMember: boolean;
    canCreateInvitation: boolean;
    canCancelInvitation: boolean;
    canViewAuditLog: boolean;
};

export type AuditLogEntry = {
    id: number;
    actorName: string | null;
    action: string;
    actionLabel: string;
    targetLabel: string | null;
    createdAt: string;
};

export type RoleOption = {
    value: OrganizationRole;
    label: string;
};
