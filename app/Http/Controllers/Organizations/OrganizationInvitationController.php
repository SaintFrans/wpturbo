<?php

namespace App\Http\Controllers\Organizations;

use App\Actions\Audit\RecordAuditEntry;
use App\Enums\Audit\AuditAction;
use App\Enums\Organizations\OrganizationRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Organizations\CreateOrganizationInvitationRequest;
use App\Http\Requests\Organizations\RespondToOrganizationInvitationRequest;
use App\Models\Organizations\Organization;
use App\Models\Organizations\OrganizationInvitation;
use App\Notifications\Organizations\OrganizationInvitation as OrganizationInvitationNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia;

class OrganizationInvitationController extends Controller
{
    /**
     * Store a newly created invitation.
     */
    public function store(CreateOrganizationInvitationRequest $request, Organization $organization, RecordAuditEntry $recordAuditEntry): RedirectResponse
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

        // Always set by the model's `creating` hook; asserted so the notification's
        // constructor can require a `string` rather than a `?string` (ADR-033).
        assert($invitation->plainCode !== null);

        Notification::route('mail', $invitation->email)
            ->notify(new OrganizationInvitationNotification($invitation, $invitation->plainCode));

        $recordAuditEntry->handle(
            organization: $organization,
            actor: $request->user(),
            action: AuditAction::InvitationCreated,
            targetLabel: $invitation->email,
            targetType: 'invitation',
            targetId: $invitation->id,
            context: ['role' => $invitedRole->value],
            ipAddress: $request->ip(),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Invitation sent.')]);

        return to_route('organizations.edit', ['organization' => $organization->handle]);
    }

    /**
     * Cancel the specified invitation.
     */
    public function destroy(Request $request, Organization $organization, OrganizationInvitation $invitation, RecordAuditEntry $recordAuditEntry): RedirectResponse
    {
        abort_unless($invitation->organization_id === $organization->id, 404);

        Gate::authorize('cancelInvitation', $organization);

        // Captured before the delete below: an invitation is gone the instant it is cancelled,
        // so this is the only chance to record what it was.
        $email = $invitation->email;
        $role = $invitation->role;

        // Cancelling one invitation is a deliberate, permission-gated removal, so it is a hard
        // delete. Only deleting the whole organization soft-deletes its tree (ADR-019, ADR-034).
        $invitation->forceDelete();

        $recordAuditEntry->handle(
            organization: $organization,
            actor: $request->user(),
            action: AuditAction::InvitationCancelled,
            targetLabel: $email,
            targetType: 'invitation',
            targetId: $invitation->id,
            context: ['role' => $role->value],
            ipAddress: $request->ip(),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Invitation cancelled.')]);

        return to_route('organizations.edit', ['organization' => $organization->handle]);
    }

    /**
     * Accept the invitation.
     */
    public function accept(RespondToOrganizationInvitationRequest $request, OrganizationInvitation $invitation, RecordAuditEntry $recordAuditEntry): RedirectResponse
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

        $recordAuditEntry->handle(
            organization: $invitation->organization,
            actor: $user,
            action: AuditAction::InvitationAccepted,
            targetLabel: $invitation->email,
            targetType: 'invitation',
            targetId: $invitation->id,
            context: ['role' => $invitation->role->value],
            ipAddress: $request->ip(),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Invitation accepted.')]);

        return to_route('dashboard');
    }

    /**
     * Decline the invitation.
     */
    public function decline(RespondToOrganizationInvitationRequest $request, OrganizationInvitation $invitation, RecordAuditEntry $recordAuditEntry): RedirectResponse
    {
        $organization = $invitation->organization;

        $invitation->forceDelete();

        $recordAuditEntry->handle(
            organization: $organization,
            actor: $request->user(),
            action: AuditAction::InvitationDeclined,
            targetLabel: $invitation->email,
            targetType: 'invitation',
            targetId: $invitation->id,
            context: ['role' => $invitation->role->value],
            ipAddress: $request->ip(),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Invitation declined.')]);

        return to_route('dashboard');
    }
}
