import express, { Request, Response } from "express";
import { returnObject } from "./jsonProcess";

console.log("Starting server...");
const cardName = "last+march+of+the+ents";
const app = express();
const baseUrl = "https://api.scryfall.com";

app.get("/", (_: Request, res: Response) => {
  res.send("Hello World");
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
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error", details: err });
  }
});

app.listen(3000, () => console.log("Server running on Port 3000"));
console.log("Hello")
console.log(returnObject)