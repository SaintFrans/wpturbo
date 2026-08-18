<?php

use App\Enums\Organizations\OrganizationRole;
use App\Models\Organizations\Organization;
use App\Models\Organizations\OrganizationInvitation;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));

    $response->assertOk();
});

test('registration screen includes organization invitation context', function () {
    $owner = User::factory()->create();
    $organization = Organization::factory()->create(['name' => 'Laravel Organization']);
    $organization->members()->attach($owner, ['role' => OrganizationRole::Owner->value]);

    $invitation = OrganizationInvitation::factory()->create([
        'organization_id' => $organization->id,
        'email' => 'invited@example.com',
        'invited_by' => $owner->id,
    ]);

    $response = $this->get(route('register', ['invitation' => $invitation->code]));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('auth/register')
        ->where('organizationInvitation.code', $invitation->code)
        ->where('organizationInvitation.organizationName', 'Laravel Organization'),
    );
});

test('new users can register', function () {
    $response = $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertAuthenticated();

    $user = User::where('email', 'test@example.com')->first();
    $response->assertRedirect(route('dashboard'));
});

test('the organization created at registration is named after the user', function () {
    $this->post(route('register.store'), [
        'name' => 'Frans Bijleveld',
        'email' => 'frans@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $organization = User::where('email', 'frans@example.com')->sole()->fallbackOrganization();

    // No "'s Organization" suffix: not everyone signing up is a company (ADR-025).
    expect($organization)
        ->name->toBe('Frans Bijleveld')
        ->handle->toBe('frans-bijleveld');
});
