/**
 * Which pages render a section sidebar (ADR-016, ADR-042).
 *
 * One list, read in two places: `app.tsx` composes the matching section layout, and `app-header`
 * decides whether to render the sidebar toggle — the header sits above the sidebar in the tree,
 * so it cannot be told by the layout below it. The `Record` in `app.tsx` is keyed by this type,
 * so adding a prefix without a layout is a type error rather than a toggle that toggles nothing.
 */
export const SECTION_PAGE_PREFIXES = [
    'organizations/settings/',
    'settings/',
] as const;

export type SectionPagePrefix = (typeof SECTION_PAGE_PREFIXES)[number];

/**
 * The Inertia page component name, e.g. `organizations/settings/general`.
 */
export function pageHasSections(component: string): boolean {
    return SECTION_PAGE_PREFIXES.some((prefix) => component.startsWith(prefix));
}
