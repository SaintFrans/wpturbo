<?php

namespace Database\Factories\Clients;

use App\Models\Clients\Client;
use App\Models\Organizations\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Client>
 */
class ClientFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'name' => fake()->unique()->company(),
            'contact_name' => fake()->name(),
            'contact_email' => fake()->unique()->safeEmail(),
            'contact_phone' => fake()->phoneNumber(),
        ];
    }

    /**
     * Indicate that the client holds nothing but a name.
     */
    public function withoutContactDetails(): static
    {
        return $this->state(fn (array $attributes) => [
            'contact_name' => null,
            'contact_email' => null,
            'contact_phone' => null,
        ]);
    }

    /**
     * Indicate that the client has been deleted.
     */
    public function trashed(): static
    {
        return $this->state(fn (array $attributes) => [
            'deleted_at' => now(),
        ]);
    }
}
