<?php

namespace App\Http\Controllers\Clients;

use App\Actions\Audit\RecordAuditEntry;
use App\Enums\Audit\AuditAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Clients\SaveClientRequest;
use App\Models\Clients\Client;
use App\Models\Organizations\Organization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ClientController extends Controller
{
    /**
     * List the organization's clients.
     *
     * Read through the relationship, never `Client::query()` — a missed membership then yields
     * nothing rather than another tenant's rows (SECURITY.md §5 rule 1).
     */
    public function index(Request $request, Organization $organization): Response
    {
        Gate::authorize('viewAny', [Client::class, $organization]);

        return Inertia::render('clients/index', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'handle' => $organization->handle,
            ],
            'clients' => $organization->clients()
                ->orderByRaw('LOWER(name)')
                ->get()
                ->map(fn (Client $client) => [
                    'id' => $client->public_id,
                    'name' => $client->name,
                    'contactEmail' => $client->contact_email,
                    'contactPhone' => $client->contact_phone,
                    'createdAt' => $client->created_at?->toIso8601String(),
                ])
                ->values()
                ->all(),
            'permissions' => $request->user()->toOrganizationPermissions($organization),
        ]);
    }

    /**
     * Store a newly created client.
     */
    public function store(SaveClientRequest $request, Organization $organization, RecordAuditEntry $recordAuditEntry): RedirectResponse
    {
        $client = $organization->clients()->create($request->validated());

        $recordAuditEntry->handle(
            organization: $organization,
            actor: $request->user(),
            action: AuditAction::ClientCreated,
            targetLabel: $client->name,
            targetType: 'client',
            targetId: $client->id,
            ipAddress: $request->ip(),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Client created.')]);

        return to_route('clients.index', ['organization' => $organization->handle]);
    }

    /**
     * Update the specified client.
     */
    public function update(SaveClientRequest $request, Organization $organization, Client $client, RecordAuditEntry $recordAuditEntry): RedirectResponse
    {
        $client->update($request->validated());

        $recordAuditEntry->handle(
            organization: $organization,
            actor: $request->user(),
            action: AuditAction::ClientUpdated,
            targetLabel: $client->name,
            targetType: 'client',
            targetId: $client->id,
            ipAddress: $request->ip(),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Client updated.')]);

        return to_route('clients.index', ['organization' => $organization->handle]);
    }

    /**
     * Delete the specified client.
     *
     * Deleting one client is an individual, explicit act, so the row goes for good (ADR-019).
     * The soft delete on the table is there for the organization's own deletion, which takes the
     * whole tree down together so a restore is coherent.
     */
    public function destroy(Request $request, Organization $organization, Client $client, RecordAuditEntry $recordAuditEntry): RedirectResponse
    {
        Gate::authorize('delete', $client);

        $name = $client->name;
        $id = $client->id;

        $client->forceDelete();

        $recordAuditEntry->handle(
            organization: $organization,
            actor: $request->user(),
            action: AuditAction::ClientDeleted,
            targetLabel: $name,
            targetType: 'client',
            targetId: $id,
            ipAddress: $request->ip(),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Client deleted.')]);

        return to_route('clients.index', ['organization' => $organization->handle]);
    }
}
