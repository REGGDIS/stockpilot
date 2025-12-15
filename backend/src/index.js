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

app.listen(PORT, () => {
    console.log(`StockPilot API escuchando en http://localhost:${PORT}`);
});