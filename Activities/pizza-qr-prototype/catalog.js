'use strict';

window.PizzaCatalog = {
  shops: Array.from('abcdefghij', id => ({ id, name: 'SHOP ' + id.toUpperCase() })),
  ingredients: [
    { id: 'onion', name: 'タマネギ', english: 'Onions' },
    { id: 'mushroom', name: 'マッシュルーム', english: 'Mushrooms' },
    { id: 'green-pepper', name: 'ピーマン', english: 'Green peppers' },
    { id: 'tomato', name: 'トマト', english: 'Tomatoes' },
    { id: 'cabbage', name: 'キャベツ', english: 'Cabbage', image: 'assets/cabbage.webp?v=4' },
    { id: 'corn', name: 'コーン', english: 'Corn' },
    { id: 'carrot', name: 'ニンジン', english: 'Carrots' },
    { id: 'cucumber', name: 'キュウリ', english: 'Cucumbers' },
    { id: 'potato', name: 'ジャガイモ', english: 'Potatoes' },
    { id: 'sausage', name: 'ソーセージ', english: 'Sausages' },
    { id: 'bacon', name: 'ベーコン', english: 'Bacon', image: 'assets/bacon.webp?v=6' },
    { id: 'shrimp', name: 'エビ', english: 'Shrimp' }
  ].map(ingredient => ({ image: 'assets/' + ingredient.id + '.webp', ...ingredient }))
};
