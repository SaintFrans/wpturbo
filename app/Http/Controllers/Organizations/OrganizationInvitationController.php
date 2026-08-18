<?php

namespace App\Http\Controllers\Organizations;

use App\Enums\Organizations\OrganizationRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Organizations\CreateOrganizationInvitationRequest;
use App\Http\Requests\Organizations\RespondToOrganizationInvitationRequest;
use App\Models\Organizations\Organization;
use App\Models\Organizations\OrganizationInvitation;
use App\Notifications\Organizations\OrganizationInvitation as OrganizationInvitationNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia;

class OrganizationInvitationController extends Controller
{
    /**
     * Store a newly created invitation.
     */
    public function store(CreateOrganizationInvitationRequest $request, Organization $organization): RedirectResponse
    {
        $invitedRole = OrganizationRole::from($request->validated('role'));

        // The escalation path is the invited role, not the invite action: without this an Admin
        // could invite a peer — or, before ADR-028, an Owner (ADR-028).
        Gate::authorize('inviteMember', [$organization, $invitedRole]);

        $invitation = $organization->invitations()->create([
            'email' => $request->validated('email'),
            'role' => $invitedRole,
            'invited_by' => $request->user()->id,
            'expires_at' => now()->addDays(3),
        ]);

        Notification::route('mail', $invitation->email)
            ->notify(new OrganizationInvitationNotification($invitation));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Invitation sent.')]);

        return to_route('organizations.edit', ['organization' => $organization->handle]);
    }

    /**
     * Cancel the specified invitation.
     */
    public function destroy(Organization $organization, OrganizationInvitation $invitation): RedirectResponse
    {
        abort_unless($invitation->organization_id === $organization->id, 404);

        Gate::authorize('cancelInvitation', $organization);

        $invitation->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Invitation cancelled.')]);

        return to_route('organizations.edit', ['organization' => $organization->handle]);
    }

    /**
     * Accept the invitation.
     */
    public function accept(RespondToOrganizationInvitationRequest $request, OrganizationInvitation $invitation): RedirectResponse
    {
        $user = $request->user();

        DB::transaction(function () use ($user, $invitation) {
            $organization = $invitation->organization;

            $organization->memberships()->firstOrCreate(
                ['user_id' => $user->id],
                ['role' => $invitation->role],
            );

            $invitation->update(['accepted_at' => now()]);

            $user->switchOrganization($organization);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Invitation accepted.')]);

        return to_route('dashboard');
    }

    /**
     * Decline the invitation.
     */
    public function decline(RespondToOrganizationInvitationRequest $request, OrganizationInvitation $invitation): RedirectResponse
    {
        $invitation->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Invitation declined.')]);

        return to_route('dashboard');
    }
}
