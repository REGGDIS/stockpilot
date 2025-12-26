import { useEffect, useMemo, useState } from "react";
import { getProducts } from "../api/products";
import { getLocations } from "../api/locations";
import { createMovement, getMovements } from "../api/movements";

import type { Product } from "../types/product";
import type { Location } from "../types/location";
import type { CreateMovementInput, Movement, MovementType } from "../types/movement";

const movementTypes: MovementType[] = ["IN", "OUT", "MOVE", "ADJUST", "COUNT"];

function needsFrom(t: MovementType) {
  return t === "OUT" || t === "MOVE";
}
function needsTo(t: MovementType) {
  return t === "IN" || t === "MOVE" || t === "ADJUST" || t === "COUNT";
}

export default function MovementsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [items, setItems] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState<CreateMovementInput>({
    movement_type: "IN",
    product_id: 0,
    from_location_id: null,
    to_location_id: null,
    quantity: 1,
    reason: "",
    reference: "",
  });

  const canSubmit = useMemo(() => {
    if (!form.movement_type) return false;
    if (!form.product_id || form.product_id <= 0) return false;
    if (!Number.isFinite(form.quantity) || form.quantity <= 0) return false;

    if (needsFrom(form.movement_type) && !form.from_location_id) return false;
    if (needsTo(form.movement_type) && !form.to_location_id) return false;

    if (form.movement_type === "MOVE" && form.from_location_id === form.to_location_id)
      return false;

    return true;
  }, [form]);

  async function refreshAll() {
    setLoading(true);
    setErr(null);
    try {
      const [p, l, m] = await Promise.all([getProducts(), getLocations(), getMovements()]);
      setProducts(p);
      setLocations(l);
      setItems(m);

      // autoselecciones si están en 0
      setForm((prev) => {
        const next = { ...prev };
        if (!next.product_id && p.length > 0) next.product_id = p[0].id;
        if (!next.to_location_id && l.length > 0 && needsTo(next.movement_type)) next.to_location_id = l[0].id;
        if (!next.from_location_id && l.length > 0 && needsFrom(next.movement_type)) next.from_location_id = l[0].id;
        return next;
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error cargando datos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
  }, []);

  // cuando cambia movement_type, limpia/ajusta campos
  useEffect(() => {
    setForm((prev) => {
      const t = prev.movement_type;
      return {
        ...prev,
        from_location_id: needsFrom(t) ? prev.from_location_id : null,
        to_location_id: needsTo(t) ? prev.to_location_id : null,
      };
    });
  }, [form.movement_type]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setErr(null);

    try {
      const payload: CreateMovementInput = {
        movement_type: form.movement_type,
        product_id: Number(form.product_id),
        quantity: Number(form.quantity),
        from_location_id: needsFrom(form.movement_type) ? (form.from_location_id ?? null) : null,
        to_location_id: needsTo(form.movement_type) ? (form.to_location_id ?? null) : null,
        reason: form.reason?.trim() || undefined,
        reference: form.reference?.trim() || undefined,
      };

      await createMovement(payload);

      // reset suave
      setForm((p) => ({ ...p, quantity: 1, reason: "", reference: "" }));
      await refreshAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error creando movimiento");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Movements</h1>
          <p className="text-sm text-zinc-500">Crear movimientos y ver los últimos registrados.</p>
        </div>

        <button
          onClick={refreshAll}
          className="rounded border px-3 py-2 text-sm hover:bg-zinc-50"
          disabled={loading}
        >
          Refrescar
        </button>
      </div>

      <form onSubmit={onSubmit} className="rounded-lg border p-4 space-y-3">
        <div className="font-medium">Crear movimiento</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1">
            <div className="text-sm">Tipo *</div>
            <select
              className="w-full rounded border px-3 py-2 bg-white"
              value={form.movement_type}
              onChange={(e) =>
                setForm((p) => ({ ...p, movement_type: e.target.value as MovementType }))
              }
            >
              {movementTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <div className="text-sm">Producto *</div>
            <select
              className="w-full rounded border px-3 py-2 bg-white"
              value={form.product_id}
              onChange={(e) => setForm((p) => ({ ...p, product_id: Number(e.target.value) }))}
            >
              <option value={0}>-- Selecciona --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name}
                </option>
              ))}
            </select>
          </label>

          {needsFrom(form.movement_type) && (
            <label className="space-y-1">
              <div className="text-sm">From location *</div>
              <select
                className="w-full rounded border px-3 py-2 bg-white"
                value={form.from_location_id ?? 0}
                onChange={(e) =>
                  setForm((p) => ({ ...p, from_location_id: Number(e.target.value) || null }))
                }
              >
                <option value={0}>-- Selecciona --</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.code} — {l.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {needsTo(form.movement_type) && (
            <label className="space-y-1">
              <div className="text-sm">To location *</div>
              <select
                className="w-full rounded border px-3 py-2 bg-white"
                value={form.to_location_id ?? 0}
                onChange={(e) =>
                  setForm((p) => ({ ...p, to_location_id: Number(e.target.value) || null }))
                }
              >
                <option value={0}>-- Selecciona --</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.code} — {l.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="space-y-1">
            <div className="text-sm">Cantidad *</div>
            <input
              className="w-full rounded border px-3 py-2"
              type="number"
              step="0.01"
              value={form.quantity}
              onChange={(e) => setForm((p) => ({ ...p, quantity: Number(e.target.value) }))}
            />
          </label>

          <label className="space-y-1">
            <div className="text-sm">Reference</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={form.reference ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))}
              placeholder="OC-123"
            />
          </label>

          <label className="space-y-1 md:col-span-2">
            <div className="text-sm">Reason</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={form.reason ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
              placeholder="Compra / Merma / Ajuste..."
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
          <div className="font-medium">Últimos movimientos</div>
          <div className="text-sm text-zinc-500">
            {loading ? "Cargando..." : `${items.length} items`}
          </div>
        </div>

        <div className="divide-y">
          {items.map((m) => (
            <div key={m.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">
                  [{m.movement_type}] {m.product_sku ?? `#${m.product_id}`} — {m.product_name ?? ""}
                </div>
                <div className="text-xs text-zinc-500">#{m.id}</div>
              </div>

              <div className="text-sm text-zinc-600 mt-1">
                <span className="mr-3">
                  <b>Qty:</b> {m.quantity}
                </span>
                {m.from_location_code && (
                  <span className="mr-3">
                    <b>From:</b> {m.from_location_code}
                  </span>
                )}
                {m.to_location_code && (
                  <span className="mr-3">
                    <b>To:</b> {m.to_location_code}
                  </span>
                )}
                {m.reference && (
                  <span className="mr-3">
                    <b>Ref:</b> {m.reference}
                  </span>
                )}
                {m.reason && (
                  <span>
                    <b>Reason:</b> {m.reason}
                  </span>
                )}
              </div>
            </div>
          ))}

          {items.length === 0 && !loading && (
            <div className="p-6 text-sm text-zinc-500">No hay movimientos todavía.</div>
          )}
        </div>
      </div>
    </div>
  );
}
