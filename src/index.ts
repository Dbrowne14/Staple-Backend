import express, { Request, Response as ExpressResponse } from "express";
import { Pool } from "pg";
import { cardsLimit } from "./data/inputData";
import * as cron from "node-cron";
import { updateDatabase, selectTodaysWord } from "./cronCalls";
import type { ReturnStructure } from "./types/types";
import cors from "cors";

const pool = new Pool({
  user: "davidbrowne",
  host: "localhost",
  database: "Staple_db",
  port: 5432,
});

const app = express();
app.use(cors());

let todaysWord = "Sol Ring";

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

//test for daily content grab
app.get("/test", async (_: Request, res: ExpressResponse) => {
  try {
    const response = await pool.query(
      `SELECT * FROM cards WHERE already_selected = FALSE ORDER BY RANDOM() LIMIT 1;`,
    );

    const randomCard = response.rows[0];
    console.log(randomCard);
    res.status(200).json(randomCard);

    const updateCards = await pool.query(
      `
    UPDATE cards SET already_selected = TRUE, date_selected = NOW() WHERE scryfall_id = $1`,
      [randomCard.scryfall_id],
    );
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

/*----Updates on server refresh ----- */

//update todaysWord on serverRefresh
(async () => {
  const response = await pool.query(
    "SELECT * FROM cards WHERE date_selected = CURRENT_DATE LIMIT 1",
  );
  if (response.rows[0]) {
    todaysWord = response.rows[0];
  }
})();

/*----------- Routes -------------- */

// route for front-end to get todaysWord
app.get("/todays_word", (_, res) => {
  res.status(200).json(todaysWord);
});

// Search for card
app.get("/cards", async (req: Request, res: ExpressResponse) => {
  const searchQuery = req.query.search as string;

  try {
    const response = await pool.query(
      `SELECT * FROM cards WHERE name = $1`,[searchQuery]
    )

    res.status(200).json(response.rows)

  } catch (err) {
    res.status(500).json({ error: err });
  }
});

//Get all cards 
app.get("/allCards", async (_, res: ExpressResponse)=> {
  try {
    const response = await pool.query(`SELECT * FROM cards`)
    res.status(200).json(response.rows)
  } catch(err) {
    res.status(500).json({error:err})
  }
})

/*--------- Cron Calls ------------ */

//run cron call for weekly data update runs every Sunday
cron.schedule(
  "0 0 0 * * 0",
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

//daily cron call to select word
cron.schedule(
  "0 53 15 * * *",
  async () => {
    try {
      const wordStructure = await selectTodaysWord();
      todaysWord = wordStructure.name;
      console.log(todaysWord);
    } catch (err) {
      console.error("Failed to select random card", err);
    }
  },
  {
    timezone: "Europe/London",
  },
);

app.listen(3000, () => console.log("Server running on Port 3000"));
