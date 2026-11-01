const {
  PRODUCTS,
  createOrderStore,
  formatYen,
  productArtwork,
  counterTopY,
} = globalThis.RuRiRu;
const { createCounterSession, counterGeometry } = globalThis.RuRiRuCounter;
let serviceUI;

const store = createOrderStore(PRODUCTS);
const counter = createCounterSession(store);
const mainGrid = document.querySelector('#main-grid');
const sideDessertGrid = document.querySelector('#side-dessert-grid');
const drinkGrid = document.querySelector('#drink-grid');
const totalValue = document.querySelector('#total-value');
const transcript = document.querySelector('#transcript');
const micAction = document.querySelector('#mic-action');
const servedItems = document.querySelector('#served-items');
const customerLayer = document.querySelector('#customer-layer');
const customerImages = [...document.querySelectorAll('[data-customer-expression]')];
const preparedItems = document.querySelector('#prepared-items');
const preparationStatus = document.querySelector('#preparation-status');
let lastCounterMarkupKey = '';
let customerProfile = globalThis.RuRiRuCustomers.CUSTOMERS[0];
let portraitGeneration = 0, lastLoadedExpression = '';
const portraitStates = new Map();
// Warm all expressions before their customer arrives; retain the four layered
// images so expression changes never replace the character element.
const customerPreloads = globalThis.RuRiRuCustomers.CUSTOMERS.flatMap(profile =>
  Object.values(profile.expressions).map(src => {
    const image = document.createElement('img'); image.src = src; return image;
  }));

function artworkMarkup(product, surface = 'menu') {
  const artwork = productArtwork(product, surface);
  if (artwork.kind === 'layers') {
    const images = artwork.layers.filter((layer) => surface === 'menu' || layer.role !== 'marker').map((layer) => {
      const aspectRatio = layer.preserveAspectRatio
        ? ` preserveAspectRatio="${layer.preserveAspectRatio}"` : '';
      return `<image data-layer="${layer.role}" href="${layer.src}" x="${layer.x}" y="${layer.y}" width="${layer.width}" height="${layer.height}"${aspectRatio}/>`;
    }).join('');
    return `<svg class="product-image" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${images}</svg>`;
  }
  return artwork.kind === 'image'
    ? `<img class="product-image" src="${artwork.src}" alt="" draggable="false" />`
    : artwork.value;
}

function syncCustomerToCounter() {
  const counterLine = counterTopY(window.innerWidth, window.innerHeight);
  const speechTop = document.querySelector('#you-said').getBoundingClientRect().top;
  const menuBottom = Math.max(
    document.querySelector('#side-dessert-menu').getBoundingClientRect().bottom,
    document.querySelector('#drink-menu').getBoundingClientRect().bottom,
  );
  const geometry = counterGeometry(window.innerWidth, window.innerHeight, speechTop, menuBottom);
  const tray = document.querySelector('#tray').getBoundingClientRect();
  const service = document.querySelector('#service-window').getBoundingClientRect();
  const neutral = customerImages.find(image => image.dataset.customerExpression === 'neutral');
  const portrait = globalThis.RuRiRuCustomers.customerGeometry({
    profile: customerProfile, counterY: counterLine,
    topLimit: document.querySelector('#main-menu').getBoundingClientRect().bottom + 10,
    gapLeft: service.left, gapRight: service.right, viewportHeight: window.innerHeight,
    aspectRatio: neutral?.naturalWidth && neutral.naturalHeight ? neutral.naturalWidth / neutral.naturalHeight : undefined,
  });
  const preparationLeft = tray.left + 78;
  const preparationWidth = Math.max(0, tray.right - preparationLeft - 8);
  const serviceWidth = Math.max(0, service.width - 16);
  const unitSize = Math.min(geometry.unitSize, preparationWidth / 7.2);
  const values = {
    '--counter-top-y': counterLine,
    '--counter-art-height': geometry.foregroundHeight,
    '--service-front-y': geometry.serviceFront,
    '--work-back-y': geometry.workBack,
    '--work-front-y': geometry.workFront,
    '--preparation-left': preparationLeft,
    '--preparation-width': preparationWidth,
    '--work-unit-size': unitSize,
    '--work-row-gap': geometry.rowGap,
    '--work-front-drop': Math.min(12, (geometry.workFront - geometry.workBack) * .18),
    '--service-left': service.left + 8,
    '--service-width': serviceWidth,
    '--service-depth': geometry.serviceFront - geometry.counterRear,
    '--service-unit-size': Math.min(76, serviceWidth / 7.2),
    '--handoff-lift': geometry.workFront - geometry.serviceFront,
    '--customer-left': portrait.left,
    '--customer-width': portrait.width,
    '--customer-height': portrait.height,
  };
  for (const [name, value] of Object.entries(values)) document.documentElement.style.setProperty(name, `${value}px`);
  document.documentElement.style.setProperty('--customer-visible-offset', `${-100 * portrait.visibleFraction}%`);
}

function setCustomerProfile(profile) {
  customerProfile = profile;
  customerLayer.dataset.customerId = profile.id;
  const generation = ++portraitGeneration;
  portraitStates.clear(); lastLoadedExpression = '';
  for (const image of customerImages) {
    portraitStates.set(image.dataset.customerExpression, { image, attempts: 0, status: 'loading' });
  }
  refreshCustomerPortrait();
  for (const [expression, state] of portraitStates) loadCustomerPortrait(expression, state, profile, generation);
  syncCustomerToCounter();
}

function loadCustomerPortrait(expression, state, profile, generation) {
  const attempt = ++state.attempts;
  const current = () => generation === portraitGeneration && portraitStates.get(expression) === state &&
    state.attempts === attempt && state.status === 'loading';
  state.image.onload = () => {
    if (!current()) return;
    state.status = 'loaded'; lastLoadedExpression = expression;
    refreshCustomerPortrait(); syncCustomerToCounter();
  };
  state.image.onerror = () => {
    if (!current()) return;
    if (state.attempts < 2) loadCustomerPortrait(expression, state, profile, generation);
    else { state.status = 'failed'; refreshCustomerPortrait(); }
  };
  const src = profile.expressions[expression];
  state.image.src = attempt === 1 ? src : `${src}?portrait-retry=1`;
}

function refreshCustomerPortrait() {
  const requested = customerLayer.dataset.expression || 'neutral';
  const loaded = expression => portraitStates.get(expression)?.status === 'loaded';
  const visible = loaded(requested) ? requested : loaded('neutral') ? 'neutral' : loaded(lastLoadedExpression) ? lastLoadedExpression : '';
  const unavailable = portraitStates.size > 0 && [...portraitStates.values()].every(state => state.status === 'failed');
  customerLayer.dataset.visibleExpression = visible;
  customerLayer.dataset.portraitState = visible ? visible === requested ? 'ready' : 'fallback' : unavailable ? 'unavailable' : 'loading';
  customerLayer.setAttribute('aria-busy', String(!visible && !unavailable));
  const status = document.querySelector('#customer-image-status');
  status.hidden = Boolean(visible);
  status.textContent = unavailable ? 'お客さんの画像を読み込めませんでした。' : 'お客さんの画像を読み込んでいます…';
}

function setCustomerExpression(expression) {
  const allowed = customerLayer.dataset.expressionOptions.split(' ');
  customerLayer.dataset.expression = allowed.includes(expression) ? expression : 'neutral';
  refreshCustomerPortrait();
}

function makeCounterRow(row, surface) {
  const element = document.createElement('div');
  element.className = `counter-row is-${row.depth}`;
  element.style.setProperty('--row-count', row.units.length);
  for (const unit of row.units) {
    const item = document.createElement('span');
    item.className = `counter-unit ${surface === 'preparing' ? 'prepared-unit' : 'served-unit'}`;
    item.dataset.productId = unit.id;
    item.dataset.category = unit.product.category;
    item.dataset.unitKey = unit.key;
    item.setAttribute('role', 'img');
    item.setAttribute('aria-label', `${unit.product.name} ${unit.ordinal}個目`);
    item.innerHTML = artworkMarkup(unit.product, surface);
    element.append(item);
  }
  return element;
}

function makeCard(product, compact = false) {
  const artwork = productArtwork(product, 'menu');
  const artworkContent = artworkMarkup(product);
  const cardName = ['french-fries', 'onion-rings'].includes(product.id)
    ? product.name.replace(' ', '<br>')
    : product.name;
  const card = document.createElement('div');
  card.className = `product-card ${compact ? 'compact-card' : 'main-card'}`;
  card.dataset.productId = product.id;
  card.dataset.category = product.category;
  card.setAttribute('role', 'group');
  card.setAttribute('aria-label', product.name);
  card.innerHTML = `
    <span class="product-art tone-${product.tone}" data-art-id="${product.id}" data-art-type="${artwork.kind}" aria-hidden="true">${artworkContent}</span>
    <span class="card-copy"><strong>${cardName}</strong><span>${formatYen(product.price)}</span></span>
    <span class="menu-quantity" id="quantity-${product.id}" hidden>0個</span>
    <button class="product-add" type="button" aria-label="${product.name} ${formatYen(product.price)} をトレーに追加" aria-describedby="quantity-${product.id}"><span class="menu-plus" aria-hidden="true">＋</span></button>
    <button class="product-remove" type="button" aria-label="${product.name} をメニューで1つ減らす" disabled>−</button>
  `;
  card.querySelector('.product-add').addEventListener('click', () => {
    changePreparedQuantity(product.id, 1);
    card.classList.remove('just-added');
    void card.offsetWidth;
    card.classList.add('just-added');
  });
  card.querySelector('.product-remove').addEventListener('click', () => {
    changePreparedQuantity(product.id, -1);
  });
  return card;
}

function changePreparedQuantity(productId, change) {
  if (serviceUI && !serviceUI.canEdit()) return;
  const changed = change > 0 ? counter.add(productId) : counter.remove(productId);
  if (!changed) return;
  serviceUI?.itemsChanged();
  renderTray();
}

function syncMenuQuantities(items) {
  const quantities = new Map(items.map(({ id, quantity }) => [id, quantity]));
  document.querySelectorAll('.product-card').forEach((card) => {
    const quantity = quantities.get(card.dataset.productId) || 0;
    const badge = card.querySelector('.menu-quantity');
    badge.textContent = `${quantity}個`;
    badge.hidden = quantity === 0;
    const locked = serviceUI ? !serviceUI.canEdit() : false;
    card.querySelector('.product-remove').disabled = locked || quantity === 0;
    card.querySelector('.product-add').disabled = locked || counter.view().count >= counter.view().capacity;
    card.classList.toggle('has-items', quantity > 0);
  });
}

function renderProducts() {
  const main = PRODUCTS.filter(({ category }) => category === 'main');
  const sides = PRODUCTS.filter(({ category }) => category === 'side');
  const desserts = PRODUCTS.filter(({ category }) => category === 'dessert');
  const drinks = PRODUCTS.filter(({ category }) => category === 'drink');

  main.forEach((product) => mainGrid.append(makeCard(product)));
  sides.forEach((product, index) => {
    const card = makeCard(product, true);
    card.style.gridColumn = '1';
    card.style.gridRow = String(index + 1);
    sideDessertGrid.append(card);
  });
  desserts.forEach((product, index) => {
    const card = makeCard(product, true);
    card.style.gridColumn = '2';
    card.style.gridRow = String(index + 1);
    sideDessertGrid.append(card);
  });
  drinks.forEach((product) => drinkGrid.append(makeCard(product, true)));
}

function renderTray() {
  const view = counter.view();
  syncMenuQuantities(view.items);
  document.body.dataset.counterPhase = view.phase;
  preparationStatus.textContent = view.phase === 'presented'
    ? `受け渡し中 ${view.count}個` : `準備中 ${view.count}/${view.capacity}個`;
  const markupKey = JSON.stringify([view.phase, view.items.map(({ id, quantity }) => [id, quantity])]);
  if (markupKey !== lastCounterMarkupKey) {
    lastCounterMarkupKey = markupKey;
    preparedItems.hidden = view.phase === 'presented' || !view.count;
    preparedItems.replaceChildren(...(view.phase === 'preparing'
    ? view.preparingRows.map(row => makeCounterRow(row, 'preparing')) : []));
    servedItems.hidden = view.phase !== 'presented';
    servedItems.replaceChildren(...(view.phase === 'presented' ? view.trays.map((tray, index) => {
    const element = document.createElement('div');
    element.className = 'service-tray';
    element.setAttribute('aria-label', `${index + 1}枚目のトレー ${tray.units.length}個`);
    element.append(...tray.rows.map(row => makeCounterRow(row, 'serving')));
    return element;
  }) : []));
    servedItems.style.setProperty('--tray-count', view.trays.length || 1);
    servedItems.classList.toggle('is-presented', view.phase === 'presented');
  }
  totalValue.textContent = formatYen(view.total);
  syncCustomerToCounter();
}

function setMicState(state, retrySuggested = false) {
  const views = {
    idle: { className: retrySuggested ? 'start retry' : 'start', label: retrySuggested ? 'もう一度' : '<span aria-hidden="true">🎙</span>マイクスタート' },
    listening: { className: 'done', label: 'できた！' },
    review: { className: 'cancel', label: 'キャンセル' },
  };
  const view = views[state];
  micAction.className = `mic-button ${view.className}`;
  micAction.dataset.state = state;
  micAction.setAttribute('aria-pressed', String(state !== 'idle'));
  micAction.innerHTML = view.label;
  transcript.classList.toggle('listening', state === 'listening');
}

window.addEventListener('resize', syncCustomerToCounter);
setMicState('idle');
renderProducts();
renderTray();
serviceUI = globalThis.RuRiRuServiceUI.createServiceUI({
  products: PRODUCTS, counter,
  selectedItems: () => store.items().map(({ id, quantity }) => ({ id, quantity })),
  clearItems: () => { for (const { id, quantity } of store.items()) for (let n = 0; n < quantity; n++) counter.remove(id); },
  onRender: renderTray, setExpression: setCustomerExpression, setMicState, setCustomer: setCustomerProfile,
});
renderTray();
