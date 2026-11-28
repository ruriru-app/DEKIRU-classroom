'use strict';

function withParfaitImage(item) {
  return { image: 'assets/' + item.id + '.webp', ...item };
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
    { id: 'strawberry', name: 'イチゴ', english: 'Strawberries', image: 'assets/strawberry.webp?v=2' },
    { id: 'orange', name: 'オレンジ', english: 'Oranges' },
    { id: 'kiwi', name: 'キウイ', english: 'Kiwi fruits', image: 'assets/kiwi.webp?v=2' },
    { id: 'ice-cream', name: 'バニラアイス', english: 'Vanilla ice cream', layer: true },
    { id: 'chocolate-ice-cream', name: 'チョコアイス', english: 'Chocolate ice cream', layer: true },
    { id: 'strawberry-ice-cream', name: 'ストロベリーアイス', english: 'Strawberry ice cream', layer: true }
  ].map(withParfaitImage),
  teacherItems: [
    { id: 'whole-strawberry', name: '丸ごとのイチゴ', english: 'Whole strawberry', quantity: '1つ' },
    { id: 'diagonal-banana', name: '斜め切りのバナナ', english: 'Banana slice' },
    { id: 'sliced-melon', name: 'スライスしたメロン', english: 'Melon slice' },
    { id: 'cereal', name: 'シリアル', english: 'Cereal', layer: true, texture: 'assets/cereal-texture.webp?v=3' }
  ].map(withParfaitImage),
  extras: [
    { id: 'yogurt', name: 'ヨーグルト', layer: true },
    { id: 'whipped-cream', name: 'ホイップクリーム', layer: true },
    { id: 'chocolate-sauce', name: 'チョコソース', sauce: true },
    { id: 'strawberry-sauce', name: 'イチゴソース', sauce: true },
    { id: 'blueberry-sauce', name: 'ブルーベリーソース', sauce: true }
  ].map(withParfaitImage)
};
