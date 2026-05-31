const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.connect((err) => {
  if (err) {
    console.error("DB CONNECTION FAILED:", err.message);
  } else {
    console.log("DB CONNECTED OK");
  }
});

app.get("/", (req, res) => res.send("Backend working"));

app.post("/save", async (req, res) => {
  try {
    const { totalSeconds, startTime, endTime } = req.body;
    console.log("SAVE CALLED:", totalSeconds, startTime, endTime);

    // Use IST date as work_date
    const istOffset = 5.5 * 60 * 60000;
    const work_date = new Date(new Date(endTime).getTime() + istOffset)
      .toISOString().split("T")[0];

    await pool.query(
      "INSERT INTO productivity_logs (work_date, start_time, end_time, total_seconds) VALUES ($1, $2, $3, $4)",
      [work_date, new Date(startTime), new Date(endTime), totalSeconds]
    );

    console.log("SAVED OK");
    res.json({ success: true });
  } catch (error) {
    console.error("SAVE ERROR:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/history", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        work_date,
        start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' AS start_time,
        end_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' AS end_time,
        total_seconds
      FROM productivity_logs
      ORDER BY work_date DESC, start_time DESC
    `);
    console.log("HISTORY ROWS:", result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error("HISTORY ERROR:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));