<?php

namespace App\Actions\Organizations;

use App\Models\Organizations\Organization;
use App\Models\User;

/**
 * Guarantees the invariant that every user always has at least one organization (ADR-025).
 *
 * This is the involuntary half of that guarantee. A user cannot *choose* to leave or delete their
 * last organization — the policy blocks that — but an owner can remove them, and an organization
 * can be deleted out from under them. Neither can reasonably be forbidden, so the invariant is
 * restored afterwards instead.
 *
 * The organization created here is owned by the user it is created for. It never grants access to
 * anything that already existed.
 */
class EnsureUserHasOrganization
{
    public function __construct(private CreateOrganization $createOrganization) {}

    /**
     * Return an organization the user belongs to, creating one if none is left.
     */
    public function handle(User $user, ?Organization $excluding = null): Organization
    {
        return $user->fallbackOrganization($excluding)
            ?? $this->createOrganization->handle($user, $user->name);
    }
}
