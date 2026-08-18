<?php

namespace App\Notifications\Organizations;

use App\Models\Organizations\OrganizationInvitation as OrganizationInvitationModel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrganizationInvitation extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     *
     * The plaintext code is passed separately from the invitation model: only its hash is
     * ever persisted (ADR-033), and this notification is queued, so the code must survive
     * serialisation as a plain string rather than as an attribute that a refetched model
     * would no longer carry.
     */
    public function __construct(public OrganizationInvitationModel $invitation, public string $plainCode)
    {
        //
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $organization = $this->invitation->organization;
        $inviter = $this->invitation->inviter;

        return (new MailMessage)
            ->subject(__("You've been invited to join :organizationName", ['organizationName' => $organization->name]))
            ->line(__(':inviterName has invited you to join the :organizationName organization.', [
                'inviterName' => $inviter->name,
                'organizationName' => $organization->name,
            ]))
            ->line(__('Log in and visit your dashboard to accept or decline this invitation.'))
            ->action(
                __('Log in'),
                route('login', ['invitation' => $this->plainCode]),
            );
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'invitation_id' => $this->invitation->id,
            'organization_id' => $this->invitation->organization_id,
            'organization_name' => $this->invitation->organization->name,
            'role' => $this->invitation->role->value,
        ];
    }
}
