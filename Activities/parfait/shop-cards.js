'use strict';

const { shopGroups } = window.ParfaitCatalog;
const requestedGroup = new URLSearchParams(window.location.search).get('group');
const activeGroup = shopGroups.find(group => group.id === requestedGroup) ?? shopGroups[0];
const sheets = document.querySelector('#sheets');
const sheetTemplate = document.querySelector('#sheet-template');
const cardTemplate = document.querySelector('#card-template');
const cardsPerPage = 6;

function shopCard(group, shop, ingredient) {
  const card = cardTemplate.content.cloneNode(true);
  card.querySelector('.card-shop').textContent = `MY PARFAIT · ${shop.name}`;
  card.querySelector('.card-title').textContent = ingredient.english;
  card.querySelector('.card-name').textContent = ingredient.name;
  card.querySelector('.card-ingredient').src = ingredient.image;
  const qr = card.querySelector('.card-qr');
  qr.alt = `${shop.name}・${ingredient.name}のQRコード`;
  qr.src = `shop-codes/v2/${group.id}/${shop.id}-${ingredient.id}.svg`;
  return card;
}

const groupNav = document.querySelector('.shop-groups');
for (const group of shopGroups) {
  const link = document.createElement('a');
  link.href = `?group=${group.id}`;
  link.textContent = group.name;
  if (group === activeGroup) link.setAttribute('aria-current', 'page');
  groupNav.append(link);
}

const { id, name, shops, items } = activeGroup;
const sheetsPerShop = Math.ceil(items.length / cardsPerPage);
document.title = `MY PARFAIT ${name} お店用カード | DEKIRU`;
document.querySelector('#group-description').textContent = `${name}はA〜Fの6店舗です。各店舗に${items.length}種類がそろい、1店舗につきA4で${sheetsPerShop}枚です。`;
document.querySelector('#open-pdf').href = `parfait-${id}-shop-cards.pdf`;

for (const shop of shops) {
  for (let index = 0; index < sheetsPerShop; index++) {
    const page = sheetTemplate.content.cloneNode(true);
    page.querySelector('.shop-name').textContent = shop.name;
    page.querySelector('.shop-group-name').textContent = name;
    page.querySelector('.sheet-number').textContent = `${index + 1} / ${sheetsPerShop} 枚目`;
    const start = index * cardsPerPage;
    const cards = items.slice(start, start + cardsPerPage).map(ingredient => shopCard(activeGroup, shop, ingredient));
    page.querySelector('.cards').append(...cards);
    sheets.append(page);
  }
}

document.querySelector('#print').addEventListener('click', () => window.print());
