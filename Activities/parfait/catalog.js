'use strict';

function withParfaitImage(item) {
  return { image: 'assets/' + item.id + '.webp', ...item };
}

function shopGroup(id, name, english, items) {
  return {
    id,
    name,
    english,
    shops: Array.from('abcdef', letter => ({ id: letter, name: english + ' ' + letter.toUpperCase() })),
    items
  };
}

const fruitRecipes = [
  { id: 'melon', name: 'メロン', english: 'Melons', flavor: 'Melon' },
  { id: 'peach', name: '白桃', english: 'Peaches', flavor: 'Peach', image: 'assets/peach.webp?v=6' },
  { id: 'banana', name: 'バナナ', english: 'Bananas', flavor: 'Banana' },
  { id: 'apple', name: 'リンゴ', english: 'Apples', flavor: 'Apple' },
  { id: 'pineapple', name: 'パイナップル', english: 'Pineapples', flavor: 'Pineapple' },
  { id: 'cherry', name: 'サクランボ', english: 'Cherries', flavor: 'Cherry' },
  { id: 'strawberry', name: 'イチゴ', english: 'Strawberries', flavor: 'Strawberry', image: 'assets/strawberry.webp?v=2' },
  { id: 'orange', name: 'オレンジ', english: 'Oranges', flavor: 'Orange' },
  { id: 'kiwi', name: 'キウイ', english: 'Kiwi fruits', flavor: 'Kiwi', image: 'assets/kiwi.webp?v=2' },
  { id: 'mango', name: 'マンゴー', english: 'Mangoes', flavor: 'Mango' },
  { id: 'persimmon', name: 'カキ', english: 'Persimmons', flavor: 'Persimmon' },
  { id: 'pear', name: '洋ナシ', english: 'Pears', flavor: 'Pear' }
];

const fruitShopItems = fruitRecipes.map(({ flavor, ...item }) => withParfaitImage(item));
const jellyShopItems = fruitRecipes.map(({ id, name, flavor }) => withParfaitImage({
  id: id + '-jelly', name: name + 'ゼリー', english: flavor + ' jelly', layer: true, jelly: true,
  texture: 'assets/' + id + '-jelly-layer.webp?v=8'
}));

const iceScoopItems = [
  { id: 'ice-cream', name: 'バニラアイス', english: 'Vanilla ice cream' },
  { id: 'chocolate-ice-cream', name: 'チョコアイス', english: 'Chocolate ice cream' },
  { id: 'strawberry-ice-cream', name: 'ストロベリーアイス', english: 'Strawberry ice cream' },
  { id: 'caramel-ice-cream', name: 'キャラメルアイス', english: 'Caramel ice cream', layerColors: ['#e7b37e', '#b87850'] },
  { id: 'cookies-and-cream-ice-cream', name: 'クッキー＆クリーム', english: 'Cookies and cream ice cream', layerColors: ['#f6e9dd', '#d8c5b4'], crumb: '#70513f' },
  { id: 'matcha-ice-cream', name: '抹茶アイス', english: 'Matcha ice cream', layerColors: ['#aeb77f', '#7a8c53'] },
  { id: 'mango-sorbet', name: 'マンゴーシャーベット', english: 'Mango sorbet', layerColors: ['#ffd380', '#efa93f'] },
  { id: 'melon-sorbet', name: 'メロンシャーベット', english: 'Melon sorbet', layerColors: ['#d4e9a7', '#a7c472'] },
  { id: 'banana-ice-cream', name: 'バナナアイス', english: 'Banana ice cream', layerColors: ['#f8e8b4', '#d6bd78'] }
].map(item => withParfaitImage({ ...item, layer: true, scoop: true }));

const iceShopItems = [
  ...iceScoopItems,
  ...[
    { id: 'whipped-cream', name: 'ホイップクリーム', english: 'Whipped cream', layer: true },
    { id: 'chocolate-sprinkles', name: 'チョコスプレー', english: 'Chocolate sprinkles', quantity: '1つ', sauce: true },
    { id: 'nuts', name: 'ナッツ', english: 'Nuts', quantity: '1つ' }
  ].map(withParfaitImage)
];

window.ParfaitCatalog = {
  // Keep the previous printed A–J cards valid.
  shops: Array.from('abcdefghij', id => ({ id, name: 'SHOP ' + id.toUpperCase() })),
  ingredients: [...fruitShopItems.slice(0, 9), ...iceScoopItems.slice(0, 3)],
  shopGroups: [
    shopGroup('fruit', 'フルーツ屋さん', 'FRUIT SHOP', fruitShopItems),
    shopGroup('jelly', 'ゼリー屋さん', 'JELLY SHOP', jellyShopItems),
    shopGroup('ice', 'アイス屋さん', 'ICE CREAM SHOP', iceShopItems)
  ],
  teacherItems: [
    { id: 'whole-strawberry', name: '丸ごとのイチゴ', english: 'Whole strawberry', quantity: '1つ' },
    { id: 'diagonal-banana', name: '斜め切りのバナナ', english: 'Banana slice' },
    { id: 'sliced-melon', name: 'スライスしたメロン', english: 'Melon slice', image: 'assets/sliced-melon.webp?v=9' },
    { id: 'cereal', name: 'シリアル', english: 'Cereal', layer: true, texture: 'assets/cereal-texture.webp?v=3' }
  ].map(withParfaitImage),
  extras: [
    ...fruitRecipes.map(({ id, name }) => ({ id: id + '-sauce', name: name + 'ソース', sauce: true })),
    { id: 'chocolate-sauce', name: 'チョコソース', sauce: true }
  ].map(withParfaitImage),
  legacyExtras: [
    { id: 'yogurt', name: 'ヨーグルト', layer: true },
    { id: 'blueberry-sauce', name: 'ブルーベリーソース', sauce: true }
  ].map(withParfaitImage)
};
