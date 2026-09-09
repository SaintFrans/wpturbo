import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import type { FlashToast } from '@/types/ui';

/**
 * The single notification path: `Inertia::flash('toast', …)` on the server, surfaced here through
 * sonner. Mounted once, in `app.tsx`.
 *
 * The subscription and the `Toaster` live in the same component on purpose. They were two files —
 * a `use-flash-toast` hook and the `Toaster` — and the hook ended up with no caller at all, so
 * fifteen controller actions were flashing toasts that nothing ever rendered. Kept together, one
 * cannot be mounted without the other.
 */
export function FlashToaster() {
    useEffect(() => {
        return router.on('flash', (event) => {
            const flash = (event as CustomEvent).detail?.flash;
            const data = flash?.toast as FlashToast | undefined;

            if (!data) {
                return;
            }

            toast[data.type](data.message);
        });
    }, []);

    return <Toaster />;
}
