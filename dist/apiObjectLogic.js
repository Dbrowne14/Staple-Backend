//logic for handling the variable datastructures
const baseUrl = "https://api.scryfall.com";
const fetchTopCards = async (limit) => {
    let allCards = [];
    let url = `${baseUrl}/cards/search?q=game:paper+-t:land&order=edhrec&unique=cards`;
    console.log("Starting Formula");
    while (url && allCards.length < limit) {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(JSON.stringify(errorData));
        }
        const data = await response.json();
        console.log(data);
        allCards.push(...data.data);
        url = data.has_more ? (data.next_page ?? null) : null;
    }
    return allCards.slice(0, limit);
};
export const fetchAllSets = async () => {
    const response = await fetch(`${baseUrl}/sets`);
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData));
    }
    const setData = await response.json();
    return setData;
};
const convertPriceToNumber = (array) => {
    return array.rows.map((card) => ({
        ...card,
        price: parseFloat(card.price),
    }));
};
function getImg(returnStructure) {
    const imageUriDirect = returnStructure?.image_uris?.normal;
    const cardInfo = returnStructure?.card_faces?.[0].image_uris?.normal;
    return imageUriDirect ? imageUriDirect : cardInfo;
}
function getOracleText(returnStucture) {
    const directOracleText = returnStucture?.oracle_text;
    const doubleSided = `DOUBLE-SIDED ${returnStucture?.card_faces?.[0]?.oracle_text ?? ""}`;
    return directOracleText ? directOracleText : doubleSided;
}
function handleYear(date) {
    const year = Number(date.slice(0, 4));
    return year;
}
function handlePrice(returnStucture) {
    return Number(returnStucture.prices.usd);
}
function handleTypeLine(returnStructure) {
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
    const types = typesArray.filter((type) => acceptedTypes.includes(type));
    const isLegendary = typeLine.includes("legendary");
    return {
        type: types,
        legendary: isLegendary,
    };
}
function handlePips(returnStucture) {
    const noColor = ["colorless"];
    const hasColor = returnStucture.color_identity;
    return hasColor.length > 0 ? hasColor : noColor;
}
export { handlePips, handlePrice, handleTypeLine, handleYear, getImg, fetchTopCards, convertPriceToNumber, getOracleText, };
