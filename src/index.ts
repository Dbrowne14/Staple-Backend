import express, { Request, Response as ExpressResponse } from "express";
import { Pool } from "pg";
import { cardsLimit } from "./data/inputData";
import * as cron from "node-cron"
import { updateDatabase } from "./cronCalls";

import type { ReturnStructure } from "./types/types";

const pool = new Pool({
  user: "davidbrowne",
  host: "localhost",
  database: "Staple_db",
  port: 5432,
});

const app = express();


(async () => {
  const res = await pool.query(
    `SELECT COUNT(*) as column_count FROM information_schema.columns WHERE table_name = 'cards'`,
  );
  console.log(res.rows);
})();

//test routes
app.get("/", (_, res) => {
    res.status(200).json({response: "HELLO WORLD"})
})


//test for daily content grab
app.get("/test", async (_: Request, res: ExpressResponse) => {
 try { const response = await pool.query(
    `SELECT * FROM cards WHERE already_selected = FALSE ORDER BY RANDOM() LIMIT 1;`
  );

  const randomCard = response.rows[0];
  console.log(randomCard)
  res.status(200).json(randomCard)

  const updateCards = await pool.query(`
    UPDATE cards SET already_selected = TRUE, date_selected = NOW() WHERE scryfall_id = $1`, [randomCard.scryfall_id])

} catch (err) {
    res.status(500).json({error: err})
}

});


//run cron call for weekly data update runs every Sunday
cron.schedule("0 0 0 * * 0", async () => {
  try {
    console.log("Starting weekly db update");
    await updateDatabase();
  } catch (err) {
    console.error("Failed to update cards:", err);
  }
}, {
  timezone: "Europe/London"
});

app.listen(3000, () => console.log("Server running on Port 3000"));
