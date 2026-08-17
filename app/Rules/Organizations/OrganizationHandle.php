<?php

namespace App\Rules\Organizations;

use App\Models\Organizations\Organization;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Str;
use Illuminate\Translation\PotentiallyTranslatedString;

/**
 * Validates the handle that identifies an organization in URLs (ADR-030, ADR-031).
 *
 * Since ADR-031 put every tenant route behind a literal `org/` segment, a handle can no longer
 * shadow an application route, so ADR-008's reserved-word list is gone for good rather than moved
 * to another field. What is left is shape and availability: a handle must be a slug, and it must
 * never have been held by anyone.
 */
class OrganizationHandle implements ValidationRule
{
    public function __construct(private ?Organization $ignoring = null) {}

    /**
     * Run the validation rule.
     *
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $handle = strtolower(trim((string) $value));

        if ($handle !== Str::slug($handle) || $handle === '') {
            $fail(__('The handle may only contain lowercase letters, numbers and hyphens.'));

            return;
        }

        if (Organization::handleIsUnavailable($handle, $this->ignoring?->id)) {
            $fail(__('This handle is already taken.'));
        }
    }
}
