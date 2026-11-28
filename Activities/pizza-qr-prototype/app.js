'use strict';

const { shops, ingredients } = window.PizzaCatalog;
const byId = id => document.getElementById(id);
const pizza = byId('pizza');
const workspace = pizza.closest('.kitchen');
const tray = byId('tray');
const toppings = byId('toppings');
const status = byId('status');
const resetArrangement = byId('reset-arrangement');
const storageKey = 'dekiru-pizza-v2';
const previousKey = 'dekiru-pizza-pepper-v1';
const blank = () => ({ sauce: 'tomato', cheese: false, pieces: [] });
const sauces = ['tomato', 'white', 'teriyaki'];
const knownIngredient = id => ingredients.some(ingredient => ingredient.id === id);
const knownShop = id => shops.some(shop => shop.id === id);
const onPizza = (x, y) => Number.isFinite(x) && Number.isFinite(y) && Math.hypot(x - 50, y - 50) <= 39;
const wrapAngle = degrees => ((degrees % 360) + 360) % 360;
const alphaThreshold = 48;
const spriteMasks = new Map();

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
          .map(piece => ({ ...piece, rotation: Number.isFinite(piece.rotation) ? wrapAngle(piece.rotation) : 0 }))
      };
    }
    const previous = JSON.parse(localStorage.getItem(previousKey));
    if (Array.isArray(previous)) {
      return {
        ...blank(),
        pieces: previous.slice(0, 40).filter(piece => piece && typeof piece.id === 'string')
          .map(piece => ({
            id: piece.id, ingredient: 'green-pepper', shop: null, rotation: 0,
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
let placedViews = [];

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(recipe));
  } catch {
    status.textContent = 'このブラウザではピザを保存できません。';
  }
}

function selectPiece(id) {
  const piece = recipe.pieces.find(item => item.id === id);
  selected = piece?.id ?? null;
  for (const button of document.querySelectorAll('.piece')) {
    button.setAttribute('aria-pressed', String(button.dataset.id === selected));
  }
  byId('rotate-left').disabled = !piece;
  byId('rotate-right').disabled = !piece;
  byId('return').disabled = !piece || piece.x === null;
}

function setRotation(image, piece) {
  image.style.transform = 'rotate(' + piece.rotation + 'deg)';
}

function rotateSelected(degrees) {
  const piece = recipe.pieces.find(item => item.id === selected);
  const image = document.querySelector('.piece[aria-pressed="true"] img');
  if (!piece || !image) return;
  piece.rotation = wrapAngle(piece.rotation + degrees);
  setRotation(image, piece);
  save();
}

function movePiece(piece, x, y) {
  const inside = onPizza(x, y);
  piece.x = inside ? x : null;
  piece.y = inside ? y : null;
  save();
  render();
}

function boardPoint(clientX, clientY, rect = pizza.getBoundingClientRect()) {
  return [(clientX - rect.left) * 100 / rect.width, (clientY - rect.top) * 100 / rect.height];
}

function pointInRect(x, y, rect) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function opacityMask(image) {
  const url = image.currentSrc || image.src;
  if (!spriteMasks.has(url)) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      spriteMasks.set(url, context.getImageData(0, 0, canvas.width, canvas.height).data);
    } catch {
      // Keep the image selectable if the browser cannot read its pixels.
      spriteMasks.set(url, null);
    }
  }
  return spriteMasks.get(url);
}

function spriteContains({ image, piece }, x, y) {
  const bounds = image.getBoundingClientRect();
  if (!pointInRect(x, y, bounds) || !image.complete || !image.naturalWidth) return false;

  // Undo the displayed rotation and object-fit:contain to find the source pixel.
  const radians = piece.rotation * Math.PI / 180;
  const sine = Math.sin(radians);
  const cosine = Math.cos(radians);
  const dx = x - bounds.left - bounds.width / 2;
  const dy = y - bounds.top - bounds.height / 2;
  const style = getComputedStyle(image);
  const scale = Math.min(parseFloat(style.width) / image.naturalWidth, parseFloat(style.height) / image.naturalHeight);
  if (!scale) return false;
  const sampleX = Math.floor((dx * cosine + dy * sine) / scale + image.naturalWidth / 2);
  const sampleY = Math.floor((dy * cosine - dx * sine) / scale + image.naturalHeight / 2);
  if (sampleX < 0 || sampleX >= image.naturalWidth || sampleY < 0 || sampleY >= image.naturalHeight) return false;
  const mask = opacityMask(image);
  return !mask || mask[(sampleY * image.naturalWidth + sampleX) * 4 + 3] >= alphaThreshold;
}

function pickPiece(x, y) {
  if (!pointInRect(x, y, pizza.getBoundingClientRect())) return null;
  for (let index = placedViews.length - 1; index >= 0; index--) {
    if (spriteContains(placedViews[index], x, y)) return placedViews[index];
  }
  return null;
}

function startDrag(event, view, fromBoard = false) {
  if (drag || event.button !== 0 || !event.isPrimary) return;
  drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, view, fromBoard, moved: false };
  event.currentTarget.setPointerCapture(event.pointerId);
  if (fromBoard) event.preventDefault();
}

function updateDragGhost(ghost, clientX, clientY) {
  const inWorkspace = pointInRect(clientX, clientY, workspace.getBoundingClientRect());
  const style = getComputedStyle(pizza);
  const scale = Number(style.getPropertyValue('--pizza-piece-scale'));
  const inset = parseFloat(style.getPropertyValue('--pizza-piece-inset'));
  const size = inWorkspace ? pizza.getBoundingClientRect().width * scale - inset : 58;
  ghost.style.width = size + 'px';
  ghost.style.height = size + 'px';
  ghost.style.left = clientX + 'px';
  ghost.style.top = clientY + 'px';
}

function trackDrag(event) {
  if (drag?.pointerId !== event.pointerId) return;
  if (!drag.moved) {
    drag.moved = Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 6;
    if (drag.moved && drag.view) {
      drag.ghost = drag.view.image.cloneNode();
      drag.ghost.className = 'drag-ghost';
      document.body.append(drag.ghost);
      drag.view.button.classList.add('dragging');
    }
  }
  if (drag.ghost) updateDragGhost(drag.ghost, event.clientX, event.clientY);
}

function finishDrag(event) {
  if (drag?.pointerId !== event.pointerId) return;
  const { view, ghost, moved, fromBoard } = drag;
  drag = null;
  ghost?.remove();
  view?.button.classList.remove('dragging');
  if (event.type !== 'pointerup') return;

  const [x, y] = boardPoint(event.clientX, event.clientY);
  if (view && moved) {
    selected = view.piece.id;
    movePiece(view.piece, x, y);
  } else if (fromBoard && !moved) {
    if (view) {
      view.button.focus({ preventScroll: true });
      selectPiece(view.piece.id);
    } else {
      const piece = recipe.pieces.find(item => item.id === selected);
      if (piece && onPizza(x, y)) movePiece(piece, x, y);
    }
  }
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
  placedViews = [];
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
    image.dataset.ingredient = ingredient.id;
    image.draggable = false;
    setRotation(image, piece);
    button.append(image);
    button.addEventListener('click', () => selectPiece(piece.id));
    const view = { piece, button, image };
    if (piece.x === null) {
      button.addEventListener('pointerdown', event => startDrag(event, view));
      tray.append(button);
      inTray++;
    } else {
      button.style.left = piece.x + '%';
      button.style.top = piece.y + '%';
      toppings.append(button);
      placedViews.push(view);
    }
  }
  byId('count').textContent = inTray;
  resetArrangement.disabled = inTray === recipe.pieces.length;
  if (!inTray) tray.textContent = '買った具材がここに入ります。';
  selectPiece(selected);
}

pizza.addEventListener('pointerdown', event => {
  startDrag(event, pickPiece(event.clientX, event.clientY), true);
});
pizza.addEventListener('click', event => {
  if (event.detail === 0) return;
  // Pointer taps use visible shapes; keep native keyboard clicks on the buttons.
  event.preventDefault();
  event.stopPropagation();
}, true);
document.addEventListener('pointermove', trackDrag);
document.addEventListener('pointerup', finishDrag);
document.addEventListener('pointercancel', finishDrag);
document.addEventListener('lostpointercapture', finishDrag);

byId('placement').addEventListener('click', () => {
  const piece = recipe.pieces.find(item => item.id === selected);
  if (piece) movePiece(piece, 50, 50);
});

byId('return').addEventListener('click', () => {
  const piece = recipe.pieces.find(item => item.id === selected);
  if (piece) movePiece(piece, null, null);
});
byId('rotate-left').addEventListener('click', () => rotateSelected(-45));
byId('rotate-right').addEventListener('click', () => rotateSelected(45));
resetArrangement.addEventListener('click', () => {
  const placed = recipe.pieces.filter(piece => piece.x !== null);
  if (!placed.length || !confirm('盛りつけた具材をすべてかごに戻しますか？')) return;
  for (const piece of placed) {
    piece.x = null;
    piece.y = null;
    piece.rotation = 0;
  }
  selected = null;
  status.textContent = '盛りつけた具材をかごに戻しました。';
  save();
  render();
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
    return shop.name + 'で' + ingredient.name + 'は買いました。もっとほしいときは、別のお店で注文しよう。';
  }
  for (let number = 1; number <= 2; number++) {
    recipe.pieces.push({
      id: `${shop.id}:${ingredient.id}:${number}`,
      ingredient: ingredient.id,
      shop: shop.id,
      x: null,
      y: null,
      rotation: 0
    });
  }
  status.textContent = shop.name + 'で' + ingredient.name + 'を2つ買いました！';
  save();
  render();
  return null;
}

window.setUpPizzaScanner(receive);
render();
