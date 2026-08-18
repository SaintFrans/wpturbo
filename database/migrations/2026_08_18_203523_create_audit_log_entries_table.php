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
        Schema::create('audit_log_entries', function (Blueprint $table) {
            $table->id();

            // No foreign key constraint on purpose (ADR-032, ADR-036): these rows must outlive
            // the organization's eventual hard purge, and the target named below is frequently
            // already force-deleted by the very action being recorded — an invitation row is
            // gone the instant it is cancelled. A constrained key would either block those
            // deletes or force a cascade that erases the very history being kept.
            $table->unsignedBigInteger('organization_id')->index();

            // Actor may be null: operator actions (ADR-029) and, later, the agent are not users.
            // nullOnDelete rather than cascade, so deleting a user's own account (settings/profile)
            // does not erase the record of what they did while they had one.
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('action');

            // What the action was done to. No FK for the same reason as organization_id above;
            // target_label is a snapshot taken at write time so the entry stays meaningful once
            // the target itself is gone.
            $table->string('target_type')->nullable();
            $table->unsignedBigInteger('target_id')->nullable();
            $table->string('target_label')->nullable();

            // Small structured, non-sensitive detail (e.g. a role transition). Never a payload:
            // credentials, tokens and invitation codes never reach this table (ADR-032).
            $table->json('context')->nullable();

            $table->string('ip_address', 45)->nullable();

            // Append-only: there is no updated_at, and nothing in the application ever updates
            // a row. See the AuditLogEntry model for why that stays a convention, not a guarantee.
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_log_entries');
    }
};
