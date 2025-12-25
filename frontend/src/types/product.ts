export type Product = {
    id: number;
    sku: string;
    name: string;
    barcode?: string | null;
    category?: string | null;
    created_at?: string;
    updated_at?: string;
};

export type CreateProductInput = {
    sku: string;
    name: string;
    barcode?: string;
    category?: string;
};