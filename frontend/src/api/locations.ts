import { apiFetch } from "./http";
import type { CreateLocationInput, Location } from "../types/location";

export function getLocations() {
    return apiFetch<Location[]>("/locations");
}

export function createLocation(input: CreateLocationInput) {
    return apiFetch<Location>("/locations", {
        method: "POST",
        body: JSON.stringify(input),
    });
}