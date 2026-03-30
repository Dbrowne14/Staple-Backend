import express, { Request, Response as ExpressResponse } from "express";

import {
  handlePips,
  handlePrice,
  handleTypeLine,
  handleYear,
  getImg,
} from "./apiObjectLogic";
import type { ReturnStructure, ScryfallData } from "./types/types";

const app = express();
const baseUrl = "https://api.scryfall.com";
const cardsLimit = 1000;

const fetchTopCards = async (limit: number) => {
  let allCards: ReturnStructure[] = [];
  let url: string | null =
    `${baseUrl}/cards/search?q=game:paper+-t:land&order=edhrec&unique=cards`;

  console.log('Starting Formula')

  while (url && allCards.length < limit) {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(JSON.stringify(errorData));
    }

    const data: ScryfallData = await response.json();
    console.log(data)

    allCards.push(...data.data);

    url = data.has_more ? (data.next_page ?? null) : null;
  }
  return allCards.slice(0, limit);
};

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
