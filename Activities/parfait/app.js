'use strict';

const { shops, ingredients, shopGroups, teacherItems, extras, legacyExtras } = window.ParfaitCatalog;
const shopDirectory = new Map(shops.map(shop => [shop.id, { name: shop.name, items: ingredients }]));
for (const group of shopGroups) {
  for (const shop of group.shops) {
    shopDirectory.set(group.id + ':' + shop.id, { name: shop.name, items: group.items });
  }
}
shopDirectory.set('teacher', { name: '先生', items: teacherItems });
const items = new Map([...ingredients, ...shopGroups.flatMap(group => group.items), ...teacherItems, ...extras, ...legacyExtras]
  .map(item => [item.id, item]));
const byId = id => document.getElementById(id);
const board = byId('parfait');
const workspace = board.closest('.kitchen');
const placement = byId('placement');
const tray = byId('tray');
const toppings = byId('toppings');
const status = byId('status');
const extraSelect = byId('extras');
const resetArrangement = byId('reset-arrangement');
const buttons = {
  left: byId('rotate-left'),
  right: byId('rotate-right'),
  flip: byId('flip-piece'),
  return: byId('return')
};
const storageKey = 'dekiru-parfait-v2';
const previousStorageKey = 'dekiru-parfait-v1';
const welcome = '英語でフルーツ・ゼリー・アイスなどを注文しよう。QRを1回読むと1回分もらえます。';
const wrapAngle = degrees => ((degrees % 360) + 360) % 360;
const layerEdges = [75.6, 62.4, 49.2, 36];
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
// Each shared edge uses the same wave for the slab above and below it.
const layerRipples = [[0, 0], [0, -.22, -.52, -.35, .13, .42, .27, -.07, 0],
  [0, .23, .53, .38, -.08, -.53, -.45, -.14, 0], [0, 0]];
const layerBoundaries = layerEdges.map((y, edge) => {
  const halfWidth = bowlHalfWidth(y);
  const ripple = layerRipples[edge];
  return ripple.map((offset, index) => [50 - halfWidth + 2 * halfWidth * index / (ripple.length - 1), y + offset]);
});
const isFitted = piece => piece.layer === true;
const isPlaced = piece => isFitted(piece) || piece.x !== null;
const isScoop = piece => items.get(piece.ingredient).scoop === true;
const isJelly = piece => items.get(piece.ingredient).jelly === true;
const spriteMasks = new Map();
const layerSources = new Map();
const alphaThreshold = 48;
const scatterCounts = new Map([['chocolate-sprinkles', 6], ['nuts', 4]]);

function isScatterPart(piece) {
  return Number.isInteger(piece.scatterPart) && piece.scatterPart >= 1
    && piece.scatterPart <= (scatterCounts.get(piece.ingredient) ?? 0);
}

function scatterGroupId(piece) {
  const suffix = ':piece:' + piece.scatterPart;
  return isScatterPart(piece) && piece.id.endsWith(suffix) ? piece.id.slice(0, -suffix.length) : null;
}

function consolidateScatteredServings(saved) {
  const ids = new Set(saved.map(piece => piece.id));
  const servings = new Map();
  for (const piece of saved) {
    const id = scatterGroupId(piece);
    if (!id || ids.has(id)) continue;
    if (!servings.has(id)) servings.set(id, []);
    servings.get(id).push(piece);
  }

  const replacements = new Map();
  for (const [id, parts] of servings) {
    const count = scatterCounts.get(parts[0].ingredient);
    // A mixed or incomplete serving keeps its legacy parts and positions.
    if (parts.length !== count || parts.some(isPlaced)
      || new Set(parts.map(piece => piece.scatterPart)).size !== count) continue;
    const group = { ...parts[0], id };
    delete group.scatterPart;
    for (const part of parts) replacements.set(part, []);
    replacements.set(parts[0], [group]);
  }
  return saved.flatMap(piece => replacements.get(piece) ?? [piece]);
}

function pieceImage(piece) {
  if (isScatterPart(piece)) {
    return 'assets/' + piece.ingredient + '-piece-' + piece.scatterPart + '.webp';
  }
  if (scatterCounts.has(piece.ingredient)) return 'assets/' + piece.ingredient + '-scattered.webp';
  return items.get(piece.ingredient).image;
}

function toppingOutline() {
  const side = direction => bowlProfile.map(([y, halfWidth]) => (50 + direction * halfWidth) + '% ' + y + '%');
  // Let toppings extend to either side above the rim, and hide them behind the bowl wall below it.
  return 'polygon(0 0,100% 0,100% ' + bowlTop + '%,' + side(1).join(',') + ','
    + side(-1).reverse().join(',') + ',0 ' + bowlTop + '%)';
}

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

function takesLayer(piece, x, y) {
  return items.get(piece.ingredient).layer === true && canPlace(x, y)
    && y >= (isJelly(piece) ? bowlTop : layerDropY);
}

function textureSource(item) {
  if (item.layerColors) {
    if (!layerSources.has(item.id)) {
      const [light, dark] = item.layerColors;
      const flecks = item.crumb
        ? '<path d="M24 31l5 2-1 5-5-1zM77 77l6-3 4 5-5 5zM130 29l6 3-2 5-5-2zM181 82l7 1-2 6-5-1zM247 41l6-4 3 6-5 4zM329 62l7 2-2 6-5-2z" fill="' + item.crumb + '"/>'
        : '';
      const gradient = '<linearGradient id="fill" x2="0%" y2="100%">'
        + '<stop offset="0%" stop-color="' + light + '"/>'
        + '<stop offset="55%" stop-color="' + light + '"/>'
        + '<stop offset="100%" stop-color="' + dark + '"/></linearGradient>';
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 112"><defs>'
        + gradient + '</defs><path d="M0 0h360v112H0z" fill="url(#fill)"/>' + flecks + '</svg>';
      layerSources.set(item.id, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
    }
    return layerSources.get(item.id);
  }
  return item.texture ?? 'assets/' + item.id + '-texture.webp';
}

function fitLayer(piece) {
  return { ...piece, layer: true, x: null, y: null };
}

function storeInTray(piece) {
  return { ...piece, layer: false, x: null, y: null };
}

function cleanPieces(stored) {
  return stored.filter(piece => piece && typeof piece.id === 'string' && items.has(piece.ingredient)
    && (piece.shop === null || shopDirectory.get(piece.shop)?.items.some(item => item.id === piece.ingredient)))
    .map(piece => ({
      ...piece,
      rotation: Number.isFinite(piece.rotation) ? wrapAngle(piece.rotation) : 0,
      flipped: piece.flipped === true
    }));
}

function migratePieces(stored) {
  const loaded = cleanPieces(stored);
  const oldLayers = loaded.filter(piece => Number.isFinite(piece.x) && piece.y >= 42
    && items.get(piece.ingredient).layer).sort((a, b) => b.y - a.y);
  const layers = oldLayers.slice(0, layerLimit).map(fitLayer);
  const rest = loaded.filter(piece => !oldLayers.includes(piece)).map(piece => {
    if (isJelly(piece) || !Number.isFinite(piece.x) || !Number.isFinite(piece.y)) return storeInTray(piece);
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
        if (isFitted(piece)) {
          if (!items.get(piece.ingredient).layer || layers >= layerLimit) return storeInTray(piece);
          layers++;
          return fitLayer(piece);
        }
        return !isJelly(piece) && canPlace(piece.x, piece.y) ? { ...piece, layer: false } : storeInTray(piece);
      });
    }
    const previous = JSON.parse(localStorage.getItem(previousStorageKey));
    if (Array.isArray(previous)) return migratePieces(previous);
  } catch { /* Keep the activity usable if storage is unavailable. */ }
  return [];
}

let pieces = consolidateScatteredServings(loadPieces());
let selected = null;
let drag = null;
let placedViews = [];

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
  buttons.flip.disabled = !piece;
  buttons.flip.setAttribute('aria-pressed', String(piece?.flipped === true));
  buttons.return.disabled = !piece || !isPlaced(piece);
}

function setPieceTransform(image, piece, layer = isFitted(piece)) {
  image.style.transform = 'rotate(' + (layer ? 0 : piece.rotation) + 'deg)' + (piece.flipped ? ' scaleX(-1)' : '');
}

function rotateSelected(degrees) {
  const piece = currentPiece();
  const image = document.querySelector('.piece[aria-pressed="true"] img');
  if (!piece || !image || isFitted(piece)) return;
  piece.rotation = wrapAngle(piece.rotation + degrees);
  setPieceTransform(image, piece);
  save();
}

function flipSelected() {
  const piece = currentPiece();
  const image = document.querySelector('.piece[aria-pressed="true"] img');
  if (!piece || !image) return;
  piece.flipped = !piece.flipped;
  setPieceTransform(image, piece);
  buttons.flip.setAttribute('aria-pressed', String(piece.flipped));
  save();
}

function movePiece(piece, x, y) {
  const onBoard = canPlace(x, y);
  const fitting = takesLayer(piece, x, y);
  const jelly = isJelly(piece);
  if (jelly && (x !== null || y !== null) && !fitting) {
    status.textContent = 'ゼリーはグラスの中に入れよう。';
    selectPiece(piece.id);
    return;
  }
  if (fitting && isFitted(piece)) {
    if (jelly) status.textContent = 'ゼリーはグラスの中に入っています。';
    selectPiece(piece.id);
    return;
  }
  if (fitting && pieces.filter(isFitted).length >= layerLimit) {
    status.textContent = jelly
      ? `グラスの中は${layerLimit}段までです。空きを作ってから、ゼリーを入れよう。`
      : `グラスの中は${layerLimit}段までです。グラスの上に盛ってみよう。`;
    selectPiece(piece.id);
    return;
  }
  piece.layer = fitting;
  piece.x = onBoard && !fitting ? x : null;
  piece.y = onBoard && !fitting ? Math.max(y, isScoop(piece) ? firstScoopY : firstToppingY) : null;
  // Array order determines stacking. Removing a layer closes the gap above it.
  pieces.splice(pieces.indexOf(piece), 1);
  pieces.push(piece);
  if (!onBoard && isScatterPart(piece)) {
    pieces = consolidateScatteredServings(pieces);
    if (selected === piece.id && !pieces.includes(piece)) selected = scatterGroupId(piece);
  }
  if (jelly) status.textContent = fitting ? 'ゼリーをグラスの中に入れました。' : 'ゼリーをかごに戻しました。';
  save();
  render();
}

function boardPoint(clientX, clientY, rect = board.getBoundingClientRect()) {
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
      // A visible image is still selectable if its pixels cannot be read.
      spriteMasks.set(url, null);
    }
  }
  return spriteMasks.get(url);
}

function spriteContains({ image, piece }, x, y) {
  const bounds = image.getBoundingClientRect();
  if (!pointInRect(x, y, bounds) || !image.complete || !image.naturalWidth) return false;

  // Undo the rotation, then map the rendered object-fit:contain box back to its raster.
  const radians = piece.rotation * Math.PI / 180;
  const sine = Math.sin(radians);
  const cosine = Math.cos(radians);
  const dx = x - bounds.left - bounds.width / 2;
  const dy = y - bounds.top - bounds.height / 2;
  const scale = Math.min(image.offsetWidth / image.naturalWidth, image.offsetHeight / image.naturalHeight);
  if (!scale) return false;
  const localX = dx * cosine + dy * sine;
  const sampleX = Math.floor((piece.flipped ? -localX : localX) / scale + image.naturalWidth / 2);
  const sampleY = Math.floor((dy * cosine - dx * sine) / scale + image.naturalHeight / 2);
  if (sampleX < 0 || sampleX >= image.naturalWidth || sampleY < 0 || sampleY >= image.naturalHeight) return false;
  const mask = opacityMask(image);
  return !mask || mask[(sampleY * image.naturalWidth + sampleX) * 4 + 3] >= alphaThreshold;
}

function pickPiece(clientX, clientY) {
  const [x, y] = boardPoint(clientX, clientY);
  if (x < 0 || x > 100 || y < 0 || y > bowlBottom || (y >= bowlTop && Math.abs(x - 50) > bowlHalfWidth(y))) return null;
  for (let index = placedViews.length - 1; index >= 0; index--) {
    const view = placedViews[index];
    if (isFitted(view.piece)
      ? layerContains(Number(view.button.dataset.layer) - 1, x, y)
      : spriteContains(view, clientX, clientY)) {
      return view;
    }
  }
  return null;
}

function tapBoard(view, clientX, clientY) {
  const waiting = currentPiece();
  const [x, y] = boardPoint(clientX, clientY);
  if (!view) {
    if (waiting && (isJelly(waiting) || canPlace(x, y))) movePiece(waiting, x, y);
    return;
  }
  if (isFitted(view.piece) && waiting && !isPlaced(waiting)) {
    if (isJelly(waiting) || !items.get(waiting.ingredient).layer) {
      movePiece(waiting, x, y);
      return;
    }
    if (pieces.filter(isFitted).length < layerLimit) {
      movePiece(waiting, 50, layerDropY);
      return;
    }
  }
  view.button.focus({ preventScroll: true });
  selectPiece(view.piece.id);
}

function startDrag(event, view, fromBoard = false) {
  if (drag || event.button !== 0 || !event.isPrimary) return;
  const captureTarget = fromBoard ? board : view.button;
  drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, view, fromBoard, moved: false };
  captureTarget.setPointerCapture(event.pointerId);
}

function updateDragGhost({ view, ghost }, clientX, clientY) {
  const item = items.get(view.piece.ingredient);
  const inWorkspace = pointInRect(clientX, clientY, workspace.getBoundingClientRect());
  const rect = board.getBoundingClientRect();
  const [x, y] = boardPoint(clientX, clientY, rect);
  const layers = pieces.filter(isFitted);
  const slot = isFitted(view.piece) ? layers.indexOf(view.piece) : layers.length;
  const layer = inWorkspace && slot < layerLimit && takesLayer(view.piece, x, y) ? layerGeometry(slot) : null;
  const source = layer ? textureSource(item) : pieceImage(view.piece);
  if (ghost.getAttribute('src') !== source) ghost.src = source;

  const style = getComputedStyle(view.button);
  const scale = Number(style.getPropertyValue('--board-piece-scale'));
  const compactSize = Number.parseFloat(style.getPropertyValue('--tray-piece-size')) || 58;
  const size = inWorkspace ? rect.width * scale : compactSize;
  ghost.style.width = (layer ? rect.width : size) + 'px';
  ghost.style.height = (layer ? rect.height * (layer.bottom - layer.top) / 100 : size) + 'px';
  ghost.style.clipPath = layer ? layer.clipPath : '';
  ghost.style.objectFit = layer ? 'cover' : 'contain';
  setPieceTransform(ghost, view.piece, Boolean(layer));
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
  if (drag.ghost) updateDragGhost(drag, event.clientX, event.clientY);
}

function finishDrag(event) {
  if (drag?.pointerId !== event.pointerId) return;
  const { view, ghost, moved, fromBoard } = drag;
  drag = null;
  ghost?.remove();
  view?.button.classList.remove('dragging');
  if (event.type !== 'pointerup') return;
  if (view && moved) {
    selected = view.piece.id;
    movePiece(view.piece, ...boardPoint(event.clientX, event.clientY));
  } else if (fromBoard && !moved) {
    tapBoard(view, event.clientX, event.clientY);
  }
}

function layerBoundaryY(edge, x) {
  const points = layerBoundaries[edge];
  if (x <= points[0][0]) return points[0][1];
  for (let index = 1; index < points.length; index++) {
    const [right, rightY] = points[index];
    if (x <= right) {
      const [left, leftY] = points[index - 1];
      return leftY + (rightY - leftY) * ((x - left) / (right - left));
    }
  }
  return points[points.length - 1][1];
}

function layerContains(slot, x, y) {
  return y >= layerBoundaryY(slot + 1, x) && y <= layerBoundaryY(slot, x);
}

function layerGeometry(slot) {
  const upperWave = layerBoundaries[slot + 1];
  const lowerWave = layerBoundaries[slot];
  const top = Math.min(...upperWave.map(([, y]) => y));
  const bottom = Math.max(...lowerWave.map(([, y]) => y));
  const walls = bowlProfile.filter(([y]) => y > layerEdges[slot + 1] && y < layerEdges[slot]);
  const polygon = [
    ...upperWave,
    ...walls.map(([y, halfWidth]) => [50 + halfWidth, y]),
    ...lowerWave.slice().reverse(),
    ...walls.slice().reverse().map(([y, halfWidth]) => [50 - halfWidth, y])
  ];
  const points = polygon.map(([x, y]) => x.toFixed(3) + '% ' + ((y - top) * 100 / (bottom - top)).toFixed(3) + '%');
  return { top, bottom, clipPath: 'polygon(' + points.join(',') + ')' };
}

function sizeLayer(button, slot) {
  const { top, bottom, clipPath } = layerGeometry(slot);
  button.dataset.layer = String(slot + 1);
  button.style.left = '50%';
  button.style.top = (top + bottom) / 2 + '%';
  button.style.width = '100%';
  button.style.height = (bottom - top) + '%';
  button.style.clipPath = clipPath;
}

function render() {
  tray.replaceChildren();
  toppings.replaceChildren();
  placedViews = [];
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
    const single = isScatterPart(piece);
    if (single) button.dataset.scatterPart = String(piece.scatterPart);
    if (item.scoop) button.dataset.scoop = 'true';
    if (isPlaced(piece)) button.dataset.inside = String(inside);
    if (item.layer || item.sauce) button.dataset.size = layer ? 'layer' : item.sauce ? 'wide' : 'large';
    button.setAttribute('aria-label', item.name + (single ? '・' + piece.scatterPart + '粒目' : '')
      + (inside ? '・グラスの中' : isPlaced(piece) ? '・グラスの上' : '・買い物かご'));
    image.src = layer ? textureSource(item) : pieceImage(piece);
    image.alt = '';
    image.dataset.ingredient = item.id;
    image.draggable = false;
    setPieceTransform(image, piece);
    button.append(image);
    button.addEventListener('click', () => selectPiece(piece.id));
    const view = { button, piece, image };
    if (!isPlaced(piece)) {
      button.addEventListener('pointerdown', event => startDrag(event, view));
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
      placedViews.push(view);
    }
  }
  byId('count').textContent = count;
  resetArrangement.disabled = !pieces.some(isPlaced);
  if (!count) tray.textContent = '買った具材や、足した具材がここに入ります。';
  selectPiece(selected);
}

function addPiece(id, item, shop) {
  pieces.push({ id, ingredient: item.id, shop, x: null, y: null, layer: false, rotation: 0, flipped: false });
}

function receive(code) {
  const legacy = /^dekiru:parfait:v1:([a-j]|teacher):([a-z-]+)$/.exec(code);
  const grouped = /^dekiru:parfait:v2:(fruit|jelly|ice):([a-f]):([a-z-]+)$/.exec(code);
  const source = grouped ? grouped[1] + ':' + grouped[2] : legacy?.[1];
  const ingredient = grouped ? grouped[3] : legacy?.[2];
  const fromTeacher = source === 'teacher';
  const shop = shopDirectory.get(source);
  const item = shop?.items.find(entry => entry.id === ingredient);
  if (!item) return 'このQRはパフェの具材カードではありません。';
  if (pieces.some(piece => piece.shop === source && piece.ingredient === item.id)) {
    if (fromTeacher) return item.name + 'は先生から受け取りました。先生のカードは1種類につき1回使えます。';
    return shop.name + 'で' + item.name + 'は買いました。買い足すときは別のお店で注文しよう。';
  }
  addPiece(source + ':' + item.id, item, source);
  const quantity = scatterCounts.has(item.id) ? '1回分' : item.quantity ?? (item.layer ? '1つ' : '1切れ');
  status.textContent = fromTeacher
    ? '先生から' + item.name + 'を' + quantity + '受け取りました！'
    : shop.name + 'で' + item.name + 'を' + quantity + '買いました！';
  save();
  render();
  return null;
}

board.addEventListener('pointerdown', event => {
  if (drag || event.button !== 0 || !event.isPrimary) return;
  startDrag(event, pickPiece(event.clientX, event.clientY), true);
  event.preventDefault();
});
board.addEventListener('click', event => {
  if (event.detail === 0) return;
  // Pointer taps were routed by their visible shapes. Keep native keyboard clicks.
  event.preventDefault();
  event.stopPropagation();
}, true);
document.addEventListener('pointermove', trackDrag);
document.addEventListener('pointerup', finishDrag);
document.addEventListener('pointercancel', finishDrag);
document.addEventListener('lostpointercapture', finishDrag);

placement.addEventListener('click', () => {
  const piece = currentPiece();
  if (piece) movePiece(piece, 50, 45);
});
buttons.left.addEventListener('click', () => rotateSelected(-45));
buttons.right.addEventListener('click', () => rotateSelected(45));
buttons.flip.addEventListener('click', flipSelected);
buttons.return.addEventListener('click', () => {
  const piece = currentPiece();
  if (piece) movePiece(piece, null, null);
});
resetArrangement.addEventListener('click', () => {
  if (!pieces.some(isPlaced) || !confirm('盛りつけた具材をすべてかごに戻しますか？')) return;
  pieces = consolidateScatteredServings(pieces.map(piece => isPlaced(piece) ? { ...storeInTray(piece), rotation: 0 } : piece));
  selected = null;
  status.textContent = '盛りつけた具材をかごに戻しました。';
  save();
  render();
});
byId('reset').addEventListener('click', () => {
  if (!confirm('パフェと買い物かごを空にして、はじめから作りますか？')) return;
  pieces = [];
  selected = null;
  status.textContent = welcome;
  clearPresentation();
  save();
  render();
});

for (const item of extras) {
  extraSelect.append(new Option(item.name, item.id));
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

toppings.style.clipPath = toppingOutline();
window.setUpPizzaScanner(receive);
render();

const presentationKey = 'dekiru-parfait-presentation-v1';
const titleField = byId('parfait-title');
const notesField = byId('parfait-notes');
const presentationFields = [titleField, notesField];
const completeView = byId('complete-view');
const completeStage = byId('complete-stage');
const completeButton = byId('complete');
const completeBack = byId('complete-back');
const editorHeader = byId('editor-header');
const editorView = byId('editor-view');
const fullscreenNotice = byId('fullscreen-status');
const fullscreenButtons = document.querySelectorAll('[data-parfait-fullscreen]');

function fitPresentationFields() {
  if (completeView.hidden) return;
  for (const field of presentationFields) {
    field.style.height = 'auto';
    field.style.height = (field.scrollHeight + field.offsetHeight - field.clientHeight) + 'px';
  }
}

function loadPresentation() {
  try {
    const saved = JSON.parse(localStorage.getItem(presentationKey));
    if (typeof saved?.title === 'string') titleField.value = saved.title;
    if (typeof saved?.notes === 'string') notesField.value = saved.notes;
  } catch { /* A blocked or older browser can still edit the work during this visit. */ }
}

function savePresentation() {
  try {
    localStorage.setItem(presentationKey, JSON.stringify({ title: titleField.value, notes: notesField.value }));
  } catch { /* Keep the text on screen when storage is unavailable. */ }
}

function clearPresentation() {
  for (const field of presentationFields) field.value = '';
  try {
    localStorage.removeItem(presentationKey);
  } catch { /* Storage may be unavailable. */ }
}

function syncCompletion() {
  const completed = location.hash === '#complete';
  if (completed === !completeView.hidden) return;
  fullscreenNotice.hidden = true;
  if (completed) {
    if (byId('camera').open) byId('close').click();
    selectPiece(null);
    board.inert = true;
    completeStage.append(board);
  } else {
    workspace.prepend(board);
    board.inert = false;
  }
  editorHeader.hidden = completed;
  editorView.hidden = completed;
  completeView.hidden = !completed;
  fitPresentationFields();
  window.scrollTo(0, 0);
  (completed ? completeBack : completeButton).focus({ preventScroll: true });
}

completeButton.addEventListener('click', () => {
  history.pushState({ parfaitCompleted: true }, '', '#complete');
  syncCompletion();
});
completeBack.addEventListener('click', () => {
  if (history.state?.parfaitCompleted) {
    history.back();
  } else {
    history.replaceState(history.state, '', location.pathname + location.search);
    syncCompletion();
  }
});
window.addEventListener('hashchange', syncCompletion);
window.addEventListener('resize', fitPresentationFields);
for (const field of presentationFields) {
  field.addEventListener('input', () => {
    fitPresentationFields();
    savePresentation();
  });
}

function syncFullscreen() {
  const fullscreen = Boolean(document.fullscreenElement);
  for (const button of fullscreenButtons) {
    button.textContent = fullscreen ? '全画面解除' : '全画面表示';
    button.disabled = !fullscreen && (!document.fullscreenEnabled || !document.documentElement.requestFullscreen);
    button.title = button.disabled ? 'このブラウザでは全画面表示を利用できません。' : '';
  }
  fitPresentationFields();
}

async function toggleFullscreen() {
  fullscreenNotice.hidden = true;
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  } catch {
    fullscreenNotice.textContent = '全画面表示を切り替えられませんでした。';
    fullscreenNotice.hidden = false;
  }
  syncFullscreen();
}

for (const button of fullscreenButtons) button.addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', syncFullscreen);
loadPresentation();
syncCompletion();
syncFullscreen();
