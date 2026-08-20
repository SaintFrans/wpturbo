<?php

namespace App\Http\Requests\Clients;

use App\Models\Clients\Client;
use App\Models\Organizations\Organization;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class SaveClientRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * One request serves create and update, so it authorises against whichever of the two this
     * is: the client when the route carries one, the organization when it does not.
     */
    public function authorize(): bool
    {
        $client = $this->route('client');

        if ($client instanceof Client) {
            return Gate::allows('update', $client);
        }

        return Gate::allows('create', [Client::class, $this->organization()]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * A name and an email address are both required: a client with no way to reach them is a
     * record that cannot be acted on, and every later feature that mails a client — reports,
     * billing, ticketing (ADR-017) — would have to handle the gap. The phone number is optional.
     *
     * The email is validated for shape but deliberately not for uniqueness — two clients of the
     * same agency can legitimately share a contact.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'contact_email' => ['required', 'email', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:50'],
        ];
    }

    /**
     * Get the organization the request is scoped to.
     */
    public function organization(): Organization
    {
        $organization = $this->route('organization');

        abort_if(! $organization instanceof Organization, 404);

        return $organization;
    }
}
