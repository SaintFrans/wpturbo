<?php

use App\Enums\Organizations\OrganizationRole;
use App\Models\Organizations\Organization;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('the organizations index redirects to the user\'s own organization', function () {
    $user = User::factory()->create();

    // There is no list page: creating happens in the header switcher, deleting on the General
    // tab, so /org is only an entry point into the organization you are already in.
    $this
        ->actingAs($user)
        ->get(route('organizations.index'))
        ->assertRedirect(route('organizations.edit', $user->personalOrganization()));
});

test('organizations can be created', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->post(route('organizations.store'), [
            'name' => 'Test Organization',
        ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('organizations', [
        'name' => 'Test Organization',
        'is_personal' => false,
    ]);
});

test('a new organization gets a handle derived from its name', function () {
    $organization = Organization::factory()->create(['name' => 'OUI DO Digital']);

    expect($organization->handle)->toBe('oui-do-digital');
});

test('renaming an organization does not change its handle', function () {
    $user = User::factory()->create();
    $organization = Organization::factory()->create(['name' => 'Acme']);
    $organization->memberships()->create([
        'user_id' => $user->id,
        'role' => OrganizationRole::Owner,
    ]);

    $this
        ->actingAs($user)
        ->patch(route('organizations.update', $organization), ['name' => 'Acme Group'])
        ->assertRedirect();

    expect($organization->fresh())
        ->name->toBe('Acme Group')
        ->handle->toBe('acme');
});

test('a colliding name gets a suffixed handle', function () {
    Organization::factory()->create(['name' => 'Acme']);
    $second = Organization::factory()->create(['name' => 'Acme']);

    expect($second->handle)->toBe('acme-2');
});

test('the handle can be changed independently of the name', function () {
    $user = User::factory()->create();
    $organization = Organization::factory()->create(['name' => 'Acme']);
    $organization->memberships()->create([
        'user_id' => $user->id,
        'role' => OrganizationRole::Owner,
    ]);

    $this
        ->actingAs($user)
        ->patch(route('organizations.update', $organization), [
            'name' => 'Acme',
            'handle' => 'acme-group',
        ])
        ->assertRedirect();

    expect($organization->fresh())
        ->name->toBe('Acme')
        ->handle->toBe('acme-group');
});

test('a released handle is never reissued to another organization', function () {
    $user = User::factory()->create();
    $organization = Organization::factory()->create(['name' => 'Acme']);
    $organization->memberships()->create([
        'user_id' => $user->id,
        'role' => OrganizationRole::Owner,
    ]);

    $this->actingAs($user)->patch(route('organizations.update', $organization), [
        'name' => 'Acme',
        'handle' => 'acme-group',
    ]);

    // 'acme' is free in the organizations table now, but every bookmark pointing at it must not
    // start resolving to somebody else.
    $other = User::factory()->create();
    $otherOrganization = Organization::factory()->create();
    $otherOrganization->memberships()->create([
        'user_id' => $other->id,
        'role' => OrganizationRole::Owner,
    ]);

    $this
        ->actingAs($other)
        ->patch(route('organizations.update', $otherOrganization), [
            'name' => $otherOrganization->name,
            'handle' => 'acme',
        ])
        ->assertSessionHasErrors('handle');
});

test('a soft deleted organization does not release its handle', function () {
    $organization = Organization::factory()->create(['name' => 'Acme']);
    $organization->delete();

    $replacement = Organization::factory()->create(['name' => 'Acme']);

    expect($replacement->handle)->toBe('acme-2');
});

test('a handle matching an application route is allowed', function () {
    $user = User::factory()->create();
    $organization = Organization::factory()->create();
    $organization->memberships()->create([
        'user_id' => $user->id,
        'role' => OrganizationRole::Owner,
    ]);

    // Every tenant route sits behind a literal `org/` segment (ADR-031), so a handle can no
    // longer shadow anything and needs no reserved-word list.
    $this
        ->actingAs($user)
        ->patch(route('organizations.update', $organization), [
            'name' => $organization->name,
            'handle' => 'settings',
        ])
        ->assertSessionHasNoErrors();

    expect($organization->fresh()->handle)->toBe('settings');
});

test('a malformed handle is rejected', function () {
    $user = User::factory()->create();
    $organization = Organization::factory()->create();
    $organization->memberships()->create([
        'user_id' => $user->id,
        'role' => OrganizationRole::Owner,
    ]);

    $this
        ->actingAs($user)
        ->patch(route('organizations.update', $organization), [
            'name' => $organization->name,
            'handle' => 'Not A Slug!',
        ])
        ->assertSessionHasErrors('handle');
});

test('an organization may be named after a reserved route prefix', function () {
    $user = User::factory()->create();

    // The name is free text — only the handle has to coexist with the application's routes.
    $this
        ->actingAs($user)
        ->post(route('organizations.store'), ['name' => 'Settings'])
        ->assertRedirect();

    $this->assertDatabaseHas('organizations', ['name' => 'Settings']);
});

test('the organization general settings page can be rendered', function () {
    $user = User::factory()->create();
    $organization = Organization::factory()->create();

    $organization->members()->attach($user, ['role' => OrganizationRole::Owner->value]);

    $response = $this
        ->actingAs($user)
        ->get(route('organizations.edit', $organization));

    $response
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('organizations/settings/general')
            ->where('organization.name', $organization->name)
            ->where('organization.handle', $organization->handle),
        );
});

test('organizations can be updated by owners', function () {
    $user = User::factory()->create();
    $organization = Organization::factory()->create(['name' => 'Original Name']);

    $organization->members()->attach($user, ['role' => OrganizationRole::Owner->value]);

    $response = $this
        ->actingAs($user)
        ->patch(route('organizations.update', $organization), [
            'name' => 'Updated Name',
        ]);

    $response->assertRedirect(route('organizations.edit', $organization->fresh()));

    $this->assertDatabaseHas('organizations', [
        'id' => $organization->id,
        'name' => 'Updated Name',
    ]);
});

test('organizations cannot be updated by members', function () {
    $owner = User::factory()->create();
    $member = User::factory()->create();
    $organization = Organization::factory()->create();

    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);
    $organization->members()->attach($member, ['role' => OrganizationRole::Member->value]);

    $response = $this
        ->actingAs($member)
        ->patch(route('organizations.update', $organization), [
            'name' => 'Updated Name',
        ]);

    $response->assertForbidden();
});

test('organizations can be deleted by owners', function () {
    $user = User::factory()->create();
    $organization = Organization::factory()->create();

    $organization->members()->attach($user, ['role' => OrganizationRole::Owner->value]);

    $response = $this
        ->actingAs($user)
        ->delete(route('organizations.destroy', $organization), [
            'name' => $organization->name,
        ]);

    $response->assertRedirect();

    $this->assertSoftDeleted('organizations', [
        'id' => $organization->id,
    ]);
});

test('organization deletion requires name confirmation', function () {
    $user = User::factory()->create();
    $organization = Organization::factory()->create();

    $organization->members()->attach($user, ['role' => OrganizationRole::Owner->value]);

    $response = $this
        ->actingAs($user)
        ->delete(route('organizations.destroy', $organization), [
            'name' => 'Wrong Name',
        ]);

    $response->assertSessionHasErrors('name');

    $this->assertDatabaseHas('organizations', [
        'id' => $organization->id,
        'deleted_at' => null,
    ]);
});

test('deleting current organization switches to alphabetically first remaining organization', function () {
    $user = User::factory()->create(['name' => 'Mike']);

    $zuluOrganization = Organization::factory()->create(['name' => 'Zulu Organization']);
    $zuluOrganization->members()->attach($user, ['role' => OrganizationRole::Owner->value]);

    $alphaOrganization = Organization::factory()->create(['name' => 'Alpha Organization']);
    $alphaOrganization->members()->attach($user, ['role' => OrganizationRole::Owner->value]);

    $betaOrganization = Organization::factory()->create(['name' => 'Beta Organization']);
    $betaOrganization->members()->attach($user, ['role' => OrganizationRole::Owner->value]);

    $user->update(['current_organization_id' => $zuluOrganization->id]);

    $response = $this
        ->actingAs($user)
        ->delete(route('organizations.destroy', $zuluOrganization), [
            'name' => $zuluOrganization->name,
        ]);

    $response->assertRedirect();

    $this->assertSoftDeleted('organizations', [
        'id' => $zuluOrganization->id,
    ]);

    expect($user->fresh()->current_organization_id)->toEqual($alphaOrganization->id);
});

test('deleting current organization falls back to personal organization when alphabetically first', function () {
    $user = User::factory()->create();
    $personalOrganization = $user->personalOrganization();
    $organization = Organization::factory()->create(['name' => 'Zulu Organization']);
    $organization->members()->attach($user, ['role' => OrganizationRole::Owner->value]);

    $user->update(['current_organization_id' => $organization->id]);

    $response = $this
        ->actingAs($user)
        ->delete(route('organizations.destroy', $organization), [
            'name' => $organization->name,
        ]);

    $response->assertRedirect();

    $this->assertSoftDeleted('organizations', [
        'id' => $organization->id,
    ]);

    expect($user->fresh()->current_organization_id)->toEqual($personalOrganization->id);
});

test('deleting non current organization leaves current organization unchanged', function () {
    $user = User::factory()->create();
    $personalOrganization = $user->personalOrganization();
    $organization = Organization::factory()->create();
    $organization->members()->attach($user, ['role' => OrganizationRole::Owner->value]);

    $user->update(['current_organization_id' => $personalOrganization->id]);

    $response = $this
        ->actingAs($user)
        ->delete(route('organizations.destroy', $organization), [
            'name' => $organization->name,
        ]);

    $response->assertRedirect();

    $this->assertSoftDeleted('organizations', [
        'id' => $organization->id,
    ]);

    expect($user->fresh()->current_organization_id)->toEqual($personalOrganization->id);
});

test('members can leave non personal organizations', function () {
    $owner = User::factory()->create();
    $member = User::factory()->create();
    $organization = Organization::factory()->create();

    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);
    $organization->members()->attach($member, ['role' => OrganizationRole::Member->value]);

    $response = $this
        ->actingAs($member)
        ->delete(route('organizations.leave', $organization));

    $response->assertRedirect(route('organizations.index'));
    $response->assertInertiaFlash('toast', ['type' => 'success', 'message' => "You left the organization \"{$organization->name}\""]);

    expect($member->fresh()->belongsToOrganization($organization))->toBeFalse();
});

test('leaving current organization switches to alphabetically first remaining organization', function () {
    $owner = User::factory()->create();
    $member = User::factory()->create(['name' => 'Mike']);

    $zuluOrganization = Organization::factory()->create(['name' => 'Zulu Organization']);
    $zuluOrganization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);
    $zuluOrganization->members()->attach($member, ['role' => OrganizationRole::Member->value]);

    $alphaOrganization = Organization::factory()->create(['name' => 'Alpha Organization']);
    $alphaOrganization->members()->attach($member, ['role' => OrganizationRole::Member->value]);

    $betaOrganization = Organization::factory()->create(['name' => 'Beta Organization']);
    $betaOrganization->members()->attach($member, ['role' => OrganizationRole::Member->value]);

    $member->update(['current_organization_id' => $zuluOrganization->id]);

    $response = $this
        ->actingAs($member)
        ->delete(route('organizations.leave', $zuluOrganization));

    $response->assertRedirect(route('organizations.index'));

    expect($member->fresh()->belongsToOrganization($zuluOrganization))->toBeFalse();
    expect($member->fresh()->current_organization_id)->toEqual($alphaOrganization->id);
});

test('personal organizations cannot be left', function () {
    $user = User::factory()->create();
    $personalOrganization = $user->personalOrganization();

    $response = $this
        ->actingAs($user)
        ->delete(route('organizations.leave', $personalOrganization));

    $response->assertForbidden();

    expect($user->fresh()->belongsToOrganization($personalOrganization))->toBeTrue();
});

test('organization owners cannot leave their organization', function () {
    $owner = User::factory()->create();
    $organization = Organization::factory()->create();

    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);

    $response = $this
        ->actingAs($owner)
        ->delete(route('organizations.leave', $organization));

    $response->assertForbidden();

    expect($owner->fresh()->belongsToOrganization($organization))->toBeTrue();
});

test('users cannot leave organizations they dont belong to', function () {
    $user = User::factory()->create();
    $organization = Organization::factory()->create();

    $response = $this
        ->actingAs($user)
        ->delete(route('organizations.leave', $organization));

    $response->assertForbidden();
});

test('deleting organization switches other affected users to their personal organization', function () {
    $owner = User::factory()->create();
    $member = User::factory()->create();

    $organization = Organization::factory()->create();
    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);
    $organization->members()->attach($member, ['role' => OrganizationRole::Member->value]);

    $owner->update(['current_organization_id' => $organization->id]);
    $member->update(['current_organization_id' => $organization->id]);

    $response = $this
        ->actingAs($owner)
        ->delete(route('organizations.destroy', $organization), [
            'name' => $organization->name,
        ]);

    $response->assertRedirect();

    expect($member->fresh()->current_organization_id)->toEqual($member->personalOrganization()->id);
});

test('personal organizations cannot be deleted', function () {
    $user = User::factory()->create();

    $personalOrganization = $user->personalOrganization();

    $response = $this
        ->actingAs($user)
        ->delete(route('organizations.destroy', $personalOrganization), [
            'name' => $personalOrganization->name,
        ]);

    $response->assertForbidden();

    $this->assertDatabaseHas('organizations', [
        'id' => $personalOrganization->id,
        'deleted_at' => null,
    ]);
});

test('organizations cannot be deleted by non owners', function () {
    $owner = User::factory()->create();
    $member = User::factory()->create();
    $organization = Organization::factory()->create();

    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);
    $organization->members()->attach($member, ['role' => OrganizationRole::Member->value]);

    $response = $this
        ->actingAs($member)
        ->delete(route('organizations.destroy', $organization), [
            'name' => $organization->name,
        ]);

    $response->assertForbidden();
});

test('users can switch organizations', function () {
    $user = User::factory()->create();
    $organization = Organization::factory()->create();

    $organization->members()->attach($user, ['role' => OrganizationRole::Member->value]);

    $response = $this
        ->actingAs($user)
        ->post(route('organizations.switch', $organization));

    $response->assertRedirect();

    expect($user->fresh()->current_organization_id)->toEqual($organization->id);
});

test('users cannot switch to organization they dont belong to', function () {
    $user = User::factory()->create();
    $organization = Organization::factory()->create();

    $response = $this
        ->actingAs($user)
        ->post(route('organizations.switch', $organization));

    $response->assertForbidden();
});

test('guests cannot access organizations', function () {
    $response = $this->get(route('organizations.index'));

    $response->assertRedirect(route('login'));
});

test('the organization members settings page lists members and invitations', function () {
    $user = User::factory()->create();
    $organization = Organization::factory()->create();

    $organization->members()->attach($user, ['role' => OrganizationRole::Owner->value]);

    $this
        ->actingAs($user)
        ->get(route('organizations.members.index', $organization))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('organizations/settings/members')
            ->where('members.0.role', OrganizationRole::Owner->value)
            ->where('members.0.role_label', OrganizationRole::Owner->label()),
        );
});

test('a non member cannot open the organization settings', function () {
    $outsider = User::factory()->create();
    $organization = Organization::factory()->create();

    $this->actingAs($outsider)->get(route('organizations.edit', $organization))->assertForbidden();
    $this->actingAs($outsider)->get(route('organizations.members.index', $organization))->assertForbidden();
});
