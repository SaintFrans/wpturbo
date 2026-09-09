import { usePage } from '@inertiajs/react';
import { ArrowDown, ArrowUp, CornerDownLeft, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandFooter,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandPanel,
    CommandSeparator,
} from '@/components/ui/command';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { toUrl } from '@/lib/utils';
import { dashboard } from '@/routes';
import { index as clients } from '@/routes/clients';
import { edit as organizationSettings } from '@/routes/organizations';
import { index as auditLog } from '@/routes/organizations/audit-log';
import { index as members } from '@/routes/organizations/members';
import { edit as profile } from '@/routes/profile';
import { edit as security } from '@/routes/security';
import type { NavItem } from '@/types';

/**
 * The menu bar's search: a control shaped like an input that opens the command palette, on
 * press or on ⌘K.
 *
 * It searches destinations, not records. Servers and sites do not exist yet, and a search box
 * that quietly covers only navigation is more honest than one that appears to search data it
 * cannot reach. Extend the groups below as resource domains are built.
 */
export function AppSearch() {
    const { currentOrganization } = usePage().props;
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'k' || !(event.metaKey || event.ctrlKey)) {
                return;
            }

            event.preventDefault();
            setIsOpen((open) => !open);
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    const handle = currentOrganization?.handle;

    const organizationItems: NavItem[] = handle
        ? [
              { title: 'Overview', href: dashboard(handle) },
              { title: 'Clients', href: clients(handle) },
              { title: 'Settings', href: organizationSettings(handle) },
              { title: 'Members', href: members(handle) },
              { title: 'Audit log', href: auditLog(handle) },
          ]
        : [];

    const accountItems: NavItem[] = [
        { title: 'Profile', href: profile() },
        { title: 'Security', href: security() },
    ];

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onPress={() => setIsOpen(true)}
                aria-label="Search"
                className="w-8 justify-center px-0 text-muted-foreground sm:w-56 sm:justify-start sm:px-2.5"
            >
                <Search className="size-4" />
                <span className="hidden sm:inline">Search</span>
                <kbd className="ml-auto hidden rounded border bg-muted px-1.5 font-sans text-xs text-muted-foreground sm:inline">
                    ⌘K
                </kbd>
            </Button>

            <CommandDialog
                open={isOpen}
                onOpenChange={setIsOpen}
                title="Search"
                description="Jump to a page."
            >
                <Command>
                    <CommandInput placeholder="Jump to a page…" />

                    <CommandPanel>
                        <CommandList
                            // A selected item navigates, so the palette closes on action.
                            onAction={() => setIsOpen(false)}
                            renderEmptyState={() => (
                                <CommandEmpty>Nothing found.</CommandEmpty>
                            )}
                        >
                            {organizationItems.length > 0 && (
                                <CommandGroup
                                    heading={
                                        currentOrganization?.name ?? 'Areas'
                                    }
                                >
                                    {organizationItems.map((item) => (
                                        <CommandItem
                                            key={item.title}
                                            href={toUrl(item.href)}
                                            textValue={item.title}
                                        >
                                            <span className="flex-1">
                                                {item.title}
                                            </span>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}

                            <CommandSeparator />

                            <CommandGroup heading="Account">
                                {accountItems.map((item) => (
                                    <CommandItem
                                        key={item.title}
                                        href={toUrl(item.href)}
                                        textValue={item.title}
                                    >
                                        <span className="flex-1">
                                            {item.title}
                                        </span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </CommandPanel>

                    <CommandFooter>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <KbdGroup>
                                    <Kbd>
                                        <ArrowUp />
                                    </Kbd>
                                    <Kbd>
                                        <ArrowDown />
                                    </Kbd>
                                </KbdGroup>
                                <span>Navigate</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Kbd>
                                    <CornerDownLeft />
                                </Kbd>
                                <span>Open</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Kbd>Esc</Kbd>
                            <span>Close</span>
                        </div>
                    </CommandFooter>
                </Command>
            </CommandDialog>
        </>
    );
}
