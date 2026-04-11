import express, { Request, Response as ExpressResponse } from "express";
import { Pool } from "pg";
import * as cron from "node-cron";
import { updateDatabase, selectTodaysWord, updateSetData } from "./cronCalls";
import { convertPriceToNumber } from "./apiObjectLogic";
import type { DbReturnStructure, ReturnStructure } from "./types/types";
import { fetchTopCards } from "./apiObjectLogic";
import { cardsLimit } from "./data/inputData";
import cors from "cors";
import {
  handlePips,
  handlePrice,
  handleTypeLine,
  handleYear,
  getImg, getOracleText
} from "./apiObjectLogic";

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
  }
})();

/*----------- Routes -------------- */

// route for front-end to get todaysWord
app.get("/todays_word", (_, res) => {
  res.status(200).json(todaysWord);
  console.log(todaysWord)
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
  "0 03 12 * * *",
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

app.get("/cards", async (req: Request, res: ExpressResponse) => {
  const rawData = await fetchTopCards(cardsLimit);

  //predefined object based on structure of the game
  const returnObject = rawData.map((card: ReturnStructure) => ({
    ScryFall_id: card.id,
    Name: card.name,
    CMC: card.cmc,
    Type: handleTypeLine(card),
    Img: getImg(card),
    Year: handleYear(card.released_at),
    Rarity: card.rarity,
    Set: card.set,
    Set_Img: card.image_uris,
    Price: handlePrice(card),
    Pips: handlePips(card),
    Colors: card.color_identity.length,
    Rank: card.edhrec_rank,
    Oracle_Text: getOracleText(card),
  }));

  for (const card of returnObject) {
    const {
      ScryFall_id,
      Name,
      CMC,
      Type: { type, legendary },
      Img,
      Rarity,
      Set,
      Price,
      Pips,
      Colors,
      Rank,
      Oracle_Text,
    } = card;

    await pool.query(
      `INSERT INTO cards(
      scryfall_id, name, cmc, type, islegendary, img, rarity, set_code, price, pips, colors, edhrec_rank, oracle_text
    )
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (name)
    DO UPDATE SET
      scryfall_id = EXCLUDED.scryfall_id,
      cmc = EXCLUDED.cmc,
      type = EXCLUDED.type,
      islegendary = EXCLUDED.islegendary,
      img = EXCLUDED.img,
      rarity = EXCLUDED.rarity,
      set_code = EXCLUDED.set_code,
      price = EXCLUDED.price,
      pips = EXCLUDED.pips,
      colors = EXCLUDED.colors,
      edhrec_rank = EXCLUDED.edhrec_rank,
      oracle_text = EXCLUDED.oracle_text`,
      [
        ScryFall_id,
        Name,
        CMC,
        type,
        legendary,
        Img,
        Rarity,
        Set,
        Price,
        Pips,
        Colors,
        Rank,
        Oracle_Text,
      ],
    );
  }
  res.status(200).json({ returnObject });
});
