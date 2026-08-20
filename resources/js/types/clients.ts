export type Client = {
    // The public id (ADR-038), not the row id — it is what appears in URLs and what every
    // client route is keyed by.
    id: string;
    name: string;
    contactEmail: string;
    contactPhone: string | null;
    createdAt: string | null;
};
