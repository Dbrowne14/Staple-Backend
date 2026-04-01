import type { ReturnStructure, DbReturnStructure, ScryfallData } from "./types/types";
import { QueryResult } from "pg";

//logic for handling the variable datastructures



const fetchTopCards = async (limit: number) => {
  const baseUrl = "https://api.scryfall.com";
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

type DbCard = Omit<DbReturnStructure, "price"> & {
  price: string;
};

const convertPriceToNumber = (array: QueryResult<DbCard>): DbReturnStructure[]=> {
   return array.rows.map(card => ({
    ...card,
    price: parseFloat(card.price)
   }))
}

function getImg(returnStructure: ReturnStructure) {
  const imageUriDirect = returnStructure?.image_uris?.normal;
  const cardInfo = returnStructure?.card_faces?.[0].image_uris?.normal;
  return imageUriDirect ? imageUriDirect : cardInfo;
}

function handleYear(returnStructure: ReturnStructure) {
  const date = returnStructure["released_at"];
  const year = Number(date.slice(0, 4));
  return year;
}

function handlePrice(returnStucture: ReturnStructure) {
  return Number(returnStucture.prices.usd);
}

function handleTypeLine(returnStructure: ReturnStructure) {
  const typeLine = returnStructure["type_line"].toLowerCase();
  const typesArray = typeLine.split("—")[0].trim().split(" ");
  const acceptedTypes = [
    "creature",
    "sorcery",
    "instant",
    "enchantment",
    "land",
    "artifact",
    "planeswalker",
    "battle",
  ];

  const types = typesArray.filter((type: string) =>
    acceptedTypes.includes(type),
  );

  const isLegendary = typeLine.includes("legendary");

  return {
    type: types,
    legendary: isLegendary,
  };
}

function handlePips(returnStucture: ReturnStructure) {
  const noColor = ["colorless"];
  const hasColor = returnStucture.color_identity;
  return hasColor.length > 0 ? hasColor : noColor;
}

export {handlePips, handlePrice, handleTypeLine, handleYear, getImg, fetchTopCards, convertPriceToNumber}
