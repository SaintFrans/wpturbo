<?php

namespace App\Models\Organizations;

use App\Enums\Organizations\OrganizationRole;
use App\Models\User;
use Database\Factories\Organizations\OrganizationInvitationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $code_hash
 * @property int $organization_id
 * @property string $email
 * @property OrganizationRole $role
 * @property int $invited_by
 * @property Carbon|null $expires_at
 * @property Carbon|null $accepted_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Organization $organization
 * @property-read User $inviter
 */
#[Fillable(['organization_id', 'email', 'role', 'invited_by', 'expires_at', 'accepted_at'])]
class OrganizationInvitation extends Model
{
    /** @use HasFactory<OrganizationInvitationFactory> */
    use HasFactory, SoftDeletes;

    /**
     * The random plaintext code, available only in memory on the instance that just created
     * it. Never persisted — only its SHA-256 digest is (ADR-033) — and lost the moment this
     * model is refetched or a queued job holding it gets deserialized.
     */
    public ?string $plainCode = null;

    /**
     * Bootstrap the model and its traits.
     */
    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (OrganizationInvitation $invitation) {
            $invitation->plainCode ??= Str::random(64);
            $invitation->code_hash = hash('sha256', $invitation->plainCode);
        });
    }

    /**
     * Get the organization that the invitation belongs to.
     *
     * @return BelongsTo<Organization, $this>
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Get the user who sent the invitation.
     *
     * @return BelongsTo<User, $this>
     */
    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    /**
     * Determine if the invitation has been accepted.
     */
    public function isAccepted(): bool
    {
        return $this->accepted_at !== null;
    }

    /**
     * Determine if the invitation is pending.
     */
    public function isPending(): bool
    {
        return $this->accepted_at === null && ! $this->isExpired();
    }

    /**
     * Determine if the invitation has expired.
     */
    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'role' => OrganizationRole::class,
            'expires_at' => 'datetime',
            'accepted_at' => 'datetime',
        ];
    }

    // No custom route key: every route binds by `id`. The one genuinely secret lookup — the
    // link emailed to the invitee — is resolved by hashing the incoming code by hand in
    // FortifyServiceProvider, not through route-model binding.
}
