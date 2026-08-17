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
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, ?string $minimumRole = null): Response
    {
        [$user, $organization] = [$request->user(), $this->organization($request)];

        abort_if(! $user || ! $organization || ! $user->belongsToOrganization($organization), 403);

        $this->ensureOrganizationMemberHasRequiredRole($user, $organization, $minimumRole);

        if (! $user->isCurrentOrganization($organization)) {
            $user->switchOrganization($organization);
        }

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
