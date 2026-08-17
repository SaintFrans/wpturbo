<?php

namespace App\Http\Responses\Concerns;

use App\Models\Organizations\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

trait RedirectsToCurrentOrganization
{
    protected function redirectPathForCurrentOrganization(Request $request, string $redirect): string
    {
        $organization = $this->currentOrganization($request);

        URL::defaults(['organization' => $organization->handle]);

        return "/org/{$organization->handle}{$redirect}";
    }

    protected function currentOrganization(Request $request): Organization
    {
        $user = $request->user();

        abort_if(! $user, 403);

        $organization = $user->currentOrganization ?? $user->personalOrganization();

        abort_if(! $organization, 403);

        return $organization;
    }
}
