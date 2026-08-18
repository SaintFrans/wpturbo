<?php

namespace App\Http\Controllers\Organizations;

use App\Actions\Organizations\CreateOrganization;
use App\Actions\Organizations\EnsureUserHasOrganization;
use App\Http\Controllers\Controller;
use App\Http\Requests\Organizations\DeleteOrganizationRequest;
use App\Http\Requests\Organizations\SaveOrganizationRequest;
use App\Models\Organizations\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationController extends Controller
{
    /**
     * Send the user to their own organization.
     *
     * There is no organizations index: creating one happens in the header switcher, deleting one
     * on its General settings tab, so a list page had nothing left to do. The route survives as a
     * stable "take me to my organization" entry point.
     */
    public function index(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $user->currentOrganization ?? $user->fallbackOrganization();

        abort_if(! $organization, 404);

        return to_route('organizations.edit', ['organization' => $organization->handle]);
    }

    /**
     * Store a newly created organization.
     */
    public function store(SaveOrganizationRequest $request, CreateOrganization $createOrganization): RedirectResponse
    {
        $organization = $createOrganization->handle($request->user(), $request->validated('name'));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Organization created.')]);

        return to_route('organizations.edit', ['organization' => $organization->handle]);
    }

    /**
     * Show the organization's general settings.
     */
    public function edit(Request $request, Organization $organization): Response
    {
        return Inertia::render('organizations/settings/general', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'handle' => $organization->handle,
            ],
            'permissions' => $request->user()->toOrganizationPermissions($organization),
        ]);
    }

    /**
     * Update the specified organization.
     */
    public function update(SaveOrganizationRequest $request, Organization $organization): RedirectResponse
    {
        Gate::authorize('update', $organization);

        $organization = DB::transaction(function () use ($request, $organization) {
            $organization = Organization::whereKey($organization->id)->lockForUpdate()->firstOrFail();

            $organization->update(array_filter([
                'name' => $request->validated('name'),
                'handle' => $request->validated('handle'),
            ], fn ($value) => $value !== null));

            return $organization;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Organization updated.')]);

        return to_route('organizations.edit', ['organization' => $organization->handle]);
    }

    /**
     * Switch the user's current organization.
     */
    public function switch(Request $request, Organization $organization): RedirectResponse
    {
        abort_unless($request->user()->belongsToOrganization($organization), 403);

        $request->user()->switchOrganization($organization);

        return back();
    }

    /**
     * Leave the specified organization.
     */
    public function leave(Request $request, Organization $organization): RedirectResponse
    {
        Gate::authorize('leave', $organization);

        $user = $request->user();

        $fallbackOrganization = $user->isCurrentOrganization($organization)
            ? $user->fallbackOrganization($organization)
            : null;

        // Leaving is an individual act, so the membership goes for good (ADR-019).
        $organization->memberships()
            ->where('user_id', $user->id)
            ->forceDelete();

        if ($fallbackOrganization) {
            $user->switchOrganization($fallbackOrganization);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('You left the organization ":name"', ['name' => $organization->name])]);

        return to_route('organizations.index');
    }

    /**
     * Delete the specified organization.
     */
    public function destroy(DeleteOrganizationRequest $request, Organization $organization, EnsureUserHasOrganization $ensureUserHasOrganization): RedirectResponse
    {
        $user = $request->user();
        $fallbackOrganization = $user->isCurrentOrganization($organization)
            ? $user->fallbackOrganization($organization)
            : null;

        DB::transaction(function () use ($user, $organization, $ensureUserHasOrganization) {
            // Everyone else loses a membership they did not choose to lose, so the
            // always-one-organization invariant is restored for them here (ADR-025).
            User::where('current_organization_id', $organization->id)
                ->where('id', '!=', $user->id)
                ->each(fn (User $affectedUser) => $affectedUser->switchOrganization(
                    $ensureUserHasOrganization->handle($affectedUser, $organization),
                ));

            // The whole tree soft-deletes together, so a restore is a coherent organization
            // rather than an empty shell (ADR-034). Audit entries deliberately stay outside it.
            $organization->invitations()->delete();
            $organization->memberships()->delete();
            $organization->delete();
        });

        if ($fallbackOrganization) {
            $user->switchOrganization($fallbackOrganization);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Organization deleted.')]);

        return to_route('organizations.index');
    }
}
