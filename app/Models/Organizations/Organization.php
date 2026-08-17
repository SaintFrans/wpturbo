<?php

namespace App\Models\Organizations;

use App\Concerns\Organizations\GeneratesHandle;
use App\Enums\Organizations\OrganizationRole;
use App\Models\User;
use Database\Factories\Organizations\OrganizationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $handle
 * @property bool $is_personal
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Collection<int, OrganizationInvitation> $invitations
 * @property-read Collection<int, Membership> $memberships
 * @property-read Collection<int, User> $members
 */
#[Fillable(['name', 'handle', 'is_personal'])]
class Organization extends Model
{
    /** @use HasFactory<OrganizationFactory> */
    use GeneratesHandle, HasFactory, SoftDeletes;

    /**
     * Bootstrap the model and its traits.
     *
     * The handle is seeded from the name once, on create, and deliberately has no `updating`
     * counterpart keyed on the name: renaming must never change the URL (ADR-030). Changing the
     * handle itself is an explicit, separately validated action.
     *
     * Every handle is recorded on save so it stays retired for good, even after this
     * organization moves off it.
     */
    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Organization $organization) {
            if (empty($organization->handle)) {
                $organization->handle = static::generateHandle($organization->name);
            }
        });

        static::saved(function (Organization $organization) {
            $organization->rememberHandle();
        });
    }

    /**
     * Get the organization owner.
     */
    public function owner(): ?Model
    {
        return $this->members()
            ->wherePivot('role', OrganizationRole::Owner->value)
            ->first();
    }

    /**
     * Get all members of this organization.
     *
     * @return BelongsToMany<User, $this, Membership, 'pivot'>
     */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'organization_members', 'organization_id', 'user_id')
            ->using(Membership::class)
            ->withPivot(['role'])
            ->withTimestamps();
    }

    /**
     * Get all memberships for this organization.
     *
     * @return HasMany<Membership, $this>
     */
    public function memberships(): HasMany
    {
        return $this->hasMany(Membership::class);
    }

    /**
     * Get all invitations for this organization.
     *
     * @return HasMany<OrganizationInvitation, $this>
     */
    public function invitations(): HasMany
    {
        return $this->hasMany(OrganizationInvitation::class);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_personal' => 'boolean',
        ];
    }

    /**
     * Get the route key for the model.
     */
    public function getRouteKeyName(): string
    {
        return 'handle';
    }
}
