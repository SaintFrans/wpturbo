<?php

namespace App\Models\Audit;

use App\Enums\Audit\AuditAction;
use App\Models\Organizations\Organization;
use App\Models\User;
use Database\Factories\Audit\AuditLogEntryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * An append-only record of who did what, to whom, in which organization (ADR-032).
 *
 * Append-only is a convention, not a database guarantee: this model exposes no update path
 * and nothing in the application writes one. Enforcing it at the database level (privileges
 * or triggers) is a deployment concern, out of scope here — stated so nobody reads more
 * assurance into it than exists.
 *
 * `organization_id` and `target_id` carry no foreign key constraint: entries must survive the
 * organization's eventual hard purge (ADR-036), and the target is frequently already
 * force-deleted by the very action being recorded. `target_label` is a snapshot taken at write
 * time for exactly that reason — the target itself usually cannot be resolved by the time
 * anyone reads this.
 *
 * @property int $id
 * @property int $organization_id
 * @property int|null $actor_id
 * @property AuditAction $action
 * @property string|null $target_type
 * @property int|null $target_id
 * @property string|null $target_label
 * @property array<string, mixed>|null $context
 * @property string|null $ip_address
 * @property Carbon $created_at
 * @property-read User|null $actor
 */
#[Fillable(['organization_id', 'actor_id', 'action', 'target_type', 'target_id', 'target_label', 'context', 'ip_address'])]
class AuditLogEntry extends Model
{
    /** @use HasFactory<AuditLogEntryFactory> */
    use HasFactory;

    /**
     * Nothing updates an entry after it is written.
     */
    const UPDATED_AT = null;

    /**
     * Get the user who performed the action.
     *
     * Null for operator actions (ADR-029) and, later, the agent — neither is a user. Every
     * renderer must handle that.
     *
     * @return BelongsTo<User, $this>
     */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the organization this entry belongs to.
     *
     * Deliberately not enforced by a database constraint — see the class docblock. Reads through
     * this relationship anyway, per the tenant-scoping rule (SECURITY.md §5 rule 1), so the query
     * shape matches every other tenant-owned resource even though the constraint does not exist.
     *
     * @return BelongsTo<Organization, $this>
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'action' => AuditAction::class,
            'context' => 'array',
            'created_at' => 'datetime',
        ];
    }
}
