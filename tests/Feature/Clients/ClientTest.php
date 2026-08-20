<?php

use App\Enums\Audit\AuditAction;
use App\Enums\Organizations\OrganizationRole;
use App\Models\Audit\AuditLogEntry;
use App\Models\Clients\Client;
use App\Models\Organizations\Organization;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * Create an organization with the given user in the given role.
 */
function organizationWith(User $user, OrganizationRole $role = OrganizationRole::Owner): Organization
{
    $organization = Organization::factory()->create();
    $organization->members()->attach($user, ['role' => $role->value]);

    return $organization;
}

test('a member sees every client in their organization', function () {
    $user = User::factory()->create();
    $organization = organizationWith($user, OrganizationRole::Member);

    Client::factory()->count(3)->create(['organization_id' => $organization->id]);

    $this->actingAs($user)
        ->get(route('clients.index', $organization))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('clients/index')
            ->has('clients', 3)
        );
});

test('the client list never leaks another organization', function () {
    $user = User::factory()->create();
    $organization = organizationWith($user);
    $other = Organization::factory()->create();

    Client::factory()->create(['organization_id' => $organization->id, 'name' => 'Ours']);
    Client::factory()->create(['organization_id' => $other->id, 'name' => 'Theirs']);

    $this->actingAs($user)
        ->get(route('clients.index', $organization))
        ->assertInertia(fn (Assert $page) => $page
            ->has('clients', 1)
            ->where('clients.0.name', 'Ours')
        );
});

test('a non-member cannot list an organization\'s clients', function () {
    $outsider = User::factory()->create();
    $organization = Organization::factory()->create();

    Client::factory()->create(['organization_id' => $organization->id]);

    $this->actingAs($outsider)
        ->get(route('clients.index', $organization))
        ->assertForbidden();
});

test('a soft-deleted client is not listed', function () {
    $user = User::factory()->create();
    $organization = organizationWith($user);

    Client::factory()->trashed()->create(['organization_id' => $organization->id]);

    $this->actingAs($user)
        ->get(route('clients.index', $organization))
        ->assertInertia(fn (Assert $page) => $page->has('clients', 0));
});

test('a member can create a client', function () {
    $user = User::factory()->create();
    $organization = organizationWith($user, OrganizationRole::Member);

    $this->actingAs($user)
        ->post(route('clients.store', $organization), [
            'name' => 'De Boer Bouw',
            'contact_email' => 'info@deboerbouw.nl',
        ])
        ->assertRedirect(route('clients.index', $organization));

    $client = $organization->clients()->sole();

    expect($client->name)->toBe('De Boer Bouw');
    expect($client->contact_email)->toBe('info@deboerbouw.nl');
    expect($client->contact_name)->toBeNull();
    expect($client->public_id)->toHaveLength(5);
});

test('a name is required and a contact email must look like one', function () {
    $user = User::factory()->create();
    $organization = organizationWith($user);

    $this->actingAs($user)
        ->post(route('clients.store', $organization), ['name' => '', 'contact_email' => 'not-an-email'])
        ->assertSessionHasErrors(['name', 'contact_email']);

    expect($organization->clients()->count())->toBe(0);
});

test('a non-member cannot create a client in an organization', function () {
    $outsider = User::factory()->create();
    $organization = Organization::factory()->create();

    $this->actingAs($outsider)
        ->post(route('clients.store', $organization), ['name' => 'Trojan'])
        ->assertForbidden();

    expect($organization->clients()->count())->toBe(0);
});

test('a member can update a client', function () {
    $user = User::factory()->create();
    $organization = organizationWith($user, OrganizationRole::Member);
    $client = Client::factory()->create(['organization_id' => $organization->id, 'name' => 'Old']);

    $this->actingAs($user)
        ->patch(route('clients.update', [$organization, $client]), ['name' => 'New'])
        ->assertRedirect(route('clients.index', $organization));

    expect($client->fresh()->name)->toBe('New');
});

test('updating a client never changes its public id', function () {
    $user = User::factory()->create();
    $organization = organizationWith($user);
    $client = Client::factory()->create(['organization_id' => $organization->id]);
    $publicId = $client->public_id;

    $this->actingAs($user)->patch(route('clients.update', [$organization, $client]), ['name' => 'Renamed']);

    expect($client->fresh()->public_id)->toBe($publicId);
});

test('a client of another organization cannot be reached through your own', function () {
    $user = User::factory()->create();
    $organization = organizationWith($user);
    $theirClient = Client::factory()->create();

    $this->actingAs($user)
        ->patch(route('clients.update', [$organization->handle, $theirClient->public_id]), ['name' => 'Hijacked'])
        ->assertNotFound();

    expect($theirClient->fresh()->name)->not->toBe('Hijacked');
});

test('a member cannot delete a client', function () {
    $user = User::factory()->create();
    $organization = organizationWith($user, OrganizationRole::Member);
    $client = Client::factory()->create(['organization_id' => $organization->id]);

    $this->actingAs($user)
        ->delete(route('clients.destroy', [$organization, $client]))
        ->assertForbidden();

    $this->assertDatabaseHas('clients', ['id' => $client->id]);
});

test('an admin can delete a client, and it goes for good', function () {
    $user = User::factory()->create();
    $organization = organizationWith($user, OrganizationRole::Admin);
    $client = Client::factory()->create(['organization_id' => $organization->id]);

    $this->actingAs($user)
        ->delete(route('clients.destroy', [$organization, $client]))
        ->assertRedirect(route('clients.index', $organization));

    $this->assertDatabaseMissing('clients', ['id' => $client->id]);
});

test('creating, updating and deleting a client each record an audit entry', function () {
    $user = User::factory()->create();
    $organization = organizationWith($user);

    $this->actingAs($user)->post(route('clients.store', $organization), ['name' => 'Audited']);
    $client = $organization->clients()->sole();

    $this->actingAs($user)->patch(route('clients.update', [$organization, $client]), ['name' => 'Audited twice']);
    $this->actingAs($user)->delete(route('clients.destroy', [$organization, $client]));

    $entries = AuditLogEntry::query()->where('organization_id', $organization->id)->orderBy('id')->get();

    expect($entries->pluck('action')->all())->toBe([
        AuditAction::ClientCreated,
        AuditAction::ClientUpdated,
        AuditAction::ClientDeleted,
    ]);

    // The label is a snapshot: the delete entry outlives the row it describes.
    expect($entries->last()->target_label)->toBe('Audited twice');
    expect($entries->last()->target_type)->toBe('client');
    expect($entries->every(fn ($entry) => $entry->actor_id === $user->id))->toBeTrue();
});

test('deleting an organization soft-deletes its clients with it', function () {
    $user = User::factory()->create();
    $organization = organizationWith($user);
    Organization::factory()->create()->members()->attach($user, ['role' => OrganizationRole::Owner->value]);

    $client = Client::factory()->create(['organization_id' => $organization->id]);

    $this->actingAs($user)->delete(route('organizations.destroy', $organization), ['name' => $organization->name]);

    $this->assertSoftDeleted('clients', ['id' => $client->id]);
});

test('public ids are not reissued while a soft-deleted client still holds one', function () {
    $organization = Organization::factory()->create();
    $trashed = Client::factory()->trashed()->create(['organization_id' => $organization->id]);

    expect(Client::publicIdIsTaken($trashed->public_id))->toBeTrue();
});

test('guests are redirected to login', function () {
    $organization = Organization::factory()->create();

    $this->get(route('clients.index', $organization))->assertRedirect(route('login'));
});
