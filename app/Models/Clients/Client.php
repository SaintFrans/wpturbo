<?php

namespace App\Models\Clients;

use App\Concerns\GeneratesPublicId;
use App\Models\Organizations\Organization;
use Database\Factories\Clients\ClientFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * A customer of the organization, used to group the sites worked on for them (ADR-017).
 *
 * Not a tenancy boundary and not a login: a client has no membership, no role and no account.
 * It is a label owned by exactly one organization (ADR-019), visible to every member of it
 * (ADR-037).
 *
 * @property int $id
 * @property int $organization_id
 * @property string $public_id
 * @property string $name
 * @property string|null $contact_name
 * @property string|null $contact_email
 * @property string|null $contact_phone
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Organization $organization
 */
#[Fillable(['name', 'contact_name', 'contact_email', 'contact_phone'])]
class Client extends Model
{
    /** @use HasFactory<ClientFactory> */
    use GeneratesPublicId, HasFactory, SoftDeletes;

    /**
     * Bootstrap the model and its traits.
     *
     * The public id is assigned once, on create, and has no `updating` counterpart: renaming a
     * client must never change its URL (ADR-030's rule, ADR-038's key).
     */
    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Client $client) {
            if (empty($client->public_id)) {
                $client->public_id = static::generatePublicId();
            }
        });
    }

    /**
     * Get the organization that owns this client.
     *
     * @return BelongsTo<Organization, $this>
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Get the route key for the model.
     */
    public function getRouteKeyName(): string
    {
        return 'public_id';
    }
}
