'use strict';

const { shops, ingredients, extras } = window.ParfaitCatalog;
const items = new Map([...ingredients, ...extras].map(item => [item.id, item]));
const byId = id => document.getElementById(id);
const board = byId('parfait');
const placement = byId('placement');
const tray = byId('tray');
const toppings = byId('toppings');
const status = byId('status');
const extraSelect = byId('extras');
const buttons = {
  left: byId('rotate-left'),
  right: byId('rotate-right'),
  return: byId('return')
};
const storageKey = 'dekiru-parfait-v1';
const welcome = '英語で果物やアイスを注文しよう。QRを1回読むと1つもらえます。';
const wrapAngle = degrees => ((degrees % 360) + 360) % 360;
const glassHalfWidth = y => y < 21 ? 20 + (y - 7) * 0.9 : 33 - (y - 21) * 0.45;
const fitsAsLayer = piece => piece.y >= 42 && items.get(piece.ingredient).layer;

function insideGlass(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || y < 7 || y > 64) return false;
  // Allow toppings above the rim and taper the placement area towards the bottom of the glass.
  return Math.abs(x - 50) <= glassHalfWidth(y);
}

function loadPieces() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(stored)) {
      return stored.filter(piece => piece && typeof piece.id === 'string' && items.has(piece.ingredient)
        && (piece.shop === null || shops.some(shop => shop.id === piece.shop))
        && (piece.x === null || insideGlass(piece.x, piece.y)))
        .map(piece => ({
          ...piece,
          rotation: Number.isFinite(piece.rotation) ? wrapAngle(piece.rotation) : 0
        }));
    }
  } catch { /* Keep the activity usable if storage is unavailable. */ }
  return [];
}

let pieces = loadPieces();
let selected = null;
let drag = null;

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(pieces));
  } catch {
    status.textContent = 'このブラウザではパフェを保存できません。';
  }
}

function currentPiece() {
  return pieces.find(piece => piece.id === selected);
}

function selectPiece(id) {
  selected = id;
  const piece = currentPiece();
  for (const button of document.querySelectorAll('.piece')) {
    button.setAttribute('aria-pressed', String(button.dataset.id === selected));
  }
  const canRotate = piece && !fitsAsLayer(piece);
  buttons.left.disabled = !canRotate;
  buttons.right.disabled = !canRotate;
  buttons.return.disabled = !piece || piece.x === null;
}

function setRotation(image, piece) {
  image.style.transform = 'rotate(' + (fitsAsLayer(piece) ? 0 : piece.rotation) + 'deg)';
}

function rotateSelected(degrees) {
  const piece = currentPiece();
  const image = document.querySelector('.piece[aria-pressed="true"] img');
  if (!piece || !image || fitsAsLayer(piece)) return;
  piece.rotation = wrapAngle(piece.rotation + degrees);
  setRotation(image, piece);
  save();
}

function movePiece(piece, x, y) {
  const inside = insideGlass(x, y);
  piece.x = inside ? x : null;
  piece.y = inside ? y : null;
  // Newly placed pieces belong in front of the previous layers.
  pieces.splice(pieces.indexOf(piece), 1);
  pieces.push(piece);
  save();
  render();
}

function boardPoint(clientX, clientY) {
  const rect = board.getBoundingClientRect();
  return [(clientX - rect.left) * 100 / rect.width, (clientY - rect.top) * 100 / rect.height];
}

function attachDrag(button, piece, image) {
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
      movePiece(piece, ...boardPoint(event.clientX, event.clientY));
    }
  }
  button.addEventListener('pointerup', finish);
  button.addEventListener('pointercancel', finish);
  button.addEventListener('lostpointercapture', finish);
}

function render() {
  tray.replaceChildren();
  toppings.replaceChildren();
  let count = 0;
  for (const piece of pieces) {
    const item = items.get(piece.ingredient);
    const button = document.createElement('button');
    const image = document.createElement('img');
    const layer = fitsAsLayer(piece);
    button.type = 'button';
    button.className = 'piece';
    button.dataset.id = piece.id;
    button.dataset.ingredient = piece.ingredient;
    if (item.layer || item.sauce) button.dataset.size = layer ? 'layer' : item.sauce ? 'wide' : 'large';
    button.setAttribute('aria-label', item.name + (piece.x === null ? '・買い物かご' : '・グラスの上'));
    image.src = layer ? 'assets/' + item.id + '-layer.webp' : item.image;
    image.alt = '';
    image.draggable = false;
    setRotation(image, piece);
    button.append(image);
    button.addEventListener('click', () => selectPiece(piece.id));
    attachDrag(button, piece, image);
    if (piece.x === null) {
      tray.append(button);
      count++;
    } else {
      if (layer) {
        const layerWidth = 56 - (piece.y - 42) * 0.93;
        button.style.width = layerWidth + '%';
        button.style.left = '50%';
      } else {
        button.style.left = piece.x + '%';
      }
      button.style.top = piece.y + '%';
      toppings.append(button);
    }
  }
  byId('count').textContent = count;
  if (!count) tray.textContent = '買った具材や、足した具材がここに入ります。';
  selectPiece(selected);
}

function addPiece(id, item, shop) {
  pieces.push({ id, ingredient: item.id, shop, x: null, y: null, rotation: 0 });
}

function receive(code) {
  const match = /^dekiru:parfait:v1:([a-j]):([a-z-]+)$/.exec(code);
  const shop = shops.find(entry => entry.id === match?.[1]);
  const item = ingredients.find(entry => entry.id === match?.[2]);
  if (!shop || !item) return 'このQRはパフェの具材カードではありません。';
  if (pieces.some(piece => piece.shop === shop.id && piece.ingredient === item.id)) {
    return shop.name + 'で' + item.name + 'は買いました。買い足すときは別のお店で注文しよう。';
  }
  addPiece(shop.id + ':' + item.id, item, shop.id);
  const quantity = item.layer ? '1つ' : '1切れ';
  status.textContent = shop.name + 'で' + item.name + 'を' + quantity + '買いました！';
  save();
  render();
  return null;
}

placement.addEventListener('click', event => {
  const piece = currentPiece();
  if (!piece) return;
  const [x, y] = event.detail === 0 ? [50, 45] : boardPoint(event.clientX, event.clientY);
  if (insideGlass(x, y)) movePiece(piece, x, y);
});
buttons.left.addEventListener('click', () => rotateSelected(-45));
buttons.right.addEventListener('click', () => rotateSelected(45));
buttons.return.addEventListener('click', () => {
  const piece = currentPiece();
  if (piece) movePiece(piece, null, null);
});
byId('reset').addEventListener('click', () => {
  if (!confirm('パフェと買い物かごを空にして、はじめから作りますか？')) return;
  pieces = [];
  selected = null;
  status.textContent = welcome;
  save();
  render();
});

for (const [label, options] of [
  ['ベース・クリーム', extras.filter(item => !item.sauce)],
  ['ソース', extras.filter(item => item.sauce)]
]) {
  const group = document.createElement('optgroup');
  group.label = label;
  for (const item of options) group.append(new Option(item.name, item.id));
  extraSelect.append(group);
}
byId('add-extra').addEventListener('click', () => {
  const item = extras.find(entry => entry.id === extraSelect.value);
  if (!item) return;
  const id = 'extra:' + crypto.randomUUID();
  addPiece(id, item, null);
  selected = id;
  status.textContent = item.name + 'をかごに入れました。グラスに盛りつけよう。';
  save();
  render();
});

window.setUpPizzaScanner(receive);
render();
