<?php

namespace App\Http\Requests\Organizations;

use App\Enums\Organizations\OrganizationPermission;
use App\Enums\Organizations\OrganizationRole;
use App\Models\Organizations\Organization;
use App\Rules\Organizations\UniqueOrganizationInvitation;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateOrganizationInvitationRequest extends FormRequest
{
    /**
     * Determine whether the user may invite anyone at all.
     *
     * This has to run before validation, or someone with no business inviting would get a
     * field error about the role instead of a 403.
     */
    public function authorize(): bool
    {
        $organization = $this->route('organization');

        return $organization instanceof Organization
            && ($this->user()?->hasOrganizationPermission(
                $organization,
                OrganizationPermission::CreateInvitation,
            ) ?? false);
    }

    /**
     * The role values the authenticated user may invite someone as.
     *
     * `Rule::enum` used to sit here, which accepted every case including Owner — so any Admin
     * could invite a new Owner. The bound is the actor's own rank (ADR-028).
     *
     * @return array<int, string>
     */
    protected function assignableRoleValues(Organization $organization): array
    {
        $actorRole = $this->user()?->organizationRole($organization);

        return $actorRole === null
            ? []
            : array_column(OrganizationRole::assignableBy($actorRole), 'value');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $organization = $this->route('organization');

        abort_if(! $organization instanceof Organization, 404);

        return [
            'email' => ['required', 'string', 'email', 'max:255', new UniqueOrganizationInvitation($organization)],
            'role' => ['required', 'string', Rule::in($this->assignableRoleValues($organization))],
        ];
    }
}
