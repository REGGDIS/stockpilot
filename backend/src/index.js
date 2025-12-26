const express = require("express");
const db = require("./db/client");

const app = express();

// Para poder leer JSON en el body de las peticiones
app.use(express.json());

// Puerto configurable para hosting (Render, Railway, etc.)
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("StockPilot API está funcionando.");
})

// Endpoint de prueba / healthcheck
app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "stockpilot-api" });
});

app.get("/products", async (req, res) => {
    try {
        const result = await db.query("SELECT id, sku, name, barcode, category, created_at, updated_at FROM products ORDER BY id ASC");
        res.json(result.rows);
    } catch (err) {
        console.error("Error consultando products", err);
        res.status(500).json({ error: "Error interno al obtener productos" });
    }
});

// GET /locations
app.get("/locations", async (req, res) => {
    try {
        const { rows } = await db.query(
            "SELECT id, code, name, description, is_active, created_at, updated_at FROM locations ORDER BY id ASC"
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error obteniendo locations" });
    }
});

// POST /locations
app.post("/locations", async (req, res) => {
    try {
        const { code, name, description } = req.body;

        if (!code || !name) {
            return res.status(400).json({ error: "code y name son obligatorios" });
        }

        const { rows } = await db.query(
            `INSERT INTO locations (code, name, description)
       VALUES ($1, $2, $3)
       RETURNING id, code, name, description, is_active, created_at, updated_at`,
            [code, name, description ?? null]
        );

        res.status(201).json(rows[0]);
    } catch (err) {
        // típico: code duplicado (constraint unique)
        if (err && err.code === "23505") {
            return res.status(409).json({ error: "Location code ya existe" });
        }
        console.error(err);
        res.status(500).json({ error: "Error creando location" });
    }
});

// GET /movements (últimos 100)
app.get("/movements", async (req, res) => {
    try {
        const { rows } = await db.query(
            `
      SELECT
        sm.id,
        sm.movement_uuid,
        sm.movement_type,
        sm.product_id,
        p.sku AS product_sku,
        p.name AS product_name,
        sm.from_location_id,
        lf.code AS from_location_code,
        sm.to_location_id,
        lt.code AS to_location_code,
        sm.quantity,
        sm.reason,
        sm.reference,
        sm.created_at
      FROM stock_movements sm
      JOIN products p ON p.id = sm.product_id
      LEFT JOIN locations lf ON lf.id = sm.from_location_id
      LEFT JOIN locations lt ON lt.id = sm.to_location_id
      ORDER BY sm.created_at DESC
      LIMIT 100
      `
        );

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error obteniendo movements" });
    }
});

// POST /movements
app.post("/movements", async (req, res) => {
    try {
        const {
            movement_type,
            product_id,
            from_location_id,
            to_location_id,
            quantity,
            reason,
            reference,
            movement_uuid,
        } = req.body;

        if (!movement_type || !product_id || !quantity) {
            return res
                .status(400)
                .json({ error: "movement_type, product_id y quantity son obligatorios" });
        }

        const allowed = ["IN", "OUT", "MOVE", "ADJUST", "COUNT"];
        if (!allowed.includes(movement_type)) {
            return res.status(400).json({ error: "movement_type inválido" });
        }

        // reglas por tipo
        if (movement_type === "IN" && !to_location_id)
            return res.status(400).json({ error: "IN requiere to_location_id" });

        if (movement_type === "OUT" && !from_location_id)
            return res.status(400).json({ error: "OUT requiere from_location_id" });

        if (movement_type === "MOVE" && (!from_location_id || !to_location_id))
            return res
                .status(400)
                .json({ error: "MOVE requiere from_location_id y to_location_id" });

        if (movement_type === "ADJUST" && !to_location_id)
            return res.status(400).json({ error: "ADJUST requiere to_location_id" });

        if (movement_type === "COUNT" && !to_location_id)
            return res.status(400).json({ error: "COUNT requiere to_location_id" });

        const q = Number(quantity);
        if (!Number.isFinite(q) || q <= 0) {
            return res.status(400).json({ error: "quantity debe ser > 0" });
        }

        const { rows } = await db.query(
            `
      INSERT INTO stock_movements
        (movement_type, product_id, from_location_id, to_location_id, quantity, reason, reference, movement_uuid)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::uuid, uuid_generate_v4()))
      RETURNING *
      `,
            [
                movement_type,
                product_id,
                from_location_id ?? null,
                to_location_id ?? null,
                q,
                reason ?? null,
                reference ?? null,
                movement_uuid ?? null,
            ]
        );

        res.status(201).json(rows[0]);
    } catch (err) {
        // uuid duplicado (idempotencia)
        if (err && err.code === "23505") {
            return res.status(409).json({ error: "movement_uuid ya existe" });
        }
        // triggers pueden lanzar error (stock insuficiente, etc.)
        console.error(err);
        res.status(400).json({ error: err.message || "Error creando movement" });
    }
});

app.listen(PORT, () => {
    console.log(`StockPilot API escuchando en http://localhost:${PORT}`);
});