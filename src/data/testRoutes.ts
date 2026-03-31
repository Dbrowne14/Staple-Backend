import express, { Request, Response as ExpressResponse } from "express";
import { Pool } from "pg";

const app = express();

const pool = new Pool({
  host: "localhost",
  user: "davidbrowne",
  database: "Staple_db",
  port: 5432,
});

app.get("/test", async (_, res) => {
 try { const response = await pool.query(
    `SELECT * FROM cards WHERE already_selected = FALSE ORDER BY RANDOM() LIMIT 1;`
  );

  const randomCard = response.rows[0];

  res.status(200).json(randomCard)

  const updateCards = await pool.query(`
    UPDATE cards SET already_selected = TRUE, date_selected = NOW() WHERE scryfall_id = $1`, [randomCard.scryfall_id])

} catch (err) {
    res.status(500).json({error: err})
}

});
