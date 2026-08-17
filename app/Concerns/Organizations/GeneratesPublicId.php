<?php

namespace App\Concerns\Organizations;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletingScope;

/**
 * Generates the opaque, immutable identifier that appears in tenant URLs (ADR-027).
 *
 * The value is random rather than derived from the model's name, so renaming can never
 * invalidate an existing link, two records may share a name, and the customer's name never
 * appears in a URL. Uniqueness is checked against soft-deleted rows as well, so a retired
 * identifier is never reissued (ADR-006) — a stale bookmark can never resolve to a different
 * tenant.
 *
 * Reused by every tenant resource that needs a route key: Site, Server, Client.
 *
 * @mixin Model
 */
trait GeneratesPublicId
{
    /**
     * Characters that survive being read aloud, handwritten or pasted into a support ticket.
     * Excludes 0/o and 1/l/i.
     */
    protected const PUBLIC_ID_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';

    protected const PUBLIC_ID_LENGTH = 12;

    /**
     * Generate an identifier that no record — including a soft-deleted one — already holds.
     */
    protected static function generatePublicId(): string
    {
        do {
            $publicId = static::randomPublicId();
        } while (static::publicIdExists($publicId));

        return $publicId;
    }

    /**
     * Build a single candidate identifier.
     *
     * `random_int` rather than `rand`: the identifier is not a secret, but it is the only thing
     * distinguishing one tenant's URLs from another's, and a predictable sequence would put the
     * enumeration surface ADR-027 removes straight back.
     */
    protected static function randomPublicId(): string
    {
        $alphabet = static::PUBLIC_ID_ALPHABET;
        $lastIndex = \strlen($alphabet) - 1;

        return collect(range(1, static::PUBLIC_ID_LENGTH))
            ->map(fn(): string => $alphabet[\random_int(0, $lastIndex)])
            ->implode('');
    }

    /**
     * Determine whether the identifier is already taken, soft-deleted rows included.
     *
     * Dropping the soft-delete scope is what implements ADR-006 here. On a model without
     * `SoftDeletes` the scope was never registered and this is a no-op, so the trait stays
     * reusable by tenant resources that hard-delete.
     */
    protected static function publicIdExists(string $publicId): bool
    {
        return static::query()
            ->withoutGlobalScope(SoftDeletingScope::class)
            ->where('public_id', $publicId)
            ->exists();
    }
}
