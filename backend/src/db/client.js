const { Pool } = require("pg");
require("dotenv").config({ path: "../.env" }); // ajustamos ruta más abajo

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};