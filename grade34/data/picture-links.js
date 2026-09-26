/* Image-only links: vocabulary IDs, wording, Basic/Advance selection stay intact. */
(() => {
  const data = window.DEKIRU_DATA;
  const additions = "../image_output/lets_try/";
  const files = {
    what: "what.png", // Unit 5 question-word picture.
    noodle: "noodle.png", jam: "jam.png", king: "king-flat.png", queen: "queen-flat.png",
    sun: "sun-flat.png", balloon: "balloon-flat.png", shiny: "shiny-flat.png", scary: "scary-flat.png", round: "round-flat.png", furry: "furry-flat.png",
    world: "world-flat.png", shorts: "shorts-flat.png", bingo: "bingo-flat.png", game: "game-flat.png", outside: "outside-flat.png", inside: "inside-flat.png", around: "around-flat.png", fresh: "fresh-flat.png",
    time: "time-flat.png", "a.m.": "am-flat.png", "p.m.": "pm-flat.png", snack: "snack-flat.png", dream: "dream-flat.png", magnet: "magnet-flat.png",
    "science room": "science-room-flat.png", "arts and crafts room": "arts-and-crafts-room-flat.png", "cooking room": "cooking-room-flat.png",
    "wash my face": "wash-my-face-flat.png", "put away my futon": "put-away-my-futon-flat.png", "check my school bag": "check-my-school-bag-flat.png", "leave my house": "leave-my-house-flat.png",
  };
  const reuse = {
    "glue stick": "stationery_008", "wake-up": "daily_002", "wake up": "daily_002",
    homework: "daily_016", yummy: "taste_006", vegetable: "fruit_vegetable_000",
    shop: "town_034", day: "day_001", today: "date_001",
    stand: "action6_044", sit: "action6_042", put: "action6_041", boots: "clothes_018",
    book: "item_026", bath: "item_061", clock: "item_036", calendar: "item_029", telephone: "item_038",
    try: "action6_047", you: "person_002", up: "direction_007", favorite: "impression_011",
  };
  const cards = new Map(data.cards.map(card => [card.id, card]));
  for (const item of [...data.cards, ...data.expressions]) {
    if (files[item.english]) item.pictureUrl = additions + files[item.english];
    else if (reuse[item.english] && !item.image) item.cardId = reuse[item.english];
    if (/^大文字[A-Z]$/.test(item.japanese)) item.pictureUrl = additions + `alphabet/upper-${item.english}.png`;
    if (/^小文字[a-z]$/.test(item.japanese)) item.pictureUrl = additions + `alphabet/lower-${item.english}.png`;
  }
  // Category illustrations exist in the original dictionary image folder.
  for (const id of ["weather_000", "school_000"]) {
    const card = cards.get(id);
    if (card) card.pictureUrl = "../image_output/" + card.image.replace("assets/cards/", "");
  }
  data.letsTryPictureFiles = files;
  data.letsTryPictureReuse = reuse;
})();
