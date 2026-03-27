import express, { Request, Response } from "express";
import {
  handlePips,
  handlePrice,
  handleTypeLine,
  handleYear,
  getImg,
} from "./jsonProcess";
import type { ReturnStructure } from "./jsonProcess";

console.log("Starting server...");
const app = express();
const baseUrl = "https://api.scryfall.com";
const cardsLimit = 1000;

app.get("/cards/search", async (req: Request, res: Response) => {
  if (!req.query) {
    return res.status(400).json({ error: "invalid search" });
  }

  try {
    const response = await fetch(
      `${baseUrl}/cards/search?q=game:paper+-t:land&order=edhrec&unique=cards`,
    );
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Scryfall error:", errorData);
      return res.status(400).json(errorData);
    }

    const data = await response.json();

    const returnObject = data.data.map((card: ReturnStructure) => ({
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
      Rank: card.edhrec_rank
    }));

    res.json(returnObject);
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Internal server error", details: err });
  }
});

app.get("/cards/named", async (req: Request, res: Response) => {
  const search = req.query.exact as string;

  if (!search || typeof search !== "string") {
    return res
      .status(400)
      .json({ error: "Missing or invalid 'fuzzy' query parameter" });
  }
  try {
    const response = await fetch(
      `${baseUrl}/cards/named?exact=${encodeURIComponent(search)}`,
    );
    if (!response.ok) {
      return res.status(400).json({ error: "Scryfall API error" });
    }

    const data = await response.json();
    const returnObject = {
      Name: data.name,
      CMC: data.cmc,
      Type: handleTypeLine(data),
      Img: getImg(data),
      Year: handleYear(data),
      Rarity: data.rarity,
      Set: {
        set: data.set,
        setName: data.set_name,
      },
      Price: handlePrice(data),
      Pips: handlePips(data),
      Colors: data.color_identity.length,
    };

    res.json(returnObject);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error", details: err });
  }
});

app.listen(3000, () => console.log("Server running on Port 3000"));
console.log("Hello");
