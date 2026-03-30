import express, { Request, Response as ExpressResponse } from "express";

import {
  handlePips,
  handlePrice,
  handleTypeLine,
  handleYear,
  getImg,
  fetchTopCards
} from "./apiObjectLogic";
import type { ReturnStructure } from "./types/types";

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

    res.json(returnObject);
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Internal server error", details: err });
  }
});

app.listen(3000, () => console.log("Server running on Port 3000"));
