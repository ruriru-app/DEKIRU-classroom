'use strict';

window.PizzaCatalog = {
  shops: ['a', 'b', 'c', 'd'].map(id => ({ id, name: 'SHOP ' + id.toUpperCase() })),
  ingredients: [
    { id: 'onion', name: 'タマネギ', english: 'Onions' },
    { id: 'mushroom', name: 'マッシュルーム', english: 'Mushrooms' },
    { id: 'green-pepper', name: 'ピーマン', english: 'Green peppers' },
    { id: 'tomato', name: 'トマト', english: 'Tomatoes' },
    { id: 'cabbage', name: 'キャベツ', english: 'Cabbage' },
    { id: 'corn', name: 'コーン', english: 'Corn' },
    { id: 'carrot', name: 'ニンジン', english: 'Carrots' },
    { id: 'cucumber', name: 'キュウリ', english: 'Cucumbers' },
    { id: 'potato', name: 'ジャガイモ', english: 'Potatoes' },
    { id: 'sausage', name: 'ソーセージ', english: 'Sausages' },
    { id: 'bacon', name: 'ベーコン', english: 'Bacon' }
  ].map(ingredient => ({ ...ingredient, image: 'assets/' + ingredient.id + '.webp' }))
};
