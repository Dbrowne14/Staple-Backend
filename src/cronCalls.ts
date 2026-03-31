import {
  handlePips,
  handlePrice,
  handleTypeLine,
  handleYear,
  getImg,
  fetchTopCards,
} from "./apiObjectLogic";
import { cardsLimit } from "./data/inputData";

import type { ReturnStructure } from "./types/types";

import { Pool } from "pg";

const pool = new Pool({
  user: "davidbrowne",
  host: "localhost",
  database: "Staple_db",
  port: 5432,
});

export const updateDatabase = async () => {
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
};

export const selectTodaysWord = async () => {
  console.log("selecting word");

  const response = await pool.query(
    `SELECT * FROM cards WHERE already_selected = FALSE ORDER BY RANDOM() LIMIT 1;`,
  );

  const randomCard = response.rows[0];
  console.log(randomCard);

  const updateCards = await pool.query(
    `
    UPDATE cards SET already_selected = TRUE, date_selected = NOW() WHERE scryfall_id = $1`,
    [randomCard.scryfall_id],
  );

  return randomCard
};
