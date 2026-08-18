<?php

use App\Models\Organizations\OrganizationInvitation;
use Illuminate\Support\Facades\Schedule;

Schedule::call(function () {
    OrganizationInvitation::query()
        ->whereNotNull('expires_at')
        ->where('expires_at', '<', now())
        ->forceDelete();
})->daily()->description('Delete expired organization invitations');
