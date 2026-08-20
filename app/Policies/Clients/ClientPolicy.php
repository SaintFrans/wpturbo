<?php

namespace App\Policies\Clients;

use App\Enums\Organizations\OrganizationPermission;
use App\Models\Clients\Client;
use App\Models\Organizations\Organization;
use App\Models\User;

/**
 * Authorisation for clients.
 *
 * Visibility is membership, capability is a permission (ADR-037): every member of the owning
 * organization sees every client in it, and what differs by role is what they may change. The
 * permission is asked for by name, never a role string (ADR-005).
 */
class ClientPolicy
{
    /**
     * Determine whether the user can view the organization's clients.
     */
    public function viewAny(User $user, Organization $organization): bool
    {
        return $user->belongsToOrganization($organization);
    }

    /**
     * Determine whether the user can view the client.
     */
    public function view(User $user, Client $client): bool
    {
        return $user->belongsToOrganization($client->organization);
    }

    /**
     * Determine whether the user can create a client in the organization.
     *
     * The organization is an explicit argument rather than something read off the request: a
     * create has no model to infer the tenant from, and inferring it from the session would
     * authorise against a different organization than the one being written to.
     */
    public function create(User $user, Organization $organization): bool
    {
        return $user->hasOrganizationPermission($organization, OrganizationPermission::CreateClient);
    }

    /**
     * Determine whether the user can update the client.
     */
    public function update(User $user, Client $client): bool
    {
        return $user->hasOrganizationPermission($client->organization, OrganizationPermission::UpdateClient);
    }

    /**
     * Determine whether the user can delete the client.
     *
     * Owner and Admin only. Deleting a client regroups everything tagged to it, which is not a
     * member-level consequence (ADR-038).
     */
    public function delete(User $user, Client $client): bool
    {
        return $user->hasOrganizationPermission($client->organization, OrganizationPermission::DeleteClient);
    }
}
