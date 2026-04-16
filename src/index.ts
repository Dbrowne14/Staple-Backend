import express, { Request, Response as ExpressResponse } from "express";
import { Pool } from "pg";
import * as cron from "node-cron";
import { updateDatabase, selectTodaysWord, updateSetData } from "./cronCalls";
import { convertPriceToNumber } from "./apiObjectLogic";
import type { DbReturnStructure } from "./types/types";
import cors from "cors";

const pool = new Pool({
  user: "davidbrowne",
  host: "localhost",
  database: "Staple_db",
  port: 5432,
});

const cloud = new Pool({
  connectionString:
    "postgresql://postgres:Snazziey14%3F@db.rclsqexnxrkytorlmqxa.supabase.co:5432/postgres",
  ssl: {
    rejectUnauthorized: false,
  },
});

async function testConnection() {
  try {
    const result = await cloud.query("SELECT NOW()");
    console.log("Connected:", result.rows[0]);
  } catch (err) {
    console.error("DB Error here:", err);
  }
}

testConnection();

const app = express();
app.use(cors());

let todaysWord: DbReturnStructure | null = null;

/*-------- Tests for dev ------*/

//test baseroute
app.get("/", (_, res) => {
  res.status(200).json({ response: "HELLO WORLD" });
});

//test row length for fetches
(async () => {
  const res = await pool.query(
    `SELECT COUNT(*) as column_count FROM information_schema.columns WHERE table_name = 'cards'`,
  );
  console.log(res.rows);
})();

/*----Updates on server refresh ----- */

//update todaysWord on serverRefresh
(async () => {
  const response = await pool.query(
    `SELECT c.*, s.*
    FROM cards c
    JOIN sets s ON c.set_code = s.code WHERE date_selected = CURRENT_DATE LIMIT 1`,
  );
  if (response.rows[0]) {
    const formattedResponse = convertPriceToNumber(response);
    todaysWord = formattedResponse[0];
    console.log(todaysWord);
  }
})();

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

app.listen(3000, () => console.log("Server running on Port 3000"));
