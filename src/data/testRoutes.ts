import express, { Request, Response as ExpressResponse } from "express";
import { ScryFallSets, SetStructure } from "../types/types";
import { fetchAllSets, handleYear } from "../apiObjectLogic";
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
