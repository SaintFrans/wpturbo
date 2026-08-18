<?php

namespace App\Http\Controllers;

use App\Models\Organizations\OrganizationInvitation;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $email = strtolower($request->user()->email);

        $pendingInvitations = OrganizationInvitation::query()
            ->with(['inviter', 'organization'])
            ->whereRaw('LOWER(email) = ?', [$email])
            ->whereNull('accepted_at')
            ->where(fn ($query) => $query
                ->whereNull('expires_at')
                ->orWhere('expires_at', '>=', now()))
            ->latest()
            ->get()
            ->map(fn (OrganizationInvitation $invitation) => [
                'id' => $invitation->id,
                'inviterName' => $invitation->inviter->name,
                'organization' => [
                    'name' => $invitation->organization->name,
                    'publicId' => $invitation->organization->handle,
                ],
            ]);

        return Inertia::render('dashboard', [
            'pendingInvitations' => $pendingInvitations,
        ]);
    }
}
