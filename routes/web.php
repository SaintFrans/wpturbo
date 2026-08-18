<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Organizations\AuditLogController;
use App\Http\Controllers\Organizations\OrganizationController;
use App\Http\Controllers\Organizations\OrganizationInvitationController;
use App\Http\Controllers\Organizations\OrganizationMemberController;
use App\Http\Middleware\EnsureOrganizationMembership;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth'])->group(function () {
    /*
     * Reached by someone who is not a member yet, so these cannot carry an organization prefix.
     * Bound by id, not the invitation's secret code — the authenticated user's email match
     * (ValidOrganizationInvitation, ADR-009) is what authorises accept/decline, the same as
     * it always has been. The code's secrecy protects the *emailed link* (ADR-033); it was
     * never what gated these two actions.
     */
    Route::get('invitations/{invitation:id}/accept', [OrganizationInvitationController::class, 'accept'])->name('invitations.accept');
    Route::delete('invitations/{invitation:id}', [OrganizationInvitationController::class, 'decline'])->name('invitations.decline');
});

/*
 * Listing and creating organizations belongs to no single tenant, so it sits beside the prefix
 * rather than inside it (ADR-025).
 */
Route::middleware(['auth', 'verified'])->prefix('org')->name('organizations.')->group(function () {
    Route::get('/', [OrganizationController::class, 'index'])->name('index');
    Route::post('/', [OrganizationController::class, 'store'])->name('store');
});

/*
 * Everything belonging to one organization — its resources and its administration alike — lives
 * under /org/{organization}/… (ADR-025, ADR-031). The literal `org` segment is what keeps the
 * handle namespace free: a handle can never shadow an application route, so no reserved-word
 * list is needed to protect routing.
 */
Route::prefix('org/{organization}')
    ->middleware(['auth', 'verified', EnsureOrganizationMembership::class])
    ->group(function () {
        Route::get('dashboard', DashboardController::class)->name('dashboard');

        Route::name('organizations.')->group(function () {
            Route::post('switch', [OrganizationController::class, 'switch'])->name('switch');

            Route::get('settings', [OrganizationController::class, 'edit'])->name('edit');
            Route::patch('settings', [OrganizationController::class, 'update'])->name('update');
            Route::delete('settings', [OrganizationController::class, 'destroy'])->name('destroy');
            Route::delete('settings/leave', [OrganizationController::class, 'leave'])->name('leave');

            Route::get('settings/members', [OrganizationMemberController::class, 'index'])->name('members.index');
            Route::patch('settings/members/{user}', [OrganizationMemberController::class, 'update'])->name('members.update');
            Route::delete('settings/members/{user}', [OrganizationMemberController::class, 'destroy'])->name('members.destroy');

            Route::get('settings/audit-log', [AuditLogController::class, 'index'])->name('audit-log.index');

            Route::post('settings/invitations', [OrganizationInvitationController::class, 'store'])
                ->middleware('throttle:invitations')
                ->name('invitations.store');
            Route::delete('settings/invitations/{invitation:id}', [OrganizationInvitationController::class, 'destroy'])->name('invitations.destroy');
        });
    });

require __DIR__.'/settings.php';
