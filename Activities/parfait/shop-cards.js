'use strict';

const { shops, ingredients } = window.ParfaitCatalog;
const sheets = document.querySelector('#sheets');
const sheetTemplate = document.querySelector('#sheet-template');
const cardTemplate = document.querySelector('#card-template');
const cardsPerPage = 6;

function shopCard(shop, ingredient) {
  const card = cardTemplate.content.cloneNode(true);
  card.querySelector('.card-shop').textContent = `MY PARFAIT · ${shop.name}`;
  card.querySelector('.card-title').textContent = ingredient.english;
  card.querySelector('.card-name').textContent = ingredient.name;
  card.querySelector('.card-ingredient').src = ingredient.image;
  const qr = card.querySelector('.card-qr');
  qr.alt = `${shop.name}・${ingredient.name}のQRコード`;
  qr.src = `shop-codes/${shop.id}-${ingredient.id}.svg`;
  return card;
}

const sheetsPerShop = Math.ceil(ingredients.length / cardsPerPage);
for (const shop of shops) {
  for (let index = 0; index < sheetsPerShop; index++) {
    const page = sheetTemplate.content.cloneNode(true);
    page.querySelector('.shop-name').textContent = shop.name;
    page.querySelector('.sheet-number').textContent = `${index + 1} / ${sheetsPerShop} 枚目`;
    const start = index * cardsPerPage;
    const cards = ingredients.slice(start, start + cardsPerPage).map(ingredient => shopCard(shop, ingredient));
    page.querySelector('.cards').append(...cards);
    sheets.append(page);
  }
}

document.querySelector('#print').addEventListener('click', () => window.print());
