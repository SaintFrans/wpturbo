<?php

namespace App\Http\Controllers\Organizations;

use App\Enums\Organizations\OrganizationRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Organizations\UpdateOrganizationMemberRequest;
use App\Models\Organizations\Membership;
use App\Models\Organizations\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationMemberController extends Controller
{
    /**
     * Show the organization's members and pending invitations.
     */
    public function index(Request $request, Organization $organization): Response
    {
        return Inertia::render('organizations/settings/members', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'handle' => $organization->handle,
                'isPersonal' => $organization->is_personal,
            ],
            'members' => $organization->members()->get()->map(function (User $member) {
                /** @var Membership $membership */
                $membership = $member->getRelation('pivot');

                return [
                    'id' => $member->id,
                    'name' => $member->name,
                    'email' => $member->email,
                    'avatar' => $member->avatar ?? null,
                    'role' => $membership->role->value,
                    'role_label' => $membership->role->label(),
                ];
            }),
            'invitations' => $organization->invitations()
                ->whereNull('accepted_at')
                ->get()
                ->map(fn ($invitation) => [
                    'code' => $invitation->code,
                    'email' => $invitation->email,
                    'role' => $invitation->role->value,
                    'role_label' => $invitation->role->label(),
                    'created_at' => $invitation->created_at->toISOString(),
                ]),
            'permissions' => $request->user()->toOrganizationPermissions($organization),
            'availableRoles' => OrganizationRole::assignable(),
        ]);
    }

    /**
     * Update the specified organization member's role.
     */
    public function update(UpdateOrganizationMemberRequest $request, Organization $organization, User $user): RedirectResponse
    {
        Gate::authorize('updateMember', $organization);

        $newRole = OrganizationRole::from($request->validated('role'));

        $organization->memberships()
            ->where('user_id', $user->id)
            ->firstOrFail()
            ->update(['role' => $newRole]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Member role updated.')]);

        return to_route('organizations.edit', ['organization' => $organization->handle]);
    }

    /**
     * Remove the specified organization member.
     */
    public function destroy(Organization $organization, User $user): RedirectResponse
    {
        Gate::authorize('removeMember', $organization);

        abort_if($organization->owner()?->is($user), 403, __('The organization owner cannot be removed.'));

        $organization->memberships()
            ->where('user_id', $user->id)
            ->delete();

        if ($user->isCurrentOrganization($organization)) {
            $user->switchOrganization($user->personalOrganization());
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Member removed.')]);

        return to_route('organizations.edit', ['organization' => $organization->handle]);
    }
}
