<?php

namespace App\Http\Middleware;

use App\Enums\Organizations\OrganizationRole;
use App\Models\Organizations\Organization;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOrganizationMembership
{
    /**
     * Handle an incoming request.
     *
     * Scopes the request to the organization in the URL and nothing more. It deliberately does
     * **not** persist that organization as the user's current one (ADR-025): a read should not
     * perform a write, and following a colleague's link used to repoint every other tab. The
     * stored organization changes only through an explicit switch.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, ?string $minimumRole = null): Response
    {
        [$user, $organization] = [$request->user(), $this->organization($request)];

        abort_if(! $user || ! $organization || ! $user->belongsToOrganization($organization), 403);

        $this->ensureOrganizationMemberHasRequiredRole($user, $organization, $minimumRole);

        return $next($request);
    }

    /**
     * Ensure the given user has at least the given role, if applicable.
     */
    protected function ensureOrganizationMemberHasRequiredRole(User $user, Organization $organization, ?string $minimumRole): void
    {
        if ($minimumRole === null) {
            return;
        }

        $role = $user->organizationRole($organization);

        $requiredRole = OrganizationRole::tryFrom($minimumRole);

        abort_if(
            $requiredRole === null ||
            $role === null ||
            ! $role->isAtLeast($requiredRole),
            403,
        );
    }

    /**
     * Get the organization associated with the request.
     */
    protected function organization(Request $request): ?Organization
    {
        $organization = $request->route('organization');

        if (is_string($organization)) {
            $organization = Organization::where('handle', $organization)->first();
        }

        return $organization;
    }
}
