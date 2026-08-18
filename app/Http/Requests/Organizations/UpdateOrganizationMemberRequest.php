<?php

namespace App\Http\Requests\Organizations;

use App\Enums\Organizations\OrganizationPermission;
use App\Enums\Organizations\OrganizationRole;
use App\Models\Organizations\Organization;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateOrganizationMemberRequest extends FormRequest
{
    /**
     * Determine whether the user may change member roles at all.
     *
     * Runs before validation so someone without the permission gets a 403 rather than a field
     * error about the role they picked.
     */
    public function authorize(): bool
    {
        $organization = $this->route('organization');

        return $organization instanceof Organization
            && ($this->user()?->hasOrganizationPermission(
                $organization,
                OrganizationPermission::UpdateMember,
            ) ?? false);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * The role is restricted to what the actor may assign, which turns an escalation attempt
     * into a field error rather than a 403. The policy check is still the control (ADR-028).
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'role' => ['required', 'string', Rule::in($this->assignableRoleValues())],
        ];
    }

    /**
     * The role values the authenticated user may assign in this organization.
     *
     * @return array<int, string>
     */
    protected function assignableRoleValues(): array
    {
        $organization = $this->route('organization');

        abort_if(! $organization instanceof Organization, 404);

        $actorRole = $this->user()?->organizationRole($organization);

        return $actorRole === null
            ? []
            : array_column(OrganizationRole::assignableBy($actorRole), 'value');
    }
}
