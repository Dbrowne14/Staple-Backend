interface CardFace {
  oracle_text: string;
  image_uris?: { normal: string };
}

export interface ReturnStructure {
  id: string;
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
  oracle_text: string;
}

export interface DbReturnStructure {
  id: number;
  scryfall_id: string;
  name: string;
  cmc: number;
  type: string[];
  islegendary: boolean;
  img: string;
  year: number;
  rarity: string;
  set_code: string;
  set_name: string;
  price: number;
  pips: string[];
  colors: number;
  edhrec_rank: number;
  oracle_text: string;
}

export interface ScryfallData {
  data: ReturnStructure[];
  has_more: boolean;
  next_page?: string;
}

export interface SetStructure {
  code: string;
  name: string;
  uri: string;
  released_at: string;
  set_type: string;
  card_count: number;
  icon_svg_uri: string;
}

export interface ScryFallSets {
  object: string;
  has_more: boolean;
  data: SetStructure[];
}