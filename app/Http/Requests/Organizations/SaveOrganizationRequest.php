<?php

namespace App\Http\Requests\Organizations;

use App\Models\Organizations\Organization;
use App\Rules\Organizations\OrganizationHandle;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SaveOrganizationRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * The name is free text: since ADR-030 it no longer reaches the URL, so it needs no
     * reserved-word check. The handle does, and carries it in `OrganizationHandle`.
     *
     * `handle` is optional. On create it is absent and gets seeded from the name; on update the
     * form sends it, but an unchanged organization may still omit it.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'handle' => ['sometimes', 'string', 'max:255', new OrganizationHandle($this->routeOrganization())],
        ];
    }

    /**
     * The organization being updated, if any — its own handle must not count against it.
     */
    protected function routeOrganization(): ?Organization
    {
        $organization = $this->route('organization');

        return $organization instanceof Organization ? $organization : null;
    }
}
