<?php

namespace App\Policies\Organizations;

use App\Enums\Organizations\OrganizationPermission;
use App\Enums\Organizations\OrganizationRole;
use App\Models\Organizations\Organization;
use App\Models\User;

class OrganizationPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Organization $organization): bool
    {
        return $user->belongsToOrganization($organization);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Organization $organization): bool
    {
        return $user->hasOrganizationPermission($organization, OrganizationPermission::UpdateOrganization);
    }

    /**
     * Determine whether the user can leave the organization.
     *
     * The last-organization check replaces the old `! is_personal` clause and does the same job:
     * every user keeps at least one tenant (ADR-025). The owner check is separate and unrelated —
     * both must stay.
     */
    public function leave(User $user, Organization $organization): bool
    {
        return ! $this->isLastOrganizationFor($user)
            && $user->belongsToOrganization($organization)
            && ! $user->ownsOrganization($organization);
    }

    /**
     * Determine whether the user can add a member to the organization.
     */
    public function addMember(User $user, Organization $organization, OrganizationRole $role): bool
    {
        return $user->hasOrganizationPermission($organization, OrganizationPermission::AddMember)
            && $this->outranks($user, $organization, $role);
    }

    /**
     * Determine whether the user can update a member's role in the organization.
     */
    public function updateMember(User $user, Organization $organization, OrganizationRole $currentRole, OrganizationRole $newRole): bool
    {
        return $user->hasOrganizationPermission($organization, OrganizationPermission::UpdateMember)
            && $this->outranks($user, $organization, $currentRole)
            && $this->outranks($user, $organization, $newRole);
    }

    /**
     * Determine whether the user can remove a member from the organization.
     */
    public function removeMember(User $user, Organization $organization, OrganizationRole $memberRole): bool
    {
        return $user->hasOrganizationPermission($organization, OrganizationPermission::RemoveMember)
            && $this->outranks($user, $organization, $memberRole);
    }

    /**
     * Determine whether the user can invite members to the organization.
     */
    public function inviteMember(User $user, Organization $organization, OrganizationRole $invitedRole): bool
    {
        return $user->hasOrganizationPermission($organization, OrganizationPermission::CreateInvitation)
            && $this->outranks($user, $organization, $invitedRole);
    }

    /**
     * Determine whether the user can cancel invitations.
     */
    public function cancelInvitation(User $user, Organization $organization): bool
    {
        return $user->hasOrganizationPermission($organization, OrganizationPermission::CancelInvitation);
    }

    /**
     * Determine whether the user can view the organization's audit log.
     *
     * Owner and Admin only (ADR-032) — the one deliberate exception to every member seeing
     * everything else in their organization (ADR-037). It is a record of administrative and
     * destructive action, not a resource members need to see to do their job.
     */
    public function viewAuditLog(User $user, Organization $organization): bool
    {
        return $user->hasOrganizationPermission($organization, OrganizationPermission::ViewAuditLog);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Organization $organization): bool
    {
        return ! $this->isLastOrganizationFor($user)
            && $user->hasOrganizationPermission($organization, OrganizationPermission::DeleteOrganization);
    }

    /**
     * Determine whether the user's role in this organization outranks the given role.
     *
     * The role argument is required on every member method on purpose: a call site that forgets
     * it is a TypeError, not a silent bypass.
     */
    protected function outranks(User $user, Organization $organization, OrganizationRole $role): bool
    {
        return $user->organizationRole($organization)?->outranks($role) ?? false;
    }

    /**
     * Determine whether this is the only organization the user has left.
     */
    protected function isLastOrganizationFor(User $user): bool
    {
        return $user->organizations()->count() <= 1;
    }
}
