<?php

use App\Enums\Organizations\OrganizationRole;
use App\Models\Organizations\Organization;
use App\Models\User;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;

test('the organizations index redirects to the user\'s own organization', function () {
    $user = User::factory()->create();

    // There is no list page: creating happens in the header switcher, deleting on the General
    // tab, so /org is only an entry point into the organization you are already in.
    $this
        ->actingAs($user)
        ->get(route('organizations.index'))
        ->assertRedirect(route('organizations.edit', $user->fallbackOrganization()));
});

test('organizations can be created', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->post(route('organizations.store'), [
            'name' => 'Test Organization',
        ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('organizations', ['name' => 'Test Organization']);
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
    $ownOrganization = $user->fallbackOrganization();
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

    expect($user->fresh()->current_organization_id)->toEqual($ownOrganization->id);
});

test('deleting non current organization leaves current organization unchanged', function () {
    $user = User::factory()->create();
    $ownOrganization = $user->fallbackOrganization();
    $organization = Organization::factory()->create();
    $organization->members()->attach($user, ['role' => OrganizationRole::Owner->value]);

    $user->update(['current_organization_id' => $ownOrganization->id]);

    $response = $this
        ->actingAs($user)
        ->delete(route('organizations.destroy', $organization), [
            'name' => $organization->name,
        ]);

    $response->assertRedirect();

    $this->assertSoftDeleted('organizations', [
        'id' => $organization->id,
    ]);

    expect($user->fresh()->current_organization_id)->toEqual($ownOrganization->id);
});

test('members can leave an organization when it is not their last', function () {
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

test('a user cannot leave their last organization', function () {
    $user = User::factory()->create();
    $ownOrganization = $user->fallbackOrganization();

    $response = $this
        ->actingAs($user)
        ->delete(route('organizations.leave', $ownOrganization));

    $response->assertForbidden();

    expect($user->fresh()->belongsToOrganization($ownOrganization))->toBeTrue();
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

test('deleting an organization gives affected members a valid current organization', function () {
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

    expect($member->fresh()->current_organization_id)->toEqual($member->fallbackOrganization()->id);
});

test('a user cannot delete their last organization', function () {
    $user = User::factory()->create();

    $ownOrganization = $user->fallbackOrganization();

    $response = $this
        ->actingAs($user)
        ->delete(route('organizations.destroy', $ownOrganization), [
            'name' => $ownOrganization->name,
        ]);

    $response->assertForbidden();

    $this->assertDatabaseHas('organizations', [
        'id' => $ownOrganization->id,
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

test('the organization created at registration carries no personal flag', function () {
    $user = User::factory()->create(['name' => 'Frans Bijleveld']);
    $organization = $user->fallbackOrganization();

    // It is an ordinary organization: renameable, and deletable once a second one exists.
    expect($organization->name)->toBe('Frans Bijleveld');
    expect(Schema::hasColumn('organizations', 'is_personal'))->toBeFalse();
});

test('a user can delete their first organization once they have a second', function () {
    $user = User::factory()->create();
    $first = $user->fallbackOrganization();

    $second = Organization::factory()->create(['name' => 'Zulu Organization']);
    $second->members()->attach($user, ['role' => OrganizationRole::Owner->value]);

    $this
        ->actingAs($user)
        ->delete(route('organizations.destroy', $first), ['name' => $first->name])
        ->assertRedirect();

    $this->assertSoftDeleted('organizations', ['id' => $first->id]);
});

test('a member removed from their last organization gets a new one', function () {
    $owner = User::factory()->create();
    $member = User::factory()->create();
    $organization = Organization::factory()->create();

    $memberOwnOrganization = $member->fallbackOrganization();

    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);
    $organization->members()->attach($member, ['role' => OrganizationRole::Member->value]);

    // Strip the member's own organization so the shared one really is their last.
    $memberOwnOrganization->memberships()->delete();
    $member->update(['current_organization_id' => $organization->id]);

    $this
        ->actingAs($owner)
        ->delete(route('organizations.members.destroy', [$organization, $member]))
        ->assertRedirect();

    $member->refresh();

    expect($member->organizations()->count())->toBe(1);
    expect($member->current_organization_id)->not->toBeNull();
    expect($member->currentOrganization->name)->toBe($member->name);
});

test('members of a deleted organization keep a valid current organization', function () {
    $owner = User::factory()->create();
    $member = User::factory()->create();
    $organization = Organization::factory()->create();

    $memberOwnOrganization = $member->fallbackOrganization();

    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);
    $organization->members()->attach($member, ['role' => OrganizationRole::Member->value]);

    $memberOwnOrganization->memberships()->delete();
    $member->update(['current_organization_id' => $organization->id]);

    $this
        ->actingAs($owner)
        ->delete(route('organizations.destroy', $organization), ['name' => $organization->name])
        ->assertRedirect();

    $member->refresh();

    expect($member->current_organization_id)->not->toBeNull();
    expect($member->belongsToOrganization($member->currentOrganization))->toBeTrue();
});

test('an owner with a second organization can still not leave the one they own', function () {
    $owner = User::factory()->create();
    $organization = Organization::factory()->create();
    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);

    // Two guards used to live in one condition; dropping is_personal must not drop this one.
    $this
        ->actingAs($owner)
        ->delete(route('organizations.leave', $organization))
        ->assertForbidden();
});

test('visiting another organization does not change the current one', function () {
    $user = User::factory()->create();
    $own = $user->fallbackOrganization();

    $other = Organization::factory()->create(['name' => 'Zulu Organization']);
    $other->members()->attach($user, ['role' => OrganizationRole::Member->value]);

    // A read must not perform a write: following a colleague's link used to repoint every
    // other tab to their organization (ADR-025).
    $this
        ->actingAs($user)
        ->get(route('dashboard', ['organization' => $other->handle]))
        ->assertOk();

    expect($user->fresh()->current_organization_id)->toEqual($own->id);
});

test('links rendered under another organization point at that organization', function () {
    $user = User::factory()->create();
    $other = Organization::factory()->create(['name' => 'Zulu Organization']);
    $other->members()->attach($user, ['role' => OrganizationRole::Member->value]);

    $this->actingAs($user)->get(route('dashboard', ['organization' => $other->handle]));

    // URL::defaults must follow the URL, not the stored organization, or every link on the
    // page would silently point somewhere else.
    expect(route('dashboard', absolute: false))->toBe("/org/{$other->handle}/dashboard");
});

test('switching organizations is what changes the current one', function () {
    $user = User::factory()->create();
    $other = Organization::factory()->create(['name' => 'Zulu Organization']);
    $other->members()->attach($user, ['role' => OrganizationRole::Member->value]);

    $this
        ->actingAs($user)
        ->post(route('organizations.switch', $other))
        ->assertRedirect();

    expect($user->fresh()->current_organization_id)->toEqual($other->id);
});
