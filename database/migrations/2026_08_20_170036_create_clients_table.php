<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();

            /*
             * The route key (ADR-038). Five random characters, not the row id: a sequential key
             * in the URL publishes how many clients exist across every tenant. It is an
             * identifier and never an authorisation factor — reads go through the organization
             * relationship, so guessing one buys nothing.
             *
             * Unique globally rather than per organization. Scoped uniqueness would be correct
             * too, but one index that cannot be got wrong is worth more than the handful of
             * collisions it costs.
             */
            $table->char('public_id', 5)->unique();

            $table->string('name');
            $table->string('contact_name')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();
            $table->timestamps();

            // Soft-deleted so an organization's whole tree restores coherently (ADR-019,
            // ADR-034). Deleting one client on its own is an explicit force delete.
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
