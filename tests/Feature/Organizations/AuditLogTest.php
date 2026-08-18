<?php

use App\Enums\Audit\AuditAction;
use App\Enums\Organizations\OrganizationRole;
use App\Models\Audit\AuditLogEntry;
use App\Models\Organizations\Organization;
use App\Models\Organizations\OrganizationInvitation;
use App\Models\User;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

test('inviting a member records an audit entry', function () {
    Notification::fake();

    $owner = User::factory()->create();
    $organization = Organization::factory()->create();
    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);

    $this->actingAs($owner)->post(route('organizations.invitations.store', $organization), [
        'email' => 'invited@example.com',
        'role' => OrganizationRole::Member->value,
    ]);

    $entry = AuditLogEntry::query()->where('organization_id', $organization->id)->sole();

    expect($entry->actor_id)->toBe($owner->id);
    expect($entry->action)->toBe(AuditAction::InvitationCreated);
    expect($entry->target_label)->toBe('invited@example.com');
    expect($entry->context)->toBe(['role' => 'member']);
});

test('cancelling an invitation records an audit entry, after the invitation itself is gone', function () {
    $owner = User::factory()->create();
    $organization = Organization::factory()->create();
    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);

    $invitation = OrganizationInvitation::factory()->create([
        'organization_id' => $organization->id,
        'email' => 'invited@example.com',
        'invited_by' => $owner->id,
    ]);

    $this->actingAs($owner)->delete(route('organizations.invitations.destroy', [$organization, $invitation]));

    $this->assertDatabaseMissing('organization_invitations', ['id' => $invitation->id]);

    $entry = AuditLogEntry::query()->where('organization_id', $organization->id)->sole();

    expect($entry->action)->toBe(AuditAction::InvitationCancelled);
    expect($entry->target_label)->toBe('invited@example.com');
});

test('accepting an invitation records an audit entry attributed to the invitee', function () {
    $owner = User::factory()->create();
    $invitedUser = User::factory()->create(['email' => 'invited@example.com']);
    $organization = Organization::factory()->create();
    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);

    $invitation = OrganizationInvitation::factory()->create([
        'organization_id' => $organization->id,
        'email' => 'invited@example.com',
        'invited_by' => $owner->id,
    ]);

    $this->actingAs($invitedUser)->get(route('invitations.accept', $invitation));

    $entry = AuditLogEntry::query()->where('organization_id', $organization->id)->sole();

    expect($entry->actor_id)->toBe($invitedUser->id);
    expect($entry->action)->toBe(AuditAction::InvitationAccepted);
});

test('declining an invitation records an audit entry', function () {
    $owner = User::factory()->create();
    $invitedUser = User::factory()->create(['email' => 'invited@example.com']);
    $organization = Organization::factory()->create();
    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);

    $invitation = OrganizationInvitation::factory()->create([
        'organization_id' => $organization->id,
        'email' => 'invited@example.com',
        'invited_by' => $owner->id,
    ]);

    $this->actingAs($invitedUser)->delete(route('invitations.decline', $invitation));

    $entry = AuditLogEntry::query()->where('organization_id', $organization->id)->sole();

    expect($entry->actor_id)->toBe($invitedUser->id);
    expect($entry->action)->toBe(AuditAction::InvitationDeclined);
});

test('changing a member role records an audit entry with the transition', function () {
    $owner = User::factory()->create();
    $member = User::factory()->create();
    $organization = Organization::factory()->create();
    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);
    $organization->members()->attach($member, ['role' => OrganizationRole::Member->value]);

    $this->actingAs($owner)->patch(route('organizations.members.update', [$organization, $member]), [
        'role' => OrganizationRole::Admin->value,
    ]);

    $entry = AuditLogEntry::query()->where('organization_id', $organization->id)->sole();

    expect($entry->action)->toBe(AuditAction::MemberRoleUpdated);
    expect($entry->target_id)->toBe($member->id);
    expect($entry->context)->toBe(['from_role' => 'member', 'to_role' => 'admin']);
});

test('removing a member records an audit entry', function () {
    $owner = User::factory()->create();
    $member = User::factory()->create();
    $organization = Organization::factory()->create();
    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);
    $organization->members()->attach($member, ['role' => OrganizationRole::Member->value]);

    $this->actingAs($owner)->delete(route('organizations.members.destroy', [$organization, $member]));

    $entry = AuditLogEntry::query()->where('organization_id', $organization->id)->sole();

    expect($entry->actor_id)->toBe($owner->id);
    expect($entry->action)->toBe(AuditAction::MemberRemoved);
    expect($entry->target_id)->toBe($member->id);
});

test('leaving an organization records an audit entry attributed to the leaver', function () {
    $owner = User::factory()->create();
    $member = User::factory()->create();
    $organization = Organization::factory()->create();
    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);
    $organization->members()->attach($member, ['role' => OrganizationRole::Member->value]);

    $this->actingAs($member)->delete(route('organizations.leave', $organization));

    $entry = AuditLogEntry::query()->where('organization_id', $organization->id)->sole();

    expect($entry->actor_id)->toBe($member->id);
    expect($entry->target_id)->toBe($member->id);
    expect($entry->action)->toBe(AuditAction::MemberLeft);
});

test('deleting an organization records an audit entry that survives the deletion', function () {
    $owner = User::factory()->create();
    $organization = Organization::factory()->create(['name' => 'Doomed Org']);
    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);

    $this->actingAs($owner)->delete(route('organizations.destroy', $organization), [
        'name' => 'Doomed Org',
    ]);

    expect($organization->fresh()->trashed())->toBeTrue();

    // Not part of the tree the delete above just soft-deleted (ADR-032, ADR-034): the entry
    // exists independently of the organization row it describes.
    $entry = AuditLogEntry::query()->where('organization_id', $organization->id)->sole();

    expect($entry->action)->toBe(AuditAction::OrganizationDeleted);
    expect($entry->target_label)->toBe('Doomed Org');
});

test('owners can view the audit log', function () {
    $owner = User::factory()->create();
    $organization = Organization::factory()->create();
    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);

    $entry = AuditLogEntry::factory()->create([
        'organization_id' => $organization->id,
        'actor_id' => $owner->id,
        'action' => AuditAction::MemberRemoved,
        'target_label' => 'removed@example.com',
    ]);

    $response = $this->actingAs($owner)->get(route('organizations.audit-log.index', $organization));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('organizations/settings/audit-log')
        ->has('entries', 1)
        ->where('entries.0.id', $entry->id)
        ->where('entries.0.actorName', $owner->name)
        ->where('entries.0.action', 'member.removed')
        ->where('entries.0.actionLabel', 'Member removed')
        ->where('entries.0.targetLabel', 'removed@example.com'),
    );
});

test('admins can view the audit log', function () {
    $owner = User::factory()->create();
    $admin = User::factory()->create();
    $organization = Organization::factory()->create();
    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);
    $organization->members()->attach($admin, ['role' => OrganizationRole::Admin->value]);

    $response = $this->actingAs($admin)->get(route('organizations.audit-log.index', $organization));

    $response->assertOk();
});

test('members cannot view the audit log', function () {
    $owner = User::factory()->create();
    $member = User::factory()->create();
    $organization = Organization::factory()->create();
    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);
    $organization->members()->attach($member, ['role' => OrganizationRole::Member->value]);

    $response = $this->actingAs($member)->get(route('organizations.audit-log.index', $organization));

    $response->assertForbidden();
});

test('an entry with no actor renders as a system action', function () {
    $owner = User::factory()->create();
    $organization = Organization::factory()->create();
    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);

    AuditLogEntry::factory()->withoutActor()->create([
        'organization_id' => $organization->id,
        'action' => AuditAction::OrganizationDeleted,
        'target_label' => 'Some Org',
    ]);

    $response = $this->actingAs($owner)->get(route('organizations.audit-log.index', $organization));

    $response->assertInertia(fn (Assert $page) => $page
        ->where('entries.0.actorName', null),
    );
});
