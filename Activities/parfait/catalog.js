'use strict';

function withParfaitImage(item) {
  return { ...item, image: 'assets/' + item.id + '.webp' };
}

window.ParfaitCatalog = {
  shops: Array.from('abcdefghij', id => ({ id, name: 'SHOP ' + id.toUpperCase() })),
  ingredients: [
    { id: 'melon', name: 'メロン', english: 'Melons' },
    { id: 'peach', name: 'モモ', english: 'Peaches' },
    { id: 'banana', name: 'バナナ', english: 'Bananas' },
    { id: 'apple', name: 'リンゴ', english: 'Apples' },
    { id: 'pineapple', name: 'パイナップル', english: 'Pineapples' },
    { id: 'cherry', name: 'サクランボ', english: 'Cherries' },
    { id: 'strawberry', name: 'イチゴ', english: 'Strawberries' },
    { id: 'orange', name: 'オレンジ', english: 'Oranges' },
    { id: 'kiwi', name: 'キウイ', english: 'Kiwi fruits' },
    { id: 'ice-cream', name: 'バニラアイス', english: 'Vanilla ice cream', layer: true },
    { id: 'chocolate-ice-cream', name: 'チョコアイス', english: 'Chocolate ice cream', layer: true },
    { id: 'strawberry-ice-cream', name: 'ストロベリーアイス', english: 'Strawberry ice cream', layer: true }
  ].map(withParfaitImage),
  extras: [
    { id: 'cereal', name: 'シリアル', layer: true },
    { id: 'yogurt', name: 'ヨーグルト', layer: true },
    { id: 'whipped-cream', name: 'ホイップクリーム', layer: true },
    { id: 'chocolate-sauce', name: 'チョコソース', sauce: true },
    { id: 'strawberry-sauce', name: 'イチゴソース', sauce: true },
    { id: 'blueberry-sauce', name: 'ブルーベリーソース', sauce: true }
  ].map(withParfaitImage)
};
