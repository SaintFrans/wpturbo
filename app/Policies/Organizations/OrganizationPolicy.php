<?php

namespace App\Policies\Organizations;

use App\Enums\Organizations\OrganizationPermission;
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
    public function addMember(User $user, Organization $organization): bool
    {
        return $user->hasOrganizationPermission($organization, OrganizationPermission::AddMember);
    }

    /**
     * Determine whether the user can update a member's role in the organization.
     */
    public function updateMember(User $user, Organization $organization): bool
    {
        return $user->hasOrganizationPermission($organization, OrganizationPermission::UpdateMember);
    }

    /**
     * Determine whether the user can remove a member from the organization.
     */
    public function removeMember(User $user, Organization $organization): bool
    {
        return $user->hasOrganizationPermission($organization, OrganizationPermission::RemoveMember);
    }

    /**
     * Determine whether the user can invite members to the organization.
     */
    public function inviteMember(User $user, Organization $organization): bool
    {
        return $user->hasOrganizationPermission($organization, OrganizationPermission::CreateInvitation);
    }

    /**
     * Determine whether the user can cancel invitations.
     */
    public function cancelInvitation(User $user, Organization $organization): bool
    {
        return $user->hasOrganizationPermission($organization, OrganizationPermission::CancelInvitation);
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
     * Determine whether this is the only organization the user has left.
     */
    protected function isLastOrganizationFor(User $user): bool
    {
        return $user->organizations()->count() <= 1;
    }
}
