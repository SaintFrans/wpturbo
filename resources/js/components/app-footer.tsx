import { toUrl } from '@/lib/utils';
import type { NavItem } from '@/types';

const footerNavItems: NavItem[] = [
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: null,
    },
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: null,
    },
];

export function AppFooter() {
    return (
        <footer className="hidden bg-background sm:block">
            <div className="mx-auto flex max-w-[1920px] flex-col items-center justify-between gap-y-4 px-6 py-4 text-sm text-muted-foreground sm:flex-row">
                <span>wpturbo © {new Date().getFullYear()}</span>

                <div className="flex items-center gap-6">
                    {footerNavItems.map((item) => (
                        <a
                            key={item.title}
                            href={toUrl(item.href)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded transition-colors hover:text-foreground focus:outline-none focus-visible:text-foreground"
                        >
                            {item.title}
                        </a>
                    ))}
                </div>
            </div>
        </footer>
    );
}
