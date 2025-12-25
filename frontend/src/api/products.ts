import { apiFetch  } from "./http";
import type { CreateProductInput, Product } from "../types/product";

export function getProducts() {
    return apiFetch<Product[]>("/products");
}

export function createProduct(input: CreateProductInput) {
    return apiFetch<Product>("/products", {
        method: "POST",
        body: JSON.stringify(input),
    });
}