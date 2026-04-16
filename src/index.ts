import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import express, { Request, Response as ExpressResponse } from "express";
import { Pool, PoolConfig } from "pg";
import * as cron from "node-cron";
import {
  updateDatabase,
  selectTodaysWord,
  updateSetData,
} from "./cronCalls.js";
import { convertPriceToNumber } from "./apiObjectLogic.js";
import type { DbReturnStructure } from "./types/types.js";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();


const PORT = process.env.PORT || 3000;

interface ExtendedPoolConfig extends PoolConfig {
  family?: number;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  family: 4,
} as ExtendedPoolConfig);

async function testConnection() {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("Connected:", result.rows[0]);
  } catch (err) {
    console.error("DB Error here:", err);
  }
}

async function init() {
  try {
    await testConnection();
    console.log("DB connected");

    const response = await pool.query(`
      SELECT c.*, s.*
      FROM cards c
      JOIN sets s ON c.set_code = s.code
      WHERE date_selected = CURRENT_DATE
      LIMIT 1
    `);

    if (response.rows[0]) {
      todaysWord = convertPriceToNumber(response)[0];
    }
  } catch (err) {
    console.error("Startup error:", err);
  }
}

const app = express();
app.use(cors());

let todaysWord: DbReturnStructure | null = null;

/*-------- Tests for dev ------*/

//test baseroute
app.get("/", (_, res) => {
  res.status(200).json({ response: "HELLO WORLD" });
});

/*----------- Routes -------------- */

// route for front-end to get todaysWord
app.get("/todays_word", (_, res) => {
  if (!todaysWord) {
    return res.status(503).json({ error: "Word not ready yet" });
  }

  res.status(200).json(todaysWord);
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
      const wordStructure = await selectTodaysWord();
      todaysWord = wordStructure;
      console.log(todaysWord);
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
      console.log("Starting weekly db update");
      await updateDatabase();
    } catch (err) {
      console.error("Failed to update cards:", err);
    }
  },
  {
    timezone: "Europe/London",
  },
);

//run cron call for monthly set update tunds at 1am first day of month
cron.schedule(
  "0 0 1 1 * *",
  async () => {
    try {
      console.log("Updating dataset");
      await updateSetData();
    } catch (err) {
      console.error("Failed to update set", err);
    }
  },
  {
    timezone: "Europe/London",
  },
);

app.listen(PORT, async () => {
  console.log(`Server running on Port ${PORT}`);
});

init()