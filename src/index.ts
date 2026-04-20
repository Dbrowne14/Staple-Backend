import express, { Request, Response as ExpressResponse } from "express";
import { Pool } from "pg";
import * as cron from "node-cron";
import {
  updateDatabase,
  selectTodaysWord,
  updateSetData,shouldRunMonthlyUpdate
} from "./cronCalls.js";
import { convertPriceToNumber } from "./apiObjectLogic.js";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 3000;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function testConnection() {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("Connected:", result.rows[0]);
  } catch (err) {
    console.error("DB Error here:", err);
  }
}

const app = express();
app.use(cors());

/*-------- Tests for dev ------*/

//test baseroute
app.get("/", (_, res) => {
  res.status(200).json({ response: "HELLO WORLD" });
});

/*----------- Routes -------------- */

// route for front-end to get todaysWord
app.get("/todays_word", async (_, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Try to get today's card
    const existing = await client.query(`
      SELECT c.*, s.*
      FROM cards c
      JOIN sets s ON c.set_code = s.code
      WHERE date_selected = CURRENT_DATE
      LIMIT 1
    `);

    if (existing.rows[0]) {
      await client.query("COMMIT");
      return res.json(convertPriceToNumber(existing)[0]);
    }

    // 2. Try to assign one
    const update = await client.query(`
      UPDATE cards
      SET date_selected = CURRENT_DATE
      WHERE id = (
        SELECT id
        FROM cards
        WHERE date_selected IS NULL
        ORDER BY RANDOM()
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
    `);

    await client.query("COMMIT");

    if (update.rows[0]) {
      return res.json(convertPriceToNumber(update)[0]);
    }

    // fallback (shouldn't happen often)
    const fallback = await pool.query(`
      SELECT c.*, s.*
      FROM cards c
      JOIN sets s ON c.set_code = s.code
      WHERE date_selected = CURRENT_DATE
      LIMIT 1
    `);

    return res.json(convertPriceToNumber(fallback)[0]);
  } catch (err: any) {
    await client.query("ROLLBACK");

    // 🧠 If UNIQUE constraint was hit → just fetch existing
    if (err.code === "23505") {
      const existing = await pool.query(`
        SELECT c.*, s.*
        FROM cards c
        JOIN sets s ON c.set_code = s.code
        WHERE date_selected = CURRENT_DATE
        LIMIT 1
      `);

      return res.json(convertPriceToNumber(existing)[0]);
    }

    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

//Get all cards
app.get("/allCards", async (_, res: ExpressResponse) => {
  try {
    const response = await pool.query(`SELECT c.*, s.*
    FROM cards c
    JOIN sets s ON c.set_code = s.code;`);
    const normalizedCards = convertPriceToNumber(response);
    res.status(200).json(normalizedCards);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

/*--------- Cron Calls ------------ */

//daily cron call to select word
cron.schedule(
  "0 45 11 * * *",
  async () => {
    try {
      await selectTodaysWord();
    } catch (err) {
      console.error("Failed to select random card", err);
    }
  },
  {
    timezone: "Europe/London",
  },
);

//run cron call for monthly data update runs first day every month
cron.schedule(
  "0 0 0 1 * *",
  async () => {
    try {
      console.log("Starting weekly  update");
      await updateDatabase();
      await updateSetData();

    await pool.query(`
      INSERT INTO meta (key, last_run)
      VALUES ('monthly_update', NOW())
      ON CONFLICT (key)
      DO UPDATE SET last_run = NOW();
    `);

  } catch (err) {
    console.error("Monthly update failed:", err);
  }
  },
  {
    timezone: "Europe/London",
  },
);

// manual update route
app.post("/admin/run-monthly-update", async (_, res) => {
  try {
    const shouldRun = await shouldRunMonthlyUpdate();

    if (!shouldRun) {
      return res.status(200).json({
        success: true,
        message: "Already updated this month"
      });
    }
    await updateSetData();
    await updateDatabase();


    await pool.query(`
      INSERT INTO meta (key, last_run)
      VALUES ('monthly_update', NOW())
      ON CONFLICT (key)
      DO UPDATE SET last_run = NOW();
    `);

    res.status(200).json({ success: true });

  } catch (err) {
    console.error("Monthly update failed:", err);
    res.status(500).json({ error: "Monthly update failed" });
  }
});

app.listen(PORT, async () => {
  testConnection();
  console.log(`Server running on Port ${PORT}`);
});

app.post("/admin/force-update", async (_, res) => {
  try {
    await updateSetData();
    await updateDatabase();

    await pool.query(`
      INSERT INTO meta (key, last_run)
      VALUES ('monthly_update', NOW())
      ON CONFLICT (key)
      DO UPDATE SET last_run = NOW();
    `);

    res.status(200).json({ success: true });

  } catch (err) {
    console.error("Monthly update failed:", err);
    res.status(500).json({ error: "Monthly update failed" });
  }
});