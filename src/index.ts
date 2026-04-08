import express, { Request, Response as ExpressResponse } from "express";
import { Pool } from "pg";
import * as cron from "node-cron";
import { updateDatabase, selectTodaysWord, updateSetData } from "./cronCalls";
import { convertPriceToNumber } from "./apiObjectLogic";
import type {
  DbReturnStructure,
  ScryFallSets,
  SetStructure,
} from "./types/types";
import { fetchAllSets } from "./apiObjectLogic";
import { handleYear } from "./apiObjectLogic";

import cors from "cors";

const pool = new Pool({
  user: "davidbrowne",
  host: "localhost",
  database: "Staple_db",
  port: 5432,
});

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
    const formattedResponse = convertPriceToNumber(response);
    todaysWord = formattedResponse[0];
    console.log(todaysWord);
  }
})();

/*----------- Routes -------------- */

// route for front-end to get todaysWord
app.get("/todays_word", (_, res) => {
  res.status(200).json(todaysWord);
});

//Get all cards
app.get("/allCards", async (_, res: ExpressResponse) => {
  try {
    const response = await pool.query(`SELECT * FROM cards`);
    const normalizedCards = convertPriceToNumber(response);
    res.status(200).json(normalizedCards);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

/*--------- Cron Calls ------------ */

//daily cron call to select word
cron.schedule(
  "0 53 14 * * *",
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

app.get("/sets", async (req: Request, res: ExpressResponse) => {
  const setData: ScryFallSets = await fetchAllSets();
  if (!setData) {
    return res.status(501).json({ error: "fetchError" });
  }
  const allowedTypes = [
    "core",
    "expansion",
    "commander",
    "masters",
    "draft_innovation",
    "box",
    "eternal",
    "planechase",
    "funny",
    "duel_deck",
  ];
  const setFiltered: SetStructure[] = setData.data.filter((set) =>
    allowedTypes.includes(set.set_type),
  );
  const mappedSet = setFiltered.map((set) => ({
    code: set.code,
    name: set.name,
    uri: set.uri,
    year: handleYear(set.released_at),
    releasedAt: set.released_at,
    set_type: set.set_type,
    card_count: set.card_count,
    icon_svg_uri: set.icon_svg_uri,
  }));

  for (const set of mappedSet) {
    const {
      code,

      year,
    } = set;

    await pool.query(
      `INSERT INTO sets(code, year)
   VALUES ($1, $2)
   ON CONFLICT (code)
   DO UPDATE SET year = EXCLUDED.year`,
      [code, year],
    );
  }

  res.status(201).json(mappedSet);
});
