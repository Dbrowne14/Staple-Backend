import {
  handlePips,
  handlePrice,
  handleTypeLine,
  handleYear,
  getImg,
  fetchTopCards,
  convertPriceToNumber,
  fetchAllSets, getOracleText
} from "./apiObjectLogic.js";
import { cardsLimit } from "./data/inputData.js";

import type {
  ReturnStructure,
  SetStructure,
  ScryFallSets,
} from "./types/types.js";

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
      `INSERT INTO cards(scryfall_id, name, cmc, type, islegendary, img, rarity, set_code, price, pips, colors, edhrec_rank, oracle_text)
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
};

export const selectTodaysWord = async () => {
  console.log("selecting word");

  const response = await pool.query(
    `SELECT c.*, s.*
    FROM cards c
    JOIN sets s ON c.set_code = s.code WHERE already_selected = FALSE ORDER BY RANDOM() LIMIT 1;`,
  );
  const formattedResponse = convertPriceToNumber(response);
  const randomCard = formattedResponse[0];
  console.log(randomCard);

  const updateCards = await pool.query(
    `
    UPDATE cards SET already_selected = TRUE, date_selected = NOW() WHERE name = $1`,
    [randomCard.name],
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
    const {
      code,
      name,
      uri,
      year,
      releasedAt,
      set_type,
      card_count,
      icon_svg_uri,
    } = set;

    await pool.query(
      `INSERT INTO sets(code, name, uri, year, released_at, set_type, card_count, icon_svg_uri) VALUES($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (code) DO NOTHING`,
      [code, name, uri, year, releasedAt, set_type, card_count, icon_svg_uri],
    );
  }
};

export const shouldRunMonthlyUpdate = async() => {
  const res = await pool.query(`
    SELECT last_run
    FROM meta
    WHERE key = 'monthly_update'
  `);

  const lastRun = res.rows[0]?.last_run;

  if (!lastRun) return true;

  const last = new Date(lastRun);
  const now = new Date();

  // same month + year = already ran
  return (
    last.getMonth() !== now.getMonth() ||
    last.getFullYear() !== now.getFullYear()
  );
}