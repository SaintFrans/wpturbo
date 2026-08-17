import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Check, ChevronsUpDown, Plus, Users } from 'lucide-react';
import CreateOrganizationModal from '@/components/create-organization-modal';
import { Button, LinkButton } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { toUrl } from '@/lib/utils';
import { dashboard } from '@/routes';
import { switchMethod } from '@/routes/organizations';
import type { Organization } from '@/types';

type OrganizationSwitcherProps = {
    inHeader?: boolean;
};

export function OrganizationSwitcher({
    inHeader = false,
}: OrganizationSwitcherProps) {
    const page = usePage();
    const isMobile = useIsMobile();
    const [createOrganizationOpen, setCreateOrganizationOpen] = useState(false);
    const currentOrganization = page.props.currentOrganization;
    const organizations = page.props.organizations ?? [];
    const dashboardUrl = currentOrganization
        ? dashboard(currentOrganization.publicId)
        : '/';

    const switchOrganization = (organization: Organization) => {
        const previousOrganizationSlug = currentOrganization?.publicId;

        router.visit(switchMethod(organization.publicId), {
            onFinish: () => {
                if (
                    !previousOrganizationSlug ||
                    typeof window === 'undefined'
                ) {
                    router.reload();

                    return;
                }

                const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
                const segment = `/${previousOrganizationSlug}`;

                if (currentUrl.includes(segment)) {
                    router.visit(
                        currentUrl.replace(
                            segment,
                            `/${organization.publicId}`,
                        ),
                        {
                            replace: true,
                        },
                    );

                    return;
                }

                router.reload();
            },
        });
    };

    return (
        <>
            {/* Two controls, not one: the name navigates to the organization's dashboard, the
                chevron opens the switcher. Splitting them means the common action — going
                home — does not require opening a menu first. */}
            <div
                className={
                    inHeader
                        ? 'flex min-w-0 items-center gap-0.5'
                        : 'flex w-full items-center gap-0.5'
                }
            >
                <LinkButton
                    href={toUrl(dashboardUrl)}
                    variant="ghost"
                    data-test="organization-switcher-name"
                    className={
                        inHeader
                            ? 'h-8 min-w-0 gap-2 px-2 font-medium'
                            : 'h-8 min-w-0 flex-1 justify-start gap-2 px-2 font-semibold'
                    }
                >
                    <Users
                        className={
                            inHeader
                                ? 'hidden'
                                : 'hidden size-4 shrink-0 group-data-[collapsible=icon]:block'
                        }
                    />
                    <span
                        className={
                            inHeader
                                ? 'max-w-40 truncate xl:max-w-60'
                                : 'truncate group-data-[collapsible=icon]:hidden'
                        }
                    >
                        {currentOrganization?.name ?? 'Select organization'}
                    </span>
                </LinkButton>

                <DropdownMenuTrigger>
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        data-test="organization-switcher-trigger"
                        aria-label="Switch organization"
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                        <ChevronsUpDown className="size-4" />
                    </Button>
                    <DropdownMenu
                        className={inHeader ? 'w-56' : 'min-w-56 rounded-lg'}
                        // Left edge of the menu lines up with the chevron that opened it.
                        placement={
                            !inHeader && !isMobile ? 'right' : 'bottom start'
                        }
                    >
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Organizations
                        </DropdownMenuLabel>
                        {organizations.map((organization) => (
                            <DropdownMenuItem
                                key={organization.id}
                                data-test="organization-switcher-item"
                                className={
                                    inHeader
                                        ? 'cursor-pointer gap-2'
                                        : 'cursor-pointer gap-2 p-2'
                                }
                                onAction={() =>
                                    switchOrganization(organization)
                                }
                            >
                                {organization.name}
                                {currentOrganization?.id ===
                                    organization.id && (
                                    <Check
                                        className={
                                            inHeader
                                                ? 'ml-auto size-4'
                                                : 'ml-auto h-4 w-4'
                                        }
                                    />
                                )}
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            data-test="organization-switcher-new-organization"
                            className={
                                inHeader
                                    ? 'cursor-pointer gap-2'
                                    : 'cursor-pointer gap-2 p-2'
                            }
                            onAction={() => setCreateOrganizationOpen(true)}
                        >
                            <Plus className={inHeader ? 'size-4' : 'h-4 w-4'} />
                            <span className="text-muted-foreground">
                                New organization
                            </span>
                        </DropdownMenuItem>
                    </DropdownMenu>
                </DropdownMenuTrigger>
            </div>

            {/* Driven by state: the menu closes on action, then the dialog opens. */}
            <CreateOrganizationModal
                isOpen={createOrganizationOpen}
                onOpenChange={setCreateOrganizationOpen}
            />
        </>
    );
}
