<?php

use App\Enums\Organizations\OrganizationRole;
use App\Models\Organizations\Organization;
use App\Models\User;
use Illuminate\Support\Facades\Gate;

test('organization member roles can be updated by owners', function () {
    $owner = User::factory()->create();
    $member = User::factory()->create();
    $organization = Organization::factory()->create();

    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);
    $organization->members()->attach($member, ['role' => OrganizationRole::Member->value]);

    $response = $this
        ->actingAs($owner)
        ->patch(route('organizations.members.update', [$organization, $member]), [
            'role' => OrganizationRole::Admin->value,
        ]);

    $response->assertRedirect(route('organizations.edit', $organization));

    expect($organization->members()->where('user_id', $member->id)->first()->pivot->role->value)->toEqual(OrganizationRole::Admin->value);
});

test('members cannot change anyone\'s role', function () {
    $owner = User::factory()->create();
    $member = User::factory()->create();
    $other = User::factory()->create();
    $organization = Organization::factory()->create();

    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);
    $organization->members()->attach($member, ['role' => OrganizationRole::Member->value]);
    $organization->members()->attach($other, ['role' => OrganizationRole::Member->value]);

    $this
        ->actingAs($member)
        ->patch(route('organizations.members.update', [$organization, $other]), [
            'role' => OrganizationRole::Admin->value,
        ])
        ->assertForbidden();
});

test('organization members can be removed by owners', function () {
    $owner = User::factory()->create();
    $member = User::factory()->create();
    $organization = Organization::factory()->create();

    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);
    $organization->members()->attach($member, ['role' => OrganizationRole::Member->value]);

    $response = $this
        ->actingAs($owner)
        ->delete(route('organizations.members.destroy', [$organization, $member]));

    $response->assertRedirect(route('organizations.edit', $organization));

    expect($member->fresh()->belongsToOrganization($organization))->toBeFalse();
});

test('members cannot remove anyone', function () {
    $owner = User::factory()->create();
    $member = User::factory()->create();
    $other = User::factory()->create();
    $organization = Organization::factory()->create();

    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);
    $organization->members()->attach($member, ['role' => OrganizationRole::Member->value]);
    $organization->members()->attach($other, ['role' => OrganizationRole::Member->value]);

    $this
        ->actingAs($member)
        ->delete(route('organizations.members.destroy', [$organization, $other]))
        ->assertForbidden();
});

test('organization owner cannot be removed', function () {
    $owner = User::factory()->create();
    $organization = Organization::factory()->create();

    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);

    $response = $this
        ->actingAs($owner)
        ->delete(route('organizations.members.destroy', [$organization, $owner]));

    $response->assertForbidden();

    expect($owner->fresh()->belongsToOrganization($organization))->toBeTrue();
});

test('organization member role cannot be set to owner', function () {
    $owner = User::factory()->create();
    $member = User::factory()->create();
    $organization = Organization::factory()->create();

    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);
    $organization->members()->attach($member, ['role' => OrganizationRole::Member->value]);

    $response = $this
        ->actingAs($owner)
        ->patch(route('organizations.members.update', [$organization, $member]), [
            'role' => OrganizationRole::Owner->value,
        ]);

    $response->assertSessionHasErrors('role');

    expect($organization->members()->where('user_id', $member->id)->first()->pivot->role->value)->toEqual(OrganizationRole::Member->value);
});

test('removed member current organization is set to personal organization', function () {
    $owner = User::factory()->create();
    $member = User::factory()->create();
    $ownOrganization = $member->fallbackOrganization();
    $organization = Organization::factory()->create();

    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);
    $organization->members()->attach($member, ['role' => OrganizationRole::Member->value]);

    $member->update(['current_organization_id' => $organization->id]);

    $this
        ->actingAs($owner)
        ->delete(route('organizations.members.destroy', [$organization, $member]));

    expect($member->fresh()->current_organization_id)->toEqual($ownOrganization->id);
});

/*
 * ADR-028: an actor may only affect roles ranking strictly below their own.
 *
 * Each case is asserted against the policy directly as well as over HTTP, because the form
 * request rejects an out-of-range role before the policy is reached. Testing only the HTTP
 * response would prove validation works and say nothing about the control.
 */

test('an admin can remove a member', function () {
    $owner = User::factory()->create();
    $admin = User::factory()->create();
    $member = User::factory()->create();
    $organization = Organization::factory()->create();

    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);
    $organization->members()->attach($admin, ['role' => OrganizationRole::Admin->value]);
    $organization->members()->attach($member, ['role' => OrganizationRole::Member->value]);

    $this
        ->actingAs($admin)
        ->delete(route('organizations.members.destroy', [$organization, $member]))
        ->assertRedirect();

    expect($organization->fresh()->members()->whereKey($member->id)->exists())->toBeFalse();
});

test('an admin cannot remove another admin', function () {
    $owner = User::factory()->create();
    $admin = User::factory()->create();
    $peer = User::factory()->create();
    $organization = Organization::factory()->create();

    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);
    $organization->members()->attach($admin, ['role' => OrganizationRole::Admin->value]);
    $organization->members()->attach($peer, ['role' => OrganizationRole::Admin->value]);

    $this
        ->actingAs($admin)
        ->delete(route('organizations.members.destroy', [$organization, $peer]))
        ->assertForbidden();

    expect(Gate::forUser($admin)->allows('removeMember', [$organization, OrganizationRole::Admin]))->toBeFalse();
});

test('an admin cannot remove the owner', function () {
    $owner = User::factory()->create();
    $admin = User::factory()->create();
    $organization = Organization::factory()->create();

    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);
    $organization->members()->attach($admin, ['role' => OrganizationRole::Admin->value]);

    $this
        ->actingAs($admin)
        ->delete(route('organizations.members.destroy', [$organization, $owner]))
        ->assertForbidden();

    expect(Gate::forUser($admin)->allows('removeMember', [$organization, OrganizationRole::Owner]))->toBeFalse();
});

test('an admin cannot promote anyone to admin or owner', function () {
    $owner = User::factory()->create();
    $admin = User::factory()->create();
    $member = User::factory()->create();
    $organization = Organization::factory()->create();

    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);
    $organization->members()->attach($admin, ['role' => OrganizationRole::Admin->value]);
    $organization->members()->attach($member, ['role' => OrganizationRole::Member->value]);

    foreach ([OrganizationRole::Admin, OrganizationRole::Owner] as $role) {
        $this
            ->actingAs($admin)
            ->patch(route('organizations.members.update', [$organization, $member]), ['role' => $role->value])
            ->assertSessionHasErrors('role');

        expect(Gate::forUser($admin)->allows('updateMember', [$organization, OrganizationRole::Member, $role]))->toBeFalse();
    }

    expect($member->fresh()->organizationRole($organization))->toBe(OrganizationRole::Member);
});

test('an admin cannot invite above member', function () {
    $owner = User::factory()->create();
    $admin = User::factory()->create();
    $organization = Organization::factory()->create();

    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);
    $organization->members()->attach($admin, ['role' => OrganizationRole::Admin->value]);

    // Before ADR-028 this succeeded, including with role owner: the request accepted every enum
    // case and the policy only asked whether the actor could invite at all.
    foreach ([OrganizationRole::Admin, OrganizationRole::Owner] as $role) {
        $this
            ->actingAs($admin)
            ->post(route('organizations.invitations.store', $organization), [
                'email' => 'outsider@example.com',
                'role' => $role->value,
            ])
            ->assertSessionHasErrors('role');

        expect(Gate::forUser($admin)->allows('inviteMember', [$organization, $role]))->toBeFalse();
    }

    $this->assertDatabaseCount('organization_invitations', 0);
});

test('an admin can invite a member', function () {
    $owner = User::factory()->create();
    $admin = User::factory()->create();
    $organization = Organization::factory()->create();

    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);
    $organization->members()->attach($admin, ['role' => OrganizationRole::Admin->value]);

    $this
        ->actingAs($admin)
        ->post(route('organizations.invitations.store', $organization), [
            'email' => 'outsider@example.com',
            'role' => OrganizationRole::Member->value,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('organization_invitations', [
        'email' => 'outsider@example.com',
        'role' => OrganizationRole::Member->value,
    ]);
});

test('the owner can still do everything an admin cannot', function () {
    $owner = User::factory()->create();
    $admin = User::factory()->create();
    $organization = Organization::factory()->create();

    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);
    $organization->members()->attach($admin, ['role' => OrganizationRole::Admin->value]);

    expect(Gate::forUser($owner)->allows('removeMember', [$organization, OrganizationRole::Admin]))->toBeTrue();
    expect(Gate::forUser($owner)->allows('inviteMember', [$organization, OrganizationRole::Admin]))->toBeTrue();

    // Owner outranks nobody at its own level, so not even the Owner can hand out Owner:
    // ADR-020's transfer flow stays the only route to ownership.
    expect(Gate::forUser($owner)->allows('inviteMember', [$organization, OrganizationRole::Owner]))->toBeFalse();
});
