import { useEffect, useMemo, useState } from "react";
import { createProduct, getProducts } from "../api/products";
import type { CreateProductInput, Product } from "../types/product";

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState<CreateProductInput>({
    sku: "",
    name: "",
    barcode: "",
    category: "",
  });

  const canSubmit = useMemo(
    () => form.sku.trim().length > 0 && form.name.trim().length > 0,
    [form.sku, form.name]
  );

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const data = await getProducts();
      setItems(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error cargando productos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setErr(null);

    try {
      const payload: CreateProductInput = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        barcode: form.barcode?.trim() || undefined,
        category: form.category?.trim() || undefined,
      };

      await createProduct(payload);
      setForm({ sku: "", name: "", barcode: "", category: "" });
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error creando producto");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Products</h1>
          <p className="text-sm text-zinc-500">
            Lista + creación de productos (vía backend).
          </p>
        </div>

        <button
          onClick={refresh}
          className="rounded border px-3 py-2 text-sm hover:bg-zinc-50"
          disabled={loading}
        >
          Refrescar
        </button>
      </div>

      <form onSubmit={onSubmit} className="rounded-lg border p-4 space-y-3">
        <div className="font-medium">Crear producto</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1">
            <div className="text-sm">SKU *</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={form.sku}
              onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
              placeholder="SKU-001"
            />
          </label>

          <label className="space-y-1">
            <div className="text-sm">Nombre *</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Caja chica cartón"
            />
          </label>

          <label className="space-y-1">
            <div className="text-sm">Barcode</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={form.barcode ?? ""}
              onChange={(e) =>
                setForm((p) => ({ ...p, barcode: e.target.value }))
              }
              placeholder="1234567890123"
            />
          </label>

          <label className="space-y-1">
            <div className="text-sm">Categoría</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={form.category ?? ""}
              onChange={(e) =>
                setForm((p) => ({ ...p, category: e.target.value }))
              }
              placeholder="Embalaje"
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded bg-zinc-900 text-white px-4 py-2 text-sm hover:bg-zinc-800 disabled:opacity-50"
            disabled={!canSubmit || loading}
          >
            Crear
          </button>

          <div className="text-xs text-zinc-500">
            {loading ? "Trabajando..." : " "}
          </div>
        </div>

        {err && (
          <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {err}
          </div>
        )}
      </form>

      <div className="rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-medium">Listado</div>
          <div className="text-sm text-zinc-500">
            {loading ? "Cargando..." : `${items.length} items`}
          </div>
        </div>

        <div className="divide-y">
          {items.map((p) => (
            <div key={p.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-zinc-500">#{p.id}</div>
              </div>
              <div className="text-sm text-zinc-600 mt-1">
                <span className="mr-3">
                  <b>SKU:</b> {p.sku}
                </span>
                {p.category && (
                  <span className="mr-3">
                    <b>Cat:</b> {p.category}
                  </span>
                )}
                {p.barcode && (
                  <span>
                    <b>Barcode:</b> {p.barcode}
                  </span>
                )}
              </div>
            </div>
          ))}

          {items.length === 0 && !loading && (
            <div className="p-6 text-sm text-zinc-500">
              No hay productos todavía.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
