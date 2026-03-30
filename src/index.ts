import express, { Request, Response as ExpressResponse } from "express";
import { Pool } from "pg";
import { cardsLimit } from "./data/inputData";
const cron = require("node-cron");
import { updateDatabase } from "./cronCalls";

import type { ReturnStructure } from "./types/types";

const pool = new Pool({
  user: "davidbrowne",
  host: "localhost",
  database: "Staple_db",
  port: 5432,
});

(async () => {
  const res = await pool.query(
    `SELECT COUNT(*) as column_count FROM information_schema.columns WHERE table_name = 'cards'`,
  );
  console.log(res.rows);
})();

const app = express();

//run cron call for weekly data update runs every Sunday
cron.schedule("0 0 0 * * 0", async () => {
  try {
    console.log("Starting weekly db update");
    await updateDatabase();
  } catch (err) {
    console.error("Failed to update cards:", err);
  }
});

app.listen(3000, () => console.log("Server running on Port 3000"));
