import { apiFetch } from "./http";
import type { CreateMovementInput, Movement } from "../types/movement";

export function getMovements() {
    return apiFetch<Movement[]>("/movements");
}

export function createMovement(input: CreateMovementInput) {
    return apiFetch<Movement>("/movements", {
        method: "POST",
        body: JSON.stringify(input),
    });
}