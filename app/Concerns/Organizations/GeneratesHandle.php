<?php

namespace App\Concerns\Organizations;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Seeds and protects the handle that appears in tenant URLs (ADR-030).
 *
 * The handle is derived from the name **once, at creation**, and then leads its own life. There
 * is deliberately no regeneration on rename: coupling the two is what silently invalidated every
 * bookmark, shared link and mail archive whenever someone renamed their organization. Changing a
 * handle is a separate, explicit action.
 *
 * A handle is never reissued. Uniqueness is checked against soft-deleted rows (ADR-006) and
 * against `organization_handles`, which records every handle the tenant has ever held — so
 * releasing a handle by changing it does not let another tenant inherit its old links.
 *
 * Reused by every tenant resource that needs a readable route key.
 *
 * @mixin Model
 */
trait GeneratesHandle
{
    /**
     * Derive an available handle from a display name, suffixing on collision.
     */
    protected static function generateHandle(string $name): string
    {
        $base = Str::slug($name);

        if ($base === '') {
            $base = 'organization';
        }

        $handle = $base;
        $suffix = 1;

        while (static::handleIsUnavailable($handle)) {
            $suffix++;
            $handle = $base.'-'.$suffix;
        }

        return $handle;
    }

    /**
     * Determine whether a handle is unavailable, for any reason, to anyone but $ignoreId.
     *
     * Checks both the live column and the historical record, because a handle that was once in
     * use stays retired even after the tenant moved off it. Public because the validation rule
     * asks the same question the generator does — there must not be two answers.
     */
    public static function handleIsUnavailable(string $handle, ?int $ignoreId = null): bool
    {
        $inUse = static::query()
            ->withoutGlobalScope(SoftDeletingScope::class)
            ->where('handle', $handle)
            ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists();

        if ($inUse) {
            return true;
        }

        return DB::table('organization_handles')
            ->where('handle', $handle)
            ->when($ignoreId, fn ($query) => $query->where('organization_id', '!=', $ignoreId))
            ->exists();
    }

    /**
     * Record the current handle as permanently claimed by this organization.
     */
    protected function rememberHandle(): void
    {
        DB::table('organization_handles')->insertOrIgnore([
            'handle' => $this->handle,
            'organization_id' => $this->getKey(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
