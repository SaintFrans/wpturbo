<?php

namespace App\Concerns;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletingScope;

/**
 * Gives a tenant-owned resource a short, non-sequential route key (ADR-038).
 *
 * The counterpart to `GeneratesHandle`, for resources whose identifier does not need to be
 * readable. Two rules carry over from that trait, because both exist for reasons that apply
 * here too:
 *
 * - **Seeded on `creating` only.** Nothing regenerates an id, so a rename never changes a URL.
 * - **Checked against soft-deleted rows.** A trashed client still owns its id until it is
 *   force-deleted, so reissuing one would let a stale link resolve to a different record.
 *
 * What it deliberately does *not* carry over is the history table. `organization_handles` exists
 * because an organization handle is the tenant segment of the URL, so reissuing one would point
 * stale links at another tenant's data. A client id sits *inside* `/org/{organization}/`, so the
 * worst a reissued one can do is resolve to a different client of the same organization. That is
 * not a cross-tenant leak, and does not earn a table.
 *
 * The alphabet omits I, L, O, U, 0 and 1: ids get read aloud and typed by hand, and the
 * ambiguous glyphs buy nothing.
 *
 * @mixin Model
 */
trait GeneratesPublicId
{
    /**
     * The characters a public id is built from.
     */
    protected const PUBLIC_ID_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

    /**
     * The length of a generated public id.
     */
    protected const PUBLIC_ID_LENGTH = 5;

    /**
     * Generate a public id that is not already taken.
     */
    protected static function generatePublicId(): string
    {
        do {
            $publicId = static::randomPublicId();
        } while (static::publicIdIsTaken($publicId));

        return $publicId;
    }

    /**
     * Determine whether a public id is already in use, soft-deleted rows included.
     */
    public static function publicIdIsTaken(string $publicId): bool
    {
        return static::query()
            ->withoutGlobalScope(SoftDeletingScope::class)
            ->where('public_id', $publicId)
            ->exists();
    }

    /**
     * Build one candidate id.
     *
     * `random_int` rather than `Str::random` or `mt_rand`: this is an identifier that appears in
     * URLs, and a cryptographic source costs nothing here.
     */
    protected static function randomPublicId(): string
    {
        $alphabet = static::PUBLIC_ID_ALPHABET;
        $lastIndex = strlen($alphabet) - 1;

        $publicId = '';

        for ($position = 0; $position < static::PUBLIC_ID_LENGTH; $position++) {
            $publicId .= $alphabet[random_int(0, $lastIndex)];
        }

        return $publicId;
    }
}
