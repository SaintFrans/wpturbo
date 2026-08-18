<?php

namespace App\Http\Middleware;

use App\Models\Organizations\Organization;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Symfony\Component\HttpFoundation\Response;

class SetOrganizationUrlDefaults
{
    /**
     * Set the default URL parameters for organization-based routes.
     *
     * The organization in the URL wins over the user's stored one. Since ADR-025 removed the
     * implicit switch, viewing `/org/b/...` while your current organization is `a` is a normal
     * state — and every link rendered on that page has to point at `b`, not at `a`.
     *
     * Membership is not checked here. This only decides which handle link generation fills in;
     * `EnsureOrganizationMembership` aborts the request before any of it reaches the browser.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $organization = $this->organizationFromRoute($request)
            ?? $request->user()?->currentOrganization;

        if ($organization) {
            URL::defaults(['organization' => $organization->handle]);
        }

        return $next($request);
    }

    /**
     * Resolve the organization named by the current route, if any.
     */
    protected function organizationFromRoute(Request $request): ?Organization
    {
        $organization = $request->route('organization');

        if (is_string($organization)) {
            return Organization::where('handle', $organization)->first();
        }

        return $organization instanceof Organization ? $organization : null;
    }
}
