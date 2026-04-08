import {
  handlePips,
  handlePrice,
  handleTypeLine,
  handleYear,
  getImg,
  fetchTopCards,
  convertPriceToNumber, fetchAllSets
} from "./apiObjectLogic";
import { cardsLimit } from "./data/inputData";

import type { ReturnStructure, SetStructure,ScryFallSets } from "./types/types";

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
    Year: handleYear(card.released_at),
    Rarity: card.rarity,
    Set: card.set,
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
      Set,
      Price,
      Pips,
      Colors,
      Rank,
    } = card;

    await pool.query(
      `INSERT INTO cards(scryfall_id, name, cmc, type, islegendary, img, year, rarity, set_code, price, pips, colors, edhrec_rank)
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
        Set,
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
  const formattedResponse = convertPriceToNumber(response);
  const randomCard = formattedResponse[0];
  console.log(randomCard);

  const updateCards = await pool.query(
    `
    UPDATE cards SET already_selected = TRUE, date_selected = NOW() WHERE scryfall_id = $1`,
    [randomCard.scryfall_id],
  );

  return randomCard;
};

export const updateSetData = async () => {
  const setData: ScryFallSets = await fetchAllSets();
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
    const { code, name, uri, year, releasedAt, set_type, card_count, icon_svg_uri } =
      set;

    await pool.query(
      `INSERT INTO sets(code, name, uri, year, released_at, set_type, card_count, icon_svg_uri) VALUES($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (code) DO NOTHING`,
      [code, name, uri, year, releasedAt, set_type, card_count, icon_svg_uri],
    );
  }
};
