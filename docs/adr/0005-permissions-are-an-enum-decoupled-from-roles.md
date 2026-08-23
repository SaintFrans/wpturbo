# ADR-005 — Permissions are an enum, decoupled from roles

**Reconstructed** · **Status**: Accepted, **amended by [ADR-028](0028-admins-manage-members-below-their-own-role.md)**

> The mechanism is unchanged — authorisation still asks for a permission, never a role name.
> The map changes: Admin gains `member:add`, `member:update` and `member:remove`, bounded to
> roles ranking below their own. `TeamRole::assignable()` still excludes Owner, so ADR-020's
> transfer flow remains the only route to ownership. See ADR-028 for the revised table.

**Decision** — `TeamPermission` enumerates capabilities; `TeamRole::permissions()` maps each
role to a set of them. All authorisation asks for a permission, never for a role name.
`TeamRole::assignable()` excludes Owner.

**Alternatives** — Compare role strings at each call site; adopt a package such as
spatie/laravel-permission.

**Why** — Role-string comparisons scatter the permission model across the codebase, so
adding a role or moving a capability becomes a search-and-replace with no compiler help and
no single place to review. Asking for permissions keeps the model in one file that can be
read as a specification. A full permission package is more machinery than a fixed
three-role model needs, and would put the rules in the database where they cannot be
reviewed in a diff.

**Consequences** — New capabilities are added as enum cases and mapped per role. Excluding
Owner from `assignable()` means ownership transfer needs its own deliberate flow — it
cannot happen through the member-role UI.
