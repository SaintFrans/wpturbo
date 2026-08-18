<?php

namespace App\Http\Controllers\Organizations;

use App\Http\Controllers\Controller;
use App\Models\Audit\AuditLogEntry;
use App\Models\Organizations\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    /**
     * Show the organization's audit log.
     *
     * Owner and Admin only (ADR-032) — the policy is the control; there is no need to also hide
     * this route's entry point in the nav, since a Member who navigates here directly still gets
     * the 403.
     */
    public function index(Request $request, Organization $organization): Response
    {
        Gate::authorize('viewAuditLog', $organization);

        return Inertia::render('organizations/settings/audit-log', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'handle' => $organization->handle,
            ],
            'entries' => $organization->auditLogEntries()
                ->with('actor')
                ->latest('created_at')
                ->limit(100)
                ->get()
                ->map(fn (AuditLogEntry $entry) => [
                    'id' => $entry->id,
                    'actorName' => $entry->actor?->name,
                    'action' => $entry->action->value,
                    'actionLabel' => $entry->action->label(),
                    'targetLabel' => $entry->target_label,
                    'createdAt' => $entry->created_at->toISOString(),
                ]),
            'permissions' => $request->user()->toOrganizationPermissions($organization),
        ]);
    }
}
