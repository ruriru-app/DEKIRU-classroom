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
const storageKey = 'dekiru-parfait-v2';
const previousStorageKey = 'dekiru-parfait-v1';
const welcome = '英語で果物やアイスを注文しよう。QRを1回読むと1つもらえます。';
const wrapAngle = degrees => ((degrees % 360) + 360) % 360;
const layerEdges = [75.6, 65.7, 55.8, 45.9, 36];
const layerLimit = layerEdges.length - 1;
const bowlTop = layerEdges[layerLimit];
const bowlBottom = layerEdges[0];
const firstToppingY = 9;
const firstScoopY = 16;
const layerDropY = 43;
// Positions are percentages of the stage. Match the inner edge of the glass.
const bowlProfile = [
  [36, 31.5], [37, 29.7], [39, 27.3], [42, 24.9], [46, 22.8], [51, 21.1],
  [56, 19.6], [61, 18], [66, 16.2], [71, 13.7], [73, 12.1], [74.5, 10.5], [75.6, 8]
];
const isFitted = piece => piece.layer === true;
const isPlaced = piece => isFitted(piece) || piece.x !== null;
const isScoop = piece => piece.ingredient.endsWith('ice-cream');

function bowlHalfWidth(y) {
  const nextIndex = bowlProfile.findIndex(([at]) => at >= y);
  if (nextIndex <= 0) return bowlProfile[nextIndex === 0 ? 0 : bowlProfile.length - 1][1];
  const [start, startWidth] = bowlProfile[nextIndex - 1];
  const [end, endWidth] = bowlProfile[nextIndex];
  return startWidth + (endWidth - startWidth) * ((y - start) / (end - start));
}

function toppingHalfWidth(y) {
  return y < bowlTop ? 17 + (y - firstToppingY) * 0.54 : bowlHalfWidth(y);
}

function canPlace(x, y) {
  return Number.isFinite(x) && Number.isFinite(y) && y >= firstToppingY && y <= bowlBottom
    && Math.abs(x - 50) <= toppingHalfWidth(y);
}

function fitLayer(piece) {
  return { ...piece, layer: true, x: null, y: null };
}

function storeInTray(piece) {
  return { ...piece, layer: false, x: null, y: null };
}

function cleanPieces(stored) {
  return stored.filter(piece => piece && typeof piece.id === 'string' && items.has(piece.ingredient)
    && (piece.shop === null || shops.some(shop => shop.id === piece.shop)))
    .map(piece => ({
      ...piece,
      rotation: Number.isFinite(piece.rotation) ? wrapAngle(piece.rotation) : 0
    }));
}

function migratePieces(stored) {
  const loaded = cleanPieces(stored);
  const oldLayers = loaded.filter(piece => Number.isFinite(piece.x) && piece.y >= 42
    && items.get(piece.ingredient).layer).sort((a, b) => b.y - a.y);
  const layers = oldLayers.slice(0, layerLimit).map(fitLayer);
  const rest = loaded.filter(piece => !oldLayers.includes(piece)).map(piece => {
    if (!Number.isFinite(piece.x) || !Number.isFinite(piece.y)) return storeInTray(piece);
    const minY = isScoop(piece) ? firstScoopY : firstToppingY;
    const y = Math.max(minY, Math.min(bowlBottom, bowlTop + (piece.y - 20) * 0.8));
    const halfWidth = toppingHalfWidth(y);
    const offset = Math.max(-halfWidth, Math.min(halfWidth, (piece.x - 50) * 0.8));
    return { ...piece, layer: false, x: 50 + offset, y };
  });
  return [...layers, ...rest, ...oldLayers.slice(layerLimit).map(storeInTray)];
}

function loadPieces() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(stored)) {
      let layers = 0;
      return cleanPieces(stored).map(piece => {
        if (items.get(piece.ingredient).layer && isFitted(piece) && layers < layerLimit) {
          layers++;
          return fitLayer(piece);
        }
        return canPlace(piece.x, piece.y) ? { ...piece, layer: false } : storeInTray(piece);
      });
    }
    const previous = JSON.parse(localStorage.getItem(previousStorageKey));
    if (Array.isArray(previous)) return migratePieces(previous);
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
  const canRotate = piece && !isFitted(piece);
  buttons.left.disabled = !canRotate;
  buttons.right.disabled = !canRotate;
  buttons.return.disabled = !piece || !isPlaced(piece);
}

function setRotation(image, piece) {
  image.style.transform = 'rotate(' + (isFitted(piece) ? 0 : piece.rotation) + 'deg)';
}

function rotateSelected(degrees) {
  const piece = currentPiece();
  const image = document.querySelector('.piece[aria-pressed="true"] img');
  if (!piece || !image || isFitted(piece)) return;
  piece.rotation = wrapAngle(piece.rotation + degrees);
  setRotation(image, piece);
  save();
}

function movePiece(piece, x, y) {
  const onBoard = canPlace(x, y);
  const fitting = onBoard && y >= layerDropY && items.get(piece.ingredient).layer === true;
  if (fitting && isFitted(piece)) {
    selectPiece(piece.id);
    return;
  }
  if (fitting && pieces.filter(isFitted).length >= layerLimit) {
    status.textContent = 'グラスの中は4段までです。グラスの上に盛ってみよう。';
    selectPiece(piece.id);
    return;
  }
  piece.layer = fitting;
  piece.x = onBoard && !fitting ? x : null;
  piece.y = onBoard && !fitting ? Math.max(y, isScoop(piece) ? firstScoopY : firstToppingY) : null;
  // Array order determines stacking. Removing a layer closes the gap above it.
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
      if (isFitted(piece)) {
        drag.ghost.src = items.get(piece.ingredient).image;
        drag.ghost.style.transform = 'rotate(' + piece.rotation + 'deg)';
      }
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

function sizeLayer(button, slot) {
  const top = layerEdges[slot + 1];
  const bottom = layerEdges[slot];
  const rows = [top, ...bowlProfile.map(([y]) => y).filter(y => y > top && y < bottom), bottom];
  const points = side => rows.map(y =>
    (50 + side * bowlHalfWidth(y)).toFixed(2) + '% ' + ((y - top) * 100 / (bottom - top)).toFixed(2) + '%'
  );
  button.dataset.layer = String(slot + 1);
  button.style.left = '50%';
  button.style.top = (top + bottom) / 2 + '%';
  button.style.width = '100%';
  button.style.height = (bottom - top).toFixed(2) + '%';
  button.style.clipPath = 'polygon(' + [...points(-1), ...points(1).reverse()].join(',') + ')';
}

function render() {
  tray.replaceChildren();
  toppings.replaceChildren();
  let count = 0;
  const layers = pieces.filter(isFitted);
  for (const piece of [...layers, ...pieces.filter(piece => !isFitted(piece))]) {
    const item = items.get(piece.ingredient);
    const button = document.createElement('button');
    const image = document.createElement('img');
    const layer = isFitted(piece);
    const inside = layer || (isPlaced(piece) && piece.y >= bowlTop);
    button.type = 'button';
    button.className = 'piece';
    button.dataset.id = piece.id;
    button.dataset.ingredient = piece.ingredient;
    if (isPlaced(piece)) button.dataset.inside = String(inside);
    if (item.layer || item.sauce) button.dataset.size = layer ? 'layer' : item.sauce ? 'wide' : 'large';
    button.setAttribute('aria-label', item.name + (inside ? '・グラスの中' : isPlaced(piece) ? '・グラスの上' : '・買い物かご'));
    image.src = layer ? 'assets/' + item.id + '-texture.webp' : item.image;
    image.alt = '';
    image.dataset.ingredient = item.id;
    image.draggable = false;
    setRotation(image, piece);
    button.append(image);
    button.addEventListener('click', event => {
      const waiting = currentPiece();
      if (layer && event.detail > 0 && waiting && !isPlaced(waiting)) {
        // Accept toppings on filled areas too, but leave full layers selectable for swapping.
        if (!items.get(waiting.ingredient).layer) {
          movePiece(waiting, ...boardPoint(event.clientX, event.clientY));
          return;
        }
        if (pieces.filter(isFitted).length < layerLimit) {
          movePiece(waiting, 50, layerDropY);
          return;
        }
      }
      selectPiece(piece.id);
    });
    attachDrag(button, piece, image);
    if (!isPlaced(piece)) {
      tray.append(button);
      count++;
    } else {
      if (layer) {
        sizeLayer(button, layers.indexOf(piece));
      } else {
        button.style.left = piece.x + '%';
        button.style.top = piece.y + '%';
      }
      toppings.append(button);
    }
  }
  byId('count').textContent = count;
  if (!count) tray.textContent = '買った具材や、足した具材がここに入ります。';
  selectPiece(selected);
}

function addPiece(id, item, shop) {
  pieces.push({ id, ingredient: item.id, shop, x: null, y: null, layer: false, rotation: 0 });
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
  if (canPlace(x, y)) movePiece(piece, x, y);
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
