require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.query(
  "INSERT INTO productivity_logs (work_date, start_time, end_time, total_seconds) VALUES ($1, $2, $3, $4)",
  ["2026-05-29", "2026-05-29 08:00:00", "2026-05-29 08:01:00", 60]
)
.then(() => console.log("OK - Database works!"))
.catch((e) => console.log("ERR:", e.message));