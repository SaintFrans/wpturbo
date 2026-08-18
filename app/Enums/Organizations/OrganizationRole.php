<?php

namespace App\Enums\Organizations;

enum OrganizationRole: string
{
    case Owner = 'owner';
    case Admin = 'admin';
    case Member = 'member';

    /**
     * Get the display label for the role.
     */
    public function label(): string
    {
        return ucfirst($this->value);
    }

    /**
     * Get all the permissions for this role.
     *
     * @return array<OrganizationPermission>
     */
    public function permissions(): array
    {
        return match ($this) {
            self::Owner => OrganizationPermission::cases(),
            self::Admin => [
                OrganizationPermission::UpdateOrganization,
                OrganizationPermission::AddMember,
                OrganizationPermission::UpdateMember,
                OrganizationPermission::RemoveMember,
                OrganizationPermission::CreateInvitation,
                OrganizationPermission::CancelInvitation,
                OrganizationPermission::ViewAuditLog,
            ],
            self::Member => [],
        };
    }

    /**
     * Determine if the role has the given permission.
     */
    public function hasPermission(OrganizationPermission $permission): bool
    {
        return in_array($permission, $this->permissions());
    }

    /**
     * Get the hierarchy level for this role.
     * Higher numbers indicate higher privileges.
     */
    public function level(): int
    {
        return match ($this) {
            self::Owner => 3,
            self::Admin => 2,
            self::Member => 1,
        };
    }

    /**
     * Check if this role is at least as privileged as another role.
     */
    public function isAtLeast(OrganizationRole $role): bool
    {
        return $this->level() >= $role->level();
    }

    /**
     * Determine whether this role outranks another.
     *
     * The single comparison ADR-028 rests on: an actor may only affect roles ranking strictly
     * below their own, which blocks self-promotion, removing the Owner and minting a peer Admin
     * without needing a special case for each.
     */
    public function outranks(self $role): bool
    {
        return $this->level() > $role->level();
    }

    /**
     * Roles the given actor may assign, as option arrays for the frontend.
     *
     * Replaces the old `assignable()`, which excluded Owner as a special case. Owner is still
     * excluded — a role does not outrank itself — so ADR-020's transfer flow remains the only
     * route to ownership, now by construction rather than by exception.
     *
     * @return array<array{value: string, label: string}>
     */
    public static function assignableBy(self $actor): array
    {
        return collect(self::cases())
            ->filter(fn (self $role) => $actor->outranks($role))
            ->map(fn (self $role) => ['value' => $role->value, 'label' => $role->label()])
            ->values()
            ->toArray();
    }
}
