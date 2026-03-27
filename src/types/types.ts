interface CardFace {
  image_uris?: { normal: string };
}

export interface ReturnStructure {
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
  edhrec_rank: number
}