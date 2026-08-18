<?php

namespace Database\Factories\Audit;

use App\Enums\Audit\AuditAction;
use App\Models\Audit\AuditLogEntry;
use App\Models\Organizations\Organization;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AuditLogEntry>
 */
class AuditLogEntryFactory extends Factory
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
            'actor_id' => User::factory(),
            'action' => AuditAction::MemberRemoved,
            'target_type' => 'member',
            'target_id' => null,
            'target_label' => fake()->safeEmail(),
            'context' => null,
            'ip_address' => fake()->ipv4(),
        ];
    }

    /**
     * Indicate that the entry has no attributable actor (an operator action, ADR-029).
     */
    public function withoutActor(): static
    {
        return $this->state(fn (array $attributes) => [
            'actor_id' => null,
        ]);
    }
}
