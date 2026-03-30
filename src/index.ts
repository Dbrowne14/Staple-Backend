import express, { Request, Response as ExpressResponse } from "express";
import { Pool } from "pg";
import {
  handlePips,
  handlePrice,
  handleTypeLine,
  handleYear,
  getImg,
  fetchTopCards,
} from "./apiObjectLogic";
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
const cardsLimit = 1000;

//get request for the dataset
app.get("/cards/search", async (req: Request, res: ExpressResponse) => {
  if (!req.query) {
    return res.status(400).json({ error: "invalid search" });
  }

  try {
    const rawData = await fetchTopCards(cardsLimit);

    //predefined object based on structure of the game
    const returnObject = rawData.map((card: ReturnStructure) => ({
      ScryFall_id: card.id,
      Name: card.name,
      CMC: card.cmc,
      Type: handleTypeLine(card),
      Img: getImg(card),
      Year: handleYear(card),
      Rarity: card.rarity,
      Set: {
        set: card.set,
        setName: card.set_name,
      },
      Price: handlePrice(card),
      Pips: handlePips(card),
      Colors: card.color_identity.length,
      Rank: card.edhrec_rank,
    }));
    
    for (const card of returnObject) {
      const {
        ScryFall_id,
        Name,
        CMC,
        Type: { type, legendary },
        Img,
        Year,
        Rarity,
        Set: { set, setName },
        Price,
        Pips,
        Colors,
        Rank,
      } = card;

      await pool.query(
        `INSERT INTO cards(scryfall_id, name, cmc, type, islegendary, img, year, rarity, set_code, set_name, price, pips, colors, edhrec_rank)
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) ON CONFLICT (scryfall_id) DO NOTHING`,
        [
          ScryFall_id,
          Name,
          CMC,
          type,
          legendary,
          Img,
          Year,
          Rarity,
          set,
          setName,
          Price,
          Pips,
          Colors,
          Rank,
        ],
      );
    }

    res.json(returnObject);
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Internal server error", details: err });
  }
});

app.listen(3000, () => console.log("Server running on Port 3000"));
