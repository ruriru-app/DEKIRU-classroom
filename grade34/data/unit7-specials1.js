/* Picture vocabulary for Let's Try! 2 Unit 7, based on the MY PARFAIT shops. */
(() => {
  "use strict";

  const data = window.DEKIRU_DATA;
  const parfait = window.ParfaitCatalog;
  if (!data || !parfait) return;

  const category = "unit7-specials1";
  const products = [
    ...parfait.shopGroups.flatMap((group) => group.items),
    ...parfait.teacherItems.filter((item) => item.id === "cereal"),
  ];
  const registered = new Set(data.cards.map((card) => card.id));
  for (const product of products) {
    const id = category + "-" + product.id;
    if (registered.has(id)) continue;
    data.cards.push({
      id,
      english: product.english,
      japanese: product.name,
      speech: product.english,
      category,
      image: "Activities/parfait/" + product.image,
      displayGroup: "special",
    });
    registered.add(id);
  }

  data.categoryLabels[category] = "Unit7Specials１";
  (data.unitSpecialCategories ||= {})["lt2-7"] = [category];
})();
