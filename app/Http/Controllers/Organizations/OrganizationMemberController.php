<?php

namespace App\Http\Controllers\Organizations;

use App\Actions\Audit\RecordAuditEntry;
use App\Actions\Organizations\EnsureUserHasOrganization;
use App\Enums\Audit\AuditAction;
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
                    'id' => $invitation->id,
                    'email' => $invitation->email,
                    'role' => $invitation->role->value,
                    'role_label' => $invitation->role->label(),
                    'created_at' => $invitation->created_at->toISOString(),
                ]),
            'permissions' => $request->user()->toOrganizationPermissions($organization),
            'availableRoles' => OrganizationRole::assignableBy(
                $request->user()->organizationRole($organization) ?? OrganizationRole::Member,
            ),
        ]);
    }

    /**
     * Update the specified organization member's role.
     */
    public function update(UpdateOrganizationMemberRequest $request, Organization $organization, User $user, RecordAuditEntry $recordAuditEntry): RedirectResponse
    {
        $membership = $organization->memberships()->where('user_id', $user->id)->firstOrFail();
        $newRole = OrganizationRole::from($request->validated('role'));
        $previousRole = $membership->role;

        // Both the member's current role and the role they would gain must rank below the
        // actor's own, or an Admin could demote a peer or promote someone past themselves.
        Gate::authorize('updateMember', [$organization, $membership->role, $newRole]);

        $membership->update(['role' => $newRole]);

        $recordAuditEntry->handle(
            organization: $organization,
            actor: $request->user(),
            action: AuditAction::MemberRoleUpdated,
            targetLabel: $user->email,
            targetType: 'member',
            targetId: $user->id,
            context: ['from_role' => $previousRole->value, 'to_role' => $newRole->value],
            ipAddress: $request->ip(),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Member role updated.')]);

        return to_route('organizations.edit', ['organization' => $organization->handle]);
    }

    /**
     * Remove the specified organization member.
     */
    public function destroy(Request $request, Organization $organization, User $user, EnsureUserHasOrganization $ensureUserHasOrganization, RecordAuditEntry $recordAuditEntry): RedirectResponse
    {
        $membership = $organization->memberships()->where('user_id', $user->id)->firstOrFail();

        Gate::authorize('removeMember', [$organization, $membership->role]);

        abort_if($organization->owner()?->is($user), 403, __('The organization owner cannot be removed.'));

        // Removing one member is an individual, permission-gated deletion (ADR-019).
        $organization->memberships()
            ->where('user_id', $user->id)
            ->forceDelete();

        if ($user->isCurrentOrganization($organization)) {
            // Removal is not the member's choice, so they may have just lost their last
            // organization; give them one back rather than leaving them tenant-less (ADR-025).
            $user->switchOrganization($ensureUserHasOrganization->handle($user, $organization));
        }

        $recordAuditEntry->handle(
            organization: $organization,
            actor: $request->user(),
            action: AuditAction::MemberRemoved,
            targetLabel: $user->email,
            targetType: 'member',
            targetId: $user->id,
            context: ['role' => $membership->role->value],
            ipAddress: $request->ip(),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Member removed.')]);

        return to_route('organizations.edit', ['organization' => $organization->handle]);
    }
}
