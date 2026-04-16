import express, { Request, Response as ExpressResponse } from "express";
import { ScryFallSets, SetStructure, ReturnStructure } from "../types/types";
import { fetchAllSets, handleYear, fetchTopCards, handlePips, handlePrice, handleTypeLine, getImg, getOracleText } from "../apiObjectLogic";
import { cardsLimit } from "./inputData";
import { Pool } from "pg";

const app = express();

const pool = new Pool({
  host: "localhost",
  user: "davidbrowne",
  database: "Staple_db",
  port: 5432,
});

app.get("/", (_, res) => {
  res.status(200).json({ response: "HELLO WORLD" });
});

app.get("/test", async (_: Request, res: ExpressResponse) => {
  try {
    const response = await pool.query(
      `SELECT * FROM cards WHERE already_selected = FALSE ORDER BY RANDOM() LIMIT 1;`,
    );

    const randomCard = response.rows[0];

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

  res.status(201).json(mappedSet);
});

//test for getting all cards
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
