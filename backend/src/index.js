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

app.listen(PORT, () => {
    console.log(`StockPilot API escuchando en http://localhost:${PORT}`);
});