import { Head } from '@inertiajs/react';
import { Building2, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import DeleteClientModal from '@/components/delete-client-modal';
import { EmptyState } from '@/components/empty-state';
import SaveClientModal from '@/components/save-client-modal';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Frame,
    FrameDescription,
    FrameHeader,
    FramePanel,
    FrameTitle,
} from '@/components/ui/frame';
import { index as clientsIndex } from '@/routes/clients';
import type { Client, Organization, OrganizationPermissions } from '@/types';

type Props = {
    organization: Organization;
    clients: Client[];
    permissions: OrganizationPermissions;
};

export default function ClientsIndex({
    organization,
    clients,
    permissions,
}: Props) {
    const [saveOpen, setSaveOpen] = useState(false);
    const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

    const addClient = () => {
        setClientToEdit(null);
        setSaveOpen(true);
    };

    const editClient = (client: Client) => {
        setClientToEdit(client);
        setSaveOpen(true);
    };

    const confirmDeleteClient = (client: Client) => {
        setClientToDelete(client);
        setDeleteOpen(true);
    };

    const canActOnRow =
        permissions.canUpdateClient || permissions.canDeleteClient;

    return (
        <>
            <Head title="Clients" />

            <div className="mx-auto flex w-full max-w-[1092px] flex-col">
                <Frame>
                    <FrameHeader
                        action={
                            permissions.canCreateClient ? (
                                <Button
                                    size="sm"
                                    data-test="add-client-button"
                                    onPress={addClient}
                                >
                                    <Plus /> Add client
                                </Button>
                            ) : null
                        }
                    >
                        <FrameTitle>Clients</FrameTitle>
                        <FrameDescription>
                            The customers you work for. Sites and domains will
                            be grouped under them as they are built.
                        </FrameDescription>
                    </FrameHeader>

                    <FramePanel padded={clients.length === 0}>
                        {clients.length === 0 ? (
                            <EmptyState
                                title="No clients yet"
                                description="Add the customers you build and maintain sites for. A name and an email address is all it takes."
                                illustration={
                                    <Building2 className="size-10 text-muted-foreground" />
                                }
                                action={
                                    permissions.canCreateClient ? (
                                        <Button
                                            size="sm"
                                            data-test="add-first-client-button"
                                            onPress={addClient}
                                        >
                                            <Plus /> Add client
                                        </Button>
                                    ) : null
                                }
                            />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border text-left text-muted-foreground">
                                            <th className="px-4 py-2.5 font-medium">
                                                Name
                                            </th>
                                            <th className="px-4 py-2.5 font-medium">
                                                Email
                                            </th>
                                            <th className="px-4 py-2.5 font-medium">
                                                Phone
                                            </th>
                                            {canActOnRow ? (
                                                <th className="px-4 py-2.5">
                                                    <span className="sr-only">
                                                        Actions
                                                    </span>
                                                </th>
                                            ) : null}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {clients.map((client) => (
                                            <tr
                                                key={client.id}
                                                data-test="client-row"
                                            >
                                                <td className="px-4 py-3 font-medium text-foreground">
                                                    {client.name}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    <a
                                                        href={`mailto:${client.contactEmail}`}
                                                        className="hover:text-foreground hover:underline"
                                                    >
                                                        {client.contactEmail}
                                                    </a>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {client.contactPhone ?? '—'}
                                                </td>
                                                {canActOnRow ? (
                                                    <td className="px-4 py-3 text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon-sm"
                                                                    data-test="client-actions-trigger"
                                                                    aria-label={`Actions for ${client.name}`}
                                                                >
                                                                    <MoreHorizontal className="size-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenu>
                                                                {permissions.canUpdateClient ? (
                                                                    <DropdownMenuItem
                                                                        data-test="client-edit-action"
                                                                        onAction={() =>
                                                                            editClient(
                                                                                client,
                                                                            )
                                                                        }
                                                                    >
                                                                        <Pencil />
                                                                        Edit
                                                                    </DropdownMenuItem>
                                                                ) : null}
                                                                {permissions.canDeleteClient ? (
                                                                    <DropdownMenuItem
                                                                        data-test="client-delete-action"
                                                                        onAction={() =>
                                                                            confirmDeleteClient(
                                                                                client,
                                                                            )
                                                                        }
                                                                    >
                                                                        <Trash2 />
                                                                        Delete
                                                                    </DropdownMenuItem>
                                                                ) : null}
                                                            </DropdownMenu>
                                                        </DropdownMenu>
                                                    </td>
                                                ) : null}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </FramePanel>
                </Frame>
            </div>

            {permissions.canCreateClient || permissions.canUpdateClient ? (
                <SaveClientModal
                    organization={organization}
                    client={clientToEdit}
                    open={saveOpen}
                    onOpenChange={setSaveOpen}
                />
            ) : null}

            <DeleteClientModal
                organization={organization}
                client={clientToDelete}
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
            />
        </>
    );
}

ClientsIndex.layout = (props: {
    currentOrganization?: { handle: string } | null;
}) => ({
    breadcrumbs: props.currentOrganization
        ? [
              {
                  title: 'Clients',
                  href: clientsIndex(props.currentOrganization.handle),
              },
          ]
        : [],
});
