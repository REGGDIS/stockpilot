const express = require("express");

const app = express();

// Para poder leer JSON en el body de las peticiones
app.use(express.json());

// Puerto configurable para hosting (Render, Railway, etc.)
const PORT = process.env.PORT || 3000;

// Endpoint de prueba / healthcheck
app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "stockpilot-api" });
});

// Aquí luego agregaremos más rutas, por ejemplo:
// app.use("/products", productsRouter);

app.listen(PORT, () => {
    console.log(`StockPilot API escuchando en http://localhost:${PORT}`);
});