import { dummyData } from "./dummyData";

interface CardFace {
  image_uris?: { normal: string };
}

interface ReturnStructure {
  name: string;
  cmc: number;
  type_line: string;
  card_faces?: CardFace[];
  released_at: string;
  rarity: string;
  set: string;
  set_name: string;
  prices: {
    usd: string;
  };
  color_identity: string[];
  image_uris?: { normal: string };
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

export {handlePips, handlePrice, handleTypeLine, handleYear, getImg}
