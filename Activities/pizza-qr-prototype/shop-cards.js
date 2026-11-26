'use strict';

const { shops, ingredients } = window.PizzaCatalog;
const sheets = document.querySelector('#sheets');
const cardsPerPage = 6;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function shopCard(shop, ingredient) {
  const card = element('article', 'shop-card');
  const label = element('div');
  const english = element('h3', 'card-title', ingredient.english);
  english.lang = 'en';
  label.append(english, element('p', 'card-name', ingredient.name));

  const images = element('div', 'card-images');
  const food = element('img', 'card-ingredient');
  food.alt = '';
  food.src = ingredient.image;
  const qr = element('img', 'card-qr');
  qr.alt = `${shop.name}・${ingredient.name}のQRコード`;
  qr.src = `shop-codes/${shop.id}-${ingredient.id}.svg`;
  images.append(food, qr);

  card.append(element('p', 'card-shop', shop.name), label, images);
  return card;
}

function shopPage(shop, pageIngredients, number, count) {
  const page = element('section', 'shop-page');
  const heading = element('header', 'shop-heading');
  const name = element('h2', '', shop.name);
  name.append(element('span', 'sheet-number', `${number} / ${count} 枚目`));
  const prompt = element('p', '', 'What do you want?');
  prompt.lang = 'en';
  heading.append(name, prompt);
  const cards = element('div', 'cards');
  cards.append(...pageIngredients.map(ingredient => shopCard(shop, ingredient)));
  page.append(heading, cards);
  return page;
}

const pageCount = Math.ceil(ingredients.length / cardsPerPage);
for (const shop of shops) {
  for (let index = 0; index < pageCount; index++) {
    const start = index * cardsPerPage;
    const pageIngredients = ingredients.slice(start, start + cardsPerPage);
    sheets.append(shopPage(shop, pageIngredients, index + 1, pageCount));
  }
}

document.querySelector('#print').addEventListener('click', () => window.print());
