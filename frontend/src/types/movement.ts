export type MovementType = "IN" | "OUT" | "MOVE" | "ADJUST" | "COUNT";

export type Movement = {
    id: number;
    movement_uuid?: string;
    movement_type: MovementType;

    product_id: number;
    product_sku?: string;
    product_name?: string;

    from_location_id?: number | null;
    from_location_code?: string | null;

    to_location_id?: number | null;
    to_location_code?: string | null;

    quantity: number;
    reason?: string | null;
    reference?: string | null;
    created_at?: string;
};

export type CreateMovementInput = {
    movement_type: MovementType;
    product_id: number;
    from_location_id?: number | null;
    to_location_id?: number | null;
    quantity: number;
    reason?: string;
    reference?: string;
};