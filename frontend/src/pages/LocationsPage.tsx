import { useEffect, useMemo, useState } from "react";
import { createLocation, getLocations } from "../api/locations";
import type { CreateLocationInput, Location } from "../types/location";

export default function LocationsPage() {
  const [items, setItems] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState<CreateLocationInput>({
    code: "",
    name: "",
    description: "",
  });

  const canSubmit = useMemo(
    () => form.code.trim().length > 0 && form.name.trim().length > 0,
    [form.code, form.name]
  );

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      setItems(await getLocations());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error cargando ubicaciones");
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
      const payload: CreateLocationInput = {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
      };

      await createLocation(payload);
      setForm({ code: "", name: "", description: "" });
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error creando ubicación");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Locations</h1>
          <p className="text-sm text-zinc-500">Lista + creación de ubicaciones.</p>
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
        <div className="font-medium">Crear ubicación</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1">
            <div className="text-sm">Code *</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
              placeholder="A1-01"
            />
          </label>

          <label className="space-y-1">
            <div className="text-sm">Nombre *</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Pasillo A1 Estante 1"
            />
          </label>

          <label className="space-y-1 md:col-span-2">
            <div className="text-sm">Descripción</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={form.description ?? ""}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Cerca de la entrada"
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
          <div className="text-xs text-zinc-500">{loading ? "Trabajando..." : " "}</div>
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
          {items.map((l) => (
            <div key={l.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">{l.name}</div>
                <div className="text-xs text-zinc-500">#{l.id}</div>
              </div>
              <div className="text-sm text-zinc-600 mt-1">
                <span className="mr-3">
                  <b>Code:</b> {l.code}
                </span>
                {l.description && (
                  <span>
                    <b>Desc:</b> {l.description}
                  </span>
                )}
              </div>
            </div>
          ))}

          {items.length === 0 && !loading && (
            <div className="p-6 text-sm text-zinc-500">No hay ubicaciones todavía.</div>
          )}
        </div>
      </div>
    </div>
  );
}
