<?php

namespace App\Http\Requests\Organizations;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SaveOrganizationRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * The name needs no reserved-word check: since ADR-027 the URL identifier is a random
     * `public_id` rather than a slug of the name, so a name can no longer shadow a route.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
        ];
    }
}
