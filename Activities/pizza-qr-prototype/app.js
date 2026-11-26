'use strict';

const { shops, ingredients } = window.PizzaCatalog;
const byId = id => document.getElementById(id);
const pizza = byId('pizza');
const tray = byId('tray');
const toppings = byId('toppings');
const status = byId('status');
const storageKey = 'dekiru-pizza-v2';
const previousKey = 'dekiru-pizza-pepper-v1';
const blank = () => ({ sauce: 'tomato', cheese: false, pieces: [] });
const sauces = ['tomato', 'white', 'teriyaki'];
const knownIngredient = id => ingredients.some(ingredient => ingredient.id === id);
const knownShop = id => shops.some(shop => shop.id === id);
const onPizza = (x, y) => Number.isFinite(x) && Number.isFinite(y) && Math.hypot(x - 50, y - 50) <= 39;

function loadPizza() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && Array.isArray(saved.pieces)) {
      return {
        sauce: sauces.includes(saved.sauce) ? saved.sauce : 'tomato',
        cheese: saved.cheese === true,
        pieces: saved.pieces.filter(piece => piece && typeof piece.id === 'string'
          && knownIngredient(piece.ingredient) && (piece.shop === null || knownShop(piece.shop))
          && (piece.x === null || onPizza(piece.x, piece.y)))
      };
    }
    const previous = JSON.parse(localStorage.getItem(previousKey));
    if (Array.isArray(previous)) {
      return {
        ...blank(),
        pieces: previous.slice(0, 40).filter(piece => piece && typeof piece.id === 'string')
          .map(piece => ({
            id: piece.id, ingredient: 'green-pepper', shop: null,
            x: onPizza(piece.x, piece.y) ? piece.x : null,
            y: onPizza(piece.x, piece.y) ? piece.y : null
          }))
      };
    }
  } catch { /* The activity still works when storage is unavailable. */ }
  return blank();
}

let recipe = loadPizza();
let selected = null;
let drag = null;

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(recipe));
  } catch {
    status.textContent = 'このブラウザではピザを保存できません。';
  }
}

function selectPiece(id) {
  selected = id;
  for (const button of document.querySelectorAll('.piece')) {
    button.setAttribute('aria-pressed', String(button.dataset.id === id));
  }
  byId('return').disabled = !recipe.pieces.some(piece => piece.id === id && piece.x !== null);
}

function movePiece(piece, x, y) {
  const inside = onPizza(x, y);
  piece.x = inside ? x : null;
  piece.y = inside ? y : null;
  save();
  render();
}

function placeAt(piece, clientX, clientY) {
  const rect = pizza.getBoundingClientRect();
  movePiece(piece, (clientX - rect.left) * 100 / rect.width, (clientY - rect.top) * 100 / rect.height);
}

function setUpPieceDrag(button, piece, image) {
  button.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !event.isPrimary) return;
    drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener('pointermove', event => {
    if (drag?.pointerId !== event.pointerId) return;
    if (!drag.ghost && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 6) {
      drag.ghost = image.cloneNode();
      drag.ghost.className = 'drag-ghost';
      document.body.append(drag.ghost);
      button.classList.add('dragging');
    }
    if (drag.ghost) {
      drag.ghost.style.left = event.clientX + 'px';
      drag.ghost.style.top = event.clientY + 'px';
    }
  });
  function finish(event) {
    if (drag?.pointerId !== event.pointerId) return;
    const moved = Boolean(drag.ghost);
    drag.ghost?.remove();
    drag = null;
    button.classList.remove('dragging');
    if (moved && event.type === 'pointerup') {
      selected = piece.id;
      placeAt(piece, event.clientX, event.clientY);
    }
  }
  button.addEventListener('pointerup', finish);
  button.addEventListener('pointercancel', finish);
  button.addEventListener('lostpointercapture', finish);
}

function render() {
  const base = byId('base');
  const source = 'assets/base-' + recipe.sauce + '.webp';
  if (base.getAttribute('src') !== source) base.src = source;
  document.querySelector('input[name="sauce"][value="' + recipe.sauce + '"]').checked = true;
  byId('cheese-layer').hidden = !recipe.cheese;
  byId('cheese').setAttribute('aria-pressed', String(recipe.cheese));
  byId('cheese').textContent = recipe.cheese ? 'チーズをはずす' : 'チーズをのせる';
  tray.replaceChildren();
  toppings.replaceChildren();
  let inTray = 0;
  for (const piece of recipe.pieces) {
    const ingredient = ingredients.find(item => item.id === piece.ingredient);
    const button = document.createElement('button');
    const image = document.createElement('img');
    button.type = 'button';
    button.className = 'piece';
    button.dataset.id = piece.id;
    button.dataset.ingredient = piece.ingredient;
    button.setAttribute('aria-label', ingredient.name + (piece.x === null ? '・買い物かご' : '・ピザの上'));
    image.src = ingredient.image;
    image.alt = '';
    image.draggable = false;
    button.append(image);
    button.addEventListener('click', () => selectPiece(piece.id));
    setUpPieceDrag(button, piece, image);
    if (piece.x === null) {
      tray.append(button);
      inTray++;
    } else {
      button.style.left = piece.x + '%';
      button.style.top = piece.y + '%';
      toppings.append(button);
    }
  }
  byId('count').textContent = inTray;
  if (!inTray) tray.textContent = '買った具材がここに入ります。';
  selectPiece(selected);
}

byId('placement').addEventListener('click', event => {
  const piece = recipe.pieces.find(item => item.id === selected);
  if (!piece) return;
  if (event.detail === 0) {
    movePiece(piece, 50, 50);
  } else {
    const rect = pizza.getBoundingClientRect();
    const x = (event.clientX - rect.left) * 100 / rect.width;
    const y = (event.clientY - rect.top) * 100 / rect.height;
    if (onPizza(x, y)) movePiece(piece, x, y);
  }
});

byId('return').addEventListener('click', () => {
  const piece = recipe.pieces.find(item => item.id === selected);
  if (piece) movePiece(piece, null, null);
});
byId('reset').addEventListener('click', () => {
  if (!confirm('ピザと買い物かごを空にして、はじめから作りますか？')) return;
  recipe = blank();
  selected = null;
  status.textContent = '英語で注文して、お店の人から具材のカードを見せてもらおう。';
  save();
  render();
});
document.querySelectorAll('input[name="sauce"]').forEach(radio => radio.addEventListener('change', () => {
  recipe.sauce = radio.value;
  save();
  render();
}));
byId('cheese').addEventListener('click', () => {
  recipe.cheese = !recipe.cheese;
  save();
  render();
});

function receive(code) {
  if (code === 'dekiru:pizza:v1:green-pepper') {
    return '前の試作品のQRです。SHOP A〜Dの新しい具材カードを使ってください。';
  }
  const parts = code.match(/^dekiru:pizza:v2:([a-z]+):([a-z-]+)$/);
  const shop = shops.find(item => item.id === parts?.[1]);
  const ingredient = ingredients.find(item => item.id === parts?.[2]);
  if (!shop || !ingredient) return 'このQRはピザの具材カードではありません。';
  if (recipe.pieces.some(piece => piece.shop === shop.id && piece.ingredient === ingredient.id)) {
    return shop.name + 'で' + ingredient.name + 'は買いました。もう一つほしいときは、別のお店で注文しよう。';
  }
  recipe.pieces.push({ id: shop.id + ':' + ingredient.id, ingredient: ingredient.id, shop: shop.id, x: null, y: null });
  status.textContent = shop.name + 'で' + ingredient.name + 'を1つ買いました！';
  save();
  render();
  return null;
}

window.setUpPizzaScanner(receive);
render();
