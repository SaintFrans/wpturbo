import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * A framed container for grouping related information.
 *
 * A recessed outer surface holds an optional header and one or more raised panels:
 *
 *     <Frame>
 *         <FrameHeader>
 *             <FrameTitle>General</FrameTitle>
 *             <FrameDescription>Settings related to your profile.</FrameDescription>
 *         </FrameHeader>
 *         <FramePanel>…</FramePanel>
 *         <FramePanel>…</FramePanel>
 *     </Frame>
 *
 * A panel can instead hold categories of rows, with control columns that line up across
 * every row in the group:
 *
 *     <FramePanel padded={false}>
 *         <FrameGroup>
 *             <FrameGroupHeader>
 *                 <FrameGroupTitle>Server</FrameGroupTitle>
 *                 <FrameColumn>Email</FrameColumn>
 *                 <FrameColumn>In-app</FrameColumn>
 *             </FrameGroupHeader>
 *             <FrameRow>
 *                 <FrameLabel>
 *                     Server provisioned
 *                     <FrameDescription>A new server is ready.</FrameDescription>
 *                 </FrameLabel>
 *                 <FrameCell><Checkbox aria-label="Email" /></FrameCell>
 *                 <FrameCell><Checkbox aria-label="In-app" /></FrameCell>
 *             </FrameRow>
 *         </FrameGroup>
 *     </FramePanel>
 *
 * A row with a single control uses FrameControl instead of FrameCell, which right-aligns
 * it without reserving a fixed column.
 *
 * Hand-written rather than generated: it is not in the shadcn registry, so `shadcn add`
 * will not overwrite it. Every colour comes from a theme token so it follows light and
 * dark without a second definition.
 *
 * Note: this directory is excluded from Oxfmt (`fmt.ignorePatterns`), so formatting here
 * is maintained by hand.
 */
function Frame({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="frame"
            className={cn(
                'border border-border flex flex-col gap-1 overflow-hidden rounded-xl bg-muted/60 p-1 shadow-inner dark:bg-muted/30',
                className,
            )}
            {...props}
        />
    );
}

/**
 * Children are the title and description, which always stack. `action` places a control —
 * a Save button, usually — opposite them.
 */
function FrameHeader({
    className,
    children,
    action,
    ...props
}: React.ComponentProps<'header'> & { action?: React.ReactNode }) {
    return (
        <header
            data-slot="frame-header"
            className={cn(
                'flex flex-col items-start justify-between gap-x-6 gap-y-3 px-4 py-3 lg:flex-row lg:items-center',
                className,
            )}
            {...props}
        >
            <div className="space-y-1">{children}</div>
            {action}
        </header>
    );
}

function FrameTitle({ className, ...props }: React.ComponentProps<'h2'>) {
    return (
        <h2
            data-slot="frame-title"
            className={cn('text-sm font-medium text-foreground', className)}
            {...props}
        />
    );
}

/**
 * Renders a <span> rather than a <p> so it is valid inside a <label>, where a paragraph
 * is not allowed. Works the same standing alone under a title.
 */
function FrameDescription({ className, ...props }: React.ComponentProps<'span'>) {
    return (
        <span
            data-slot="frame-description"
            className={cn(
                'block text-sm font-normal text-muted-foreground',
                className,
            )}
            {...props}
        />
    );
}

/**
 * A raised panel inside the frame. Several may sit side by side; each is its own surface.
 *
 * `padded` supplies the inset for simple content. Set it to false when the panel holds
 * FrameGroups or FrameRows, which carry their own padding so their dividers can run the
 * full width of the panel.
 */
function FramePanel({
    className,
    padded = true,
    ...props
}: React.ComponentProps<'div'> & { padded?: boolean }) {
    return (
        <div
            data-slot="frame-panel"
            className={cn(
                'divide-y divide-border overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xs',
                padded && 'px-4 py-3',
                className,
            )}
            {...props}
        />
    );
}

/**
 * Actions for the frame, in the recessed area below the panel.
 *
 * Reveal it only once something has changed — an always-present Save button trains people
 * to ignore it, and says nothing about whether there is anything to save:
 *
 *     {isDirty && (
 *         <FrameFooter>
 *             <Button variant="ghost" onPress={() => reset()}>Cancel</Button>
 *             <Button type="submit" isDisabled={processing}>Save</Button>
 *         </FrameFooter>
 *     )}
 */
function FrameFooter({ className, children, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="frame-footer"
            className={cn(
                'flex flex-col-reverse items-stretch justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center',
                className,
            )}
            {...props}
        >
            <span className="text-sm text-muted-foreground">
                You have unsaved changes.
            </span>
            <div className="flex items-center justify-end gap-2">{children}</div>
        </div>
    );
}

/**
 * A category of rows within a panel — "General", "Server", "Site". Groups are separated
 * from each other by the panel's dividers, and their own header and rows by theirs.
 *
 * `--frame-column` sets the width of the aligned control columns. Override it on the group
 * to widen them: <FrameGroup className="[--frame-column:7rem]">.
 */
function FrameGroup({
    className,
    divided = true,
    ...props
}: React.ComponentProps<'div'> & { divided?: boolean }) {
    return (
        <div
            data-slot="frame-group"
            className={cn(
                'flex flex-col [--frame-column:5rem]',
                // Rows that belong to one another — the three fields of a password change,
                // say — read as a single thing, so they are not ruled off from each other.
                divided && 'divide-y divide-border',
                className,
            )}
            {...props}
        />
    );
}

/**
 * The header of a group: a title, and optionally one FrameColumn per control column, which
 * line up with the FrameCells in the rows below.
 */
function FrameGroupHeader({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="frame-group-header"
            className={cn(
                'flex items-center gap-4 bg-muted/30 px-4 py-2.5 sm:gap-8',
                className,
            )}
            {...props}
        />
    );
}

function FrameGroupTitle({ className, ...props }: React.ComponentProps<'h3'>) {
    return (
        <h3
            data-slot="frame-group-title"
            className={cn(
                'flex-1 text-sm font-medium text-foreground',
                className,
            )}
            {...props}
        />
    );
}

/**
 * A column label in a group header. Its width matches the FrameCells beneath it.
 */
function FrameColumn({ className, ...props }: React.ComponentProps<'span'>) {
    return (
        <span
            data-slot="frame-column"
            className={cn(
                'hidden w-(--frame-column) shrink-0 text-center text-xs font-normal text-muted-foreground sm:block',
                className,
            )}
            {...props}
        />
    );
}

/**
 * A labelled row: label and description on the left, control or cells on the right.
 * Carries its own padding, so the panel holding it should be `padded={false}`.
 */
function FrameRow({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="frame-row"
            className={cn(
                'flex w-full flex-col justify-between gap-4 px-4 py-3 sm:flex-row sm:items-center sm:gap-8',
                className,
            )}
            {...props}
        />
    );
}

/**
 * One control column inside a row, aligned with the FrameColumn above it. Use several per
 * row when a group offers more than one choice — email and in-app, say.
 */
function FrameCell({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="frame-cell"
            className={cn(
                'flex shrink-0 items-center justify-start sm:w-(--frame-column) sm:justify-center',
                className,
            )}
            {...props}
        />
    );
}

/**
 * The label side of a FrameRow. Renders a <label> when `htmlFor` is given, so clicking the
 * text focuses the control; a <div> otherwise, because a label without a control is invalid.
 */
function FrameLabel({
    className,
    htmlFor,
    ...props
}: React.HTMLAttributes<HTMLElement> & { htmlFor?: string }) {
    const classes = cn(
        'w-full shrink text-sm font-medium text-foreground',
        className,
    );

    // A <label> with nothing to point at is invalid markup, so rows that only present
    // information — an avatar, a read-only value — render a plain <div> instead.
    if (!htmlFor) {
        return <div data-slot="frame-label" className={classes} {...props} />;
    }

    return (
        <label
            data-slot="frame-label"
            htmlFor={htmlFor}
            className={classes}
            {...props}
        />
    );
}

/**
 * The control side of a FrameRow — an input, select, switch or button.
 */
function FrameControl({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="frame-control"
            className={cn(
                'flex w-full grow items-center justify-start sm:max-w-64 sm:justify-end',
                className,
            )}
            {...props}
        />
    );
}

export {
    Frame,
    FrameCell,
    FrameColumn,
    FrameControl,
    FrameDescription,
    FrameFooter,
    FrameGroup,
    FrameGroupHeader,
    FrameGroupTitle,
    FrameHeader,
    FrameLabel,
    FramePanel,
    FrameRow,
    FrameTitle,
};
