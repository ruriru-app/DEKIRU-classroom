(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);
  const ui = {
    level: byId('level-select'),
    selection: byId('store-selection'),
    visit: byId('visit-view'),
    shopName: byId('shop-name'),
    clerk: byId('clerk-message'),
    menu: byId('shop-menu'),
    transcript: byId('speech-result'),
    mic: byId('mic-button'),
    cancelMic: byId('cancel-mic'),
    fallback: byId('speech-fallback'),
    typedLabel: byId('typed-phrase-label'),
    typedOrder: byId('typed-order'),
    submitTyped: byId('submit-typed-order'),
    showTyped: byId('show-typed-order'),
    payment: byId('payment-display'),
    pay: byId('pay-button'),
    replay: byId('replay-button'),
    leave: byId('leave-button'),
    venue: byId('venue-button'),
    list: byId('shopping-list'),
    listCount: byId('list-count'),
    orderTray: byId('order-tray'),
    bought: byId('bought-items'),
    party: byId('party-dialog'),
    partyArt: byId('party-venue-art'),
    partyResult: byId('party-result'),
    closeParty: byId('close-party'),
    nextLevel: byId('next-level'),
  };

  const stores = {
    burger: 'バーガーショップ',
    pizza: 'ピザ屋さん',
    western: '洋食屋さん',
    japanese: '和食屋さん',
  };
  const unlockLevels = { burger: 1, western: 2, pizza: 3, japanese: 4 };
  const maxLevel = Math.max(...Object.values(unlockLevels));
  const progressKey = 'ruriru-party-shopping-unlocked-level';
  const priceQuestion = 'How much is it?';
  const askPriceMessage = `金額を聞いてみよう。「${priceQuestion}」`;
  const orderPrompt = `買う品物をまとめて注文し、続けて「${priceQuestion}」と聞いてみよう。`;
  const menus = {
    burger: [
      { id: 'hamburger', name: 'Hamburger', alt: 'ハンバーガー', price: 300, image: 'product-hamburger-menu-v1.png', spoken: 'hamburgers?|burgers?' },
      { id: 'cheeseburger', name: 'Cheeseburger', alt: 'チーズバーガー', price: 450, image: 'product-cheeseburger-menu-v1.png', spoken: 'cheeseburgers?' },
      { id: 'french-fries', name: 'French fries', alt: 'フライドポテト', price: 200, image: 'product-french-fries-menu-v4.png', spoken: '(?:french )?fries' },
      { id: 'orange-juice', name: 'Orange juice', alt: 'オレンジジュース', price: 100, image: 'product-orange-juice-menu-v1.png', spoken: 'orange juices?', containers: 'cups?|glass(?:es)?' },
    ],
    western: [
      { id: 'sandwich', name: 'Sandwich', alt: 'サンドイッチ', price: 450, image: 'western-sandwich.webp', spoken: 'sandwich(?:es)?' },
      { id: 'steak', name: 'Steak', alt: 'ステーキ', price: 950, image: 'western-steak.webp', spoken: 'steaks?' },
      { id: 'spaghetti', name: 'Spaghetti', alt: 'スパゲッティ', price: 680, image: 'western-spaghetti.webp', spoken: 'spaghetti' },
      { id: 'salad', name: 'Salad', alt: 'サラダ', price: 280, image: 'western-salad.webp', spoken: 'salads?' },
      { id: 'cake', name: 'Cake', alt: 'ケーキ', price: 350, image: 'western-cake.webp', spoken: 'cakes?' },
      { id: 'pudding', name: 'Pudding', alt: 'プリン', price: 250, image: 'western-pudding.webp', spoken: 'puddings?' },
      { id: 'ice-cream', name: 'Ice cream', alt: 'アイスクリーム', price: 220, image: 'western-ice-cream.webp', spoken: 'ice[ -]?creams?' },
    ],
    pizza: [
      { id: 'margherita', name: 'Tomato Cheese Pizza', alt: 'トマトとチーズのピザ', price: 750, image: 'pizza-margherita.webp', spoken: 'tomato (?:and )?cheese pizzas?' },
      { id: 'pepperoni', name: 'Pepperoni Pizza', alt: 'ペパロニピザ', price: 850, image: 'pizza-pepperoni.webp', spoken: 'pepperoni(?: pizzas?)?' },
      { id: 'four-cheese', name: 'Four Cheese Pizza', alt: 'フォーチーズピザ', price: 850, image: 'pizza-four-cheese.webp', spoken: '(?:four|4)[ -]cheese pizzas?' },
      { id: 'seafood', name: 'Seafood Pizza', alt: 'シーフードピザ', price: 950, image: 'pizza-seafood.webp', spoken: 'sea ?food pizzas?' },
      { id: 'fried-chicken', name: 'Fried Chicken', alt: 'フライドチキン', price: 350, image: 'pizza-fried-chicken.webp', spoken: 'fried chicken' },
      { id: 'popcorn', name: 'Popcorn', alt: 'ポップコーン', price: 250, image: 'pizza-popcorn.webp', spoken: 'popcorn', containers: 'box(?:es)?' },
      { id: 'cola', name: 'Cola', alt: 'コーラ', price: 200, image: 'pizza-cola.webp', spoken: 'colas?', containers: 'cups?' },
    ],
    japanese: [
      { id: 'rice-ball', name: 'Rice Ball', alt: 'おにぎり', price: 180, image: 'japanese-rice-ball.webp', spoken: 'rice balls?', portions: '' },
      { id: 'sushi', name: 'Sushi', alt: '寿司', price: 780, image: 'japanese-sushi-v2.webp', spoken: 'sushi', portions: 'plates?|orders?' },
      { id: 'beef-bowl', name: 'Beef Bowl', alt: '牛丼', price: 650, image: 'japanese-beef-bowl.webp', spoken: 'beef bowls?', portions: '' },
      { id: 'soba', name: 'Soba', alt: 'そば', price: 480, image: 'japanese-soba-v2.webp', spoken: 'soba', portions: 'bowls?|orders?' },
      { id: 'tempura', name: 'Tempura', alt: 'てんぷら', price: 580, image: 'japanese-tempura-v2.webp', spoken: 'tempura', portions: 'orders?|pieces?' },
      { id: 'green-tea', name: 'Green Tea', alt: '緑茶', price: 150, image: 'japanese-green-tea.webp', spoken: 'green teas?', portions: 'cups?' },
      { id: 'matcha-parfait', name: 'Matcha Parfait', alt: '抹茶パフェ', price: 450, image: 'japanese-matcha-parfait.webp', spoken: 'matcha parfaits?', portions: '' },
    ],
  };
  const smallNumbers = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = window.speechSynthesis;
  const canSpeak = Boolean(synth && typeof window.SpeechSynthesisUtterance === 'function');
  const clerkVoices = {
    burger: { gender: 'female', pitch: 1.09, rate: 0.86 },
    western: { gender: 'male', pitch: 1.02, rate: 0.86 },
    pizza: { gender: 'female', pitch: 0.98, rate: 0.85 },
    japanese: { gender: 'male', pitch: 0.9, rate: 0.83 },
  };
  // SpeechSynthesisVoice exposes a name and language, but no gender field.
  const knownVoices = {
    female: /\b(female|zira|jenny|aria|hazel|susan|sonia|linda|catherine|samantha|karen|moira|tessa|victoria)\b/i,
    male: /\b(male|david|mark|guy|george|ryan|richard|james|sean|alex|daniel|fred|tom)\b/i,
  };
  synth?.getVoices();
  const keyButtons = Array.from(document.querySelectorAll('[data-key]'));
  const shopTiles = Array.from(document.querySelectorAll('.store-card[data-store]'));
  const purchasedStores = new Set();
  const listGroups = new Map();
  const productAudioButtons = [];
  let highestUnlockedLevel = readUnlockedLevel();
  let currentLevel = 1;
  let route = createRoute(currentLevel);
  let state = 'browse';
  let store = null;
  let expression = 'normal';
  let amount = '';
  let typedVisible = !Recognition;
  let visitGeneration = 0;
  let utteranceGeneration = 0;
  let activeSpeech = null;
  let speechTimer = null;
  let recognition = null;
  let pendingCapture = null;
  let stopping = false;
  let lastClerkAudio = '';
  let visitClerkVoice;

  function readUnlockedLevel() {
    try {
      const level = Number(window.localStorage.getItem(progressKey));
      if (Number.isInteger(level) && level >= 1 && level <= maxLevel) return level;
    } catch (_) { /* Progress still works within this session if storage is unavailable. */ }
    return 1;
  }

  function updateLevelControls() {
    for (const option of ui.level.options) {
      option.disabled = Number(option.value) > highestUnlockedLevel;
    }
    for (const tile of shopTiles) {
      const shop = tile.dataset.store;
      const locked = !route.has(shop);
      tile.disabled = locked;
      tile.classList.toggle('locked', locked);
      const badge = tile.querySelector('.coming-label');
      if (badge) {
        badge.textContent = `LEVEL ${unlockLevels[shop]}で開放`;
        badge.hidden = !locked;
      }
    }
  }

  function unlockNextLevel() {
    const nextLevel = currentLevel + 1;
    if (nextLevel <= highestUnlockedLevel || nextLevel > maxLevel) return;
    highestUnlockedLevel = Math.max(nextLevel, readUnlockedLevel());
    try {
      window.localStorage.setItem(progressKey, String(highestUnlockedLevel));
    } catch (_) { /* Keep the unlock in memory when storage is unavailable. */ }
    updateLevelControls();
  }

  function createRoute(level) {
    const selectedLevel = Number(level) || 1;
    const shops = new Map();
    for (const [shop, unlockLevel] of Object.entries(unlockLevels)) {
      if (selectedLevel < unlockLevel) continue;
      const products = menus[shop].slice();
      for (let index = products.length - 1; index > 0; index -= 1) {
        const other = Math.floor(Math.random() * (index + 1));
        [products[index], products[other]] = [products[other], products[index]];
      }
      shops.set(shop, products.slice(0, 2).map((product, index) => ({
        product,
        quantity: shop === 'burger' && index === 0 ? 2 : 1,
      })));
    }
    return shops;
  }

  function createElement(tag, className = '', text = '') {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
  }

  function productImage(product, className = '', alt = '') {
    const image = createElement('img', className);
    image.src = `./assets/${product.image}`;
    image.alt = alt;
    return image;
  }

  function buildShoppingList() {
    ui.list.replaceChildren();
    listGroups.clear();
    productAudioButtons.length = 0;
    for (const [shop, lines] of route) {
      const group = createElement('section', 'list-store');
      group.id = `list-${shop}`;
      group.dataset.listStore = shop;
      const heading = createElement('h3');
      heading.id = `${shop}-list-title`;
      group.setAttribute('aria-labelledby', heading.id);
      const button = createElement('button', 'list-shop-button');
      button.type = 'button';
      button.dataset.store = shop;
      const number = createElement('span', 'list-shop-number', String(listGroups.size + 1).padStart(2, '0'));
      number.setAttribute('aria-hidden', 'true');
      const check = createElement('b', 'completion-check', '✓');
      check.setAttribute('aria-label', '購入済み');
      const arrow = createElement('span', 'list-shop-arrow', '→');
      arrow.setAttribute('aria-hidden', 'true');
      const marks = createElement('span', 'list-shop-marks');
      marks.append(check, arrow);
      button.append(number, stores[shop], marks);
      heading.append(button);
      group.append(heading);
      for (const { product, quantity } of lines) {
        const row = createElement('button', 'list-line list-audio-button');
        row.type = 'button';
        row.dataset.product = product.id;
        row.setAttribute('aria-label', `${product.name} ×${quantity} の発音を聞く`);
        row.addEventListener('click', () => speakProduct(product.name));
        productAudioButtons.push(row);
        const name = createElement('span', 'list-item-name', product.name);
        name.lang = 'en';
        const count = createElement('strong', '', `×${quantity}`);
        count.setAttribute('aria-label', `${quantity}個`);
        row.append(productImage(product), name, count);
        group.append(row);
      }
      listGroups.set(shop, group);
      ui.list.append(group);
    }
  }

  function routeComplete() {
    return purchasedStores.size === route.size;
  }

  function setMessage(message, nextExpression = 'normal') {
    ui.clerk.textContent = message;
    expression = nextExpression;
  }

  function canEnterPhrase() {
    return state === 'ordering' || state === 'asking-price';
  }

  function render() {
    const inShop = state !== 'browse';
    const enteringPhrase = canEnterPhrase();
    const askingPrice = state === 'asking-price';
    const listening = state === 'listening';
    const awaitingPayment = state === 'awaiting-payment';
    const clerkSpeaking = activeSpeech === 'clerk';

    ui.selection.hidden = inShop;
    ui.selection.dataset.level = String(currentLevel);
    ui.visit.hidden = !inShop;
    ui.visit.dataset.store = store || '';
    ui.visit.dataset.expression = expression;
    ui.visit.classList.toggle('is-speaking', clerkSpeaking);
    ui.mic.hidden = !Recognition || !(enteringPhrase || listening);
    ui.mic.disabled = Boolean(activeSpeech) || stopping;
    ui.mic.textContent = listening ? (stopping ? '確定中…' : 'できた！') : 'マイクスタート';
    ui.mic.setAttribute('aria-pressed', String(listening));
    ui.cancelMic.hidden = !listening;
    ui.cancelMic.disabled = stopping;
    ui.fallback.hidden = !(enteringPhrase && typedVisible);
    ui.typedLabel.textContent = askingPrice ? '金額を英語でたずねる' : '注文と金額の質問を英語で入力';
    ui.typedOrder.placeholder = askingPrice ? priceQuestion : `注文のあとに ${priceQuestion}`;
    ui.typedOrder.disabled = !enteringPhrase || clerkSpeaking;
    ui.submitTyped.textContent = askingPrice ? '金額を聞く' : '注文する';
    ui.submitTyped.disabled = !enteringPhrase || clerkSpeaking;
    if (ui.showTyped) {
      ui.showTyped.hidden = !Recognition || !enteringPhrase;
      ui.showTyped.disabled = clerkSpeaking;
      ui.showTyped.setAttribute('aria-expanded', String(typedVisible));
      ui.showTyped.textContent = typedVisible ? 'キーボード入力を閉じる' : 'キーボードで入力する';
    }
    ui.payment.textContent = amount ? `¥ ${Number(amount).toLocaleString('ja-JP')}` : '¥ —';
    keyButtons.forEach((button) => { button.disabled = !awaitingPayment; });
    ui.pay.disabled = !awaitingPayment || !amount;
    ui.replay.disabled = !inShop || !lastClerkAudio || listening;
    ui.leave.disabled = false;
    ui.venue.disabled = !routeComplete();
    productAudioButtons.forEach((button) => { button.disabled = !canSpeak || listening || clerkSpeaking; });
    let completedTypes = 0;
    let totalTypes = 0;
    for (const [shop, lines] of route) {
      const completed = purchasedStores.has(shop);
      const group = listGroups.get(shop);
      group.classList.toggle('is-complete', completed);
      group.querySelector('.list-shop-button').disabled = inShop;
      if (completed) completedTypes += lines.length;
      totalTypes += lines.length;
    }
    ui.listCount.textContent = `${completedTypes} / ${totalTypes}種類`;
    ui.bought.hidden = !purchasedStores.has(store) || !ui.orderTray.hidden;
  }

  function cancelSpeech() {
    utteranceGeneration += 1;
    clearTimeout(speechTimer);
    speechTimer = null;
    activeSpeech = null;
    if (synth) synth.cancel();
  }

  function chooseEnglishVoice(gender) {
    const english = synth.getVoices().filter((voice) => /^en\b/i.test(voice.lang));
    const matching = gender ? english.filter((voice) => knownVoices[gender].test(voice.name)) : [];
    const american = (voice) => /^en-us$/i.test(voice.lang);
    return matching.find((voice) => american(voice) && voice.localService)
      || matching.find(american)
      || matching.find((voice) => voice.localService)
      || matching[0]
      || english.find((voice) => american(voice) && voice.localService)
      || english.find(american)
      || english[0];
  }

  function playSpeech(text, { voice, rate, pitch, kind }) {
    cancelSpeech();
    const visit = visitGeneration;
    const utteranceId = utteranceGeneration;
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = voice?.lang || 'en-US';
    utterance.rate = rate;
    utterance.pitch = pitch;
    if (voice) utterance.voice = voice;
    activeSpeech = kind;
    const finish = () => {
      if (visit !== visitGeneration || utteranceId !== utteranceGeneration) return;
      clearTimeout(speechTimer);
      speechTimer = null;
      activeSpeech = null;
      render();
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    // Some browsers never emit an end event for a blocked utterance.
    speechTimer = setTimeout(() => {
      if (visit !== visitGeneration || utteranceId !== utteranceGeneration) return;
      synth.cancel();
      finish();
    }, 12000);
    render();
    try {
      synth.speak(utterance);
    } catch (_) {
      finish();
    }
  }

  function speak(text) {
    lastClerkAudio = text;
    if (!canSpeak) {
      render();
      return;
    }
    const { gender, rate, pitch } = clerkVoices[store];
    if (visitClerkVoice === undefined) visitClerkVoice = chooseEnglishVoice(gender) ?? null;
    playSpeech(text, { voice: visitClerkVoice, rate, pitch, kind: 'clerk' });
  }

  function speakProduct(name) {
    if (!canSpeak || state === 'listening' || activeSpeech === 'clerk') return;
    playSpeech(name, { voice: chooseEnglishVoice(), rate: 0.86, pitch: 1, kind: 'product' });
  }

  function abandonRecognition() {
    const active = recognition;
    recognition = null;
    pendingCapture = null;
    stopping = false;
    if (active) {
      try { active.abort(); } catch (_) { /* The session may already be closed. */ }
    }
  }

  function renderMenu() {
    ui.menu.replaceChildren();
    for (const product of menus[store]) {
      const card = createElement('div', 'menu-card');
      card.dataset.product = product.id;
      card.append(productImage(product, 'menu-image'), createElement('span', 'menu-item-name', product.name));
      ui.menu.append(card);
    }
  }

  function prepareTray(lines) {
    for (const { product, quantity } of lines) {
      for (let unit = 0; unit < quantity; unit += 1) {
        ui.orderTray.append(productImage(product, '', product.alt));
      }
    }
    ui.orderTray.hidden = false;
  }

  function enterShop(nextStore) {
    if (!route.has(nextStore)) return;
    visitGeneration += 1;
    abandonRecognition();
    cancelSpeech();
    ui.orderTray.replaceChildren();
    ui.orderTray.hidden = true;
    store = nextStore;
    amount = '';
    ui.transcript.textContent = '';
    ui.typedOrder.value = '';
    typedVisible = !Recognition;
    lastClerkAudio = '';
    visitClerkVoice = undefined;
    ui.shopName.textContent = stores[store];
    renderMenu();
    if (purchasedStores.has(store)) {
      state = 'paid';
      setMessage(routeComplete() ? 'このお店のお買い物はできました。パーティー会場へ行きましょう。' : 'このお店のお買い物はできました。リストを見て、残りのお買い物を続けましょう。');
      render();
    } else {
      state = 'ordering';
      setMessage(`Hello! What would you like? ${orderPrompt}`);
      speak('Hello! What would you like?');
    }
  }

  function leaveShop() {
    visitGeneration += 1;
    abandonRecognition();
    cancelSpeech();
    ui.orderTray.replaceChildren();
    ui.orderTray.hidden = true;
    state = 'browse';
    store = null;
    expression = 'normal';
    amount = '';
    lastClerkAudio = '';
    visitClerkVoice = undefined;
    ui.transcript.textContent = '';
    ui.typedOrder.value = '';
    render();
  }

  function isCorrectOrder(raw, lines, fromSpeech) {
    let order = raw.toLowerCase()
      .replace(/[’‘`]/g, "'")
      .replace(/\bi\s*'\s*d\b/g, 'i would')
      .replace(/\bi\s*'\s*ll\b/g, 'i will')
      .replace(/[.!?]/g, ' ')
      .replace(/,\s*(?=please\b)/g, ' ')
      .replace(/,+\s*$/g, ' ')
      .replace(/,\s*(?=and\b)/g, ' ')
      .replace(/,/g, ' and ')
      .replace(/\s+/g, ' ')
      .trim();
    order = order.replace(/^please\s+/, '').replace(/\s+please$/, '').trim();
    order = order.replace(/^(?:i would like(?: to (?:order|have))?|can i (?:have|get)|could i (?:have|get)|may i have|i (?:want|will have))\s+/, '');
    order = order.replace(/\s+please$/, '').trim();
    const two = fromSpeech ? '(?:two|2|to)' : '(?:two|2)';
    // A conjunction inside a product name is not a separator.
    const itemSeparator = new RegExp(`\\s+and\\s+(?=(?:one|1|a|an|${two})\\b)`);
    const parts = order.split(itemSeparator);
    if (parts.length !== lines.length) return false;
    return lines.every(({ product, quantity }) => {
      const quantityWords = quantity === 2 ? two : '(?:one|1|a|an)';
      const containers = product.containers ? `|${product.containers}` : '';
      const portionWords = product.portions ?? `orders?|portions?|servings?|pieces?|slices?|scoops?|bowls?${containers}`;
      const portion = portionWords ? `(?:(?:${portionWords}) of )?` : '';
      const item = new RegExp(`^${quantityWords} ${portion}(?:${product.spoken})$`);
      return parts.some((part) => item.test(part));
    });
  }

  function englishNumber(value) {
    if (value < 20) return smallNumbers[value];
    if (value < 100) {
      const head = tens[Math.floor(value / 10)];
      const unit = value % 10;
      return unit ? `${head}-${smallNumbers[unit]}` : head;
    }
    const scale = value >= 1000 ? 1000 : 100;
    const label = scale === 1000 ? 'thousand' : 'hundred';
    const head = `${englishNumber(Math.floor(value / scale))} ${label}`;
    const remainder = value % scale;
    return remainder ? `${head} ${englishNumber(remainder)}` : head;
  }

  function shopTotal() {
    return route.get(store).reduce((total, { product, quantity }) => total + product.price * quantity, 0);
  }

  function speakTotal(total) {
    speak(`It's ${englishNumber(total)} yen.`);
  }

  function isCorrectPriceQuestion(text) {
    return /^how\s+much\s+is\s+it\s*[?.!]*$/i.test(text);
  }

  function acceptCapture(raw, { fromSpeech = false } = {}) {
    const lines = route.get(store);
    if (!lines || !canEnterPhrase()) return;
    ui.transcript.textContent = raw;
    if (!raw.trim()) {
      const retry = fromSpeech ? '声が聞き取れませんでした。' : '英語を入力してみましょう。';
      setMessage(state === 'asking-price' ? `${retry} ${askPriceMessage}` : retry, 'retry');
      render();
      return;
    }
    const text = raw.normalize('NFKC').trim();
    let question = text;
    if (state === 'ordering') {
      // Recognizers may omit sentence punctuation between the order and the question.
      const questionStart = text.search(/\b(?:how|what)\b/i);
      const order = questionStart < 0 ? text : text.slice(0, questionStart).trim();
      question = questionStart < 0 ? '' : text.slice(questionStart);
      if (!isCorrectOrder(order, lines, fromSpeech)) {
        const reply = lastClerkAudio === 'Pardon?' ? 'Would you say it again?' : 'Pardon?';
        setMessage(`${reply} 買い物リストを見て、もう一度注文してみよう。`, 'retry');
        speak(reply);
        return;
      }
      prepareTray(lines);
      lastClerkAudio = '';
      ui.typedOrder.value = '';
    }
    if (!isCorrectPriceQuestion(question)) {
      const firstAttempt = state === 'ordering';
      state = 'asking-price';
      setMessage(firstAttempt ? `注文はできたよ。 ${askPriceMessage}` : `もう一度聞いてみよう。「${priceQuestion}」`, 'retry');
      render();
      return;
    }
    state = 'awaiting-payment';
    amount = '';
    setMessage('聞こえた金額をテンキーで入力しましょう。');
    speakTotal(shopTotal());
  }

  function startListening() {
    if (!Recognition || !canEnterPhrase() || activeSpeech) return;
    const sessionVisit = visitGeneration;
    let active;
    try {
      active = new Recognition();
    } catch (_) {
      typedVisible = true;
      setMessage('マイクが使えません。キーボードで入力できます。');
      render();
      return;
    }
    const capture = { phase: state, text: '', ended: false };
    let recognitionFailed = false;
    recognition = active;
    pendingCapture = capture;
    stopping = false;
    active.lang = 'en-US';
    active.continuous = true;
    active.interimResults = false;
    active.maxAlternatives = 1;
    state = 'listening';
    ui.transcript.textContent = '';
    setMessage(capture.phase === 'asking-price'
      ? `「${priceQuestion}」と聞いて、「できた！」を押しましょう。`
      : `${orderPrompt} 終わったら「できた！」を押しましょう。`, capture.phase === 'asking-price' ? 'retry' : 'normal');
    render();
    const isCurrent = () => sessionVisit === visitGeneration && recognition === active && state === 'listening';
    active.onresult = (event) => {
      if (!isCurrent()) return;
      const pieces = [];
      for (let index = 0; index < event.results.length; index += 1) {
        if (event.results[index].isFinal) pieces.push(event.results[index][0].transcript);
      }
      capture.text = pieces.join(' ').trim();
    };
    active.onerror = (event) => {
      if (!isCurrent()) return;
      recognitionFailed = true;
      recognition = null;
      pendingCapture = null;
      stopping = false;
      state = capture.phase;
      const permissionFailure = event.error === 'not-allowed' || event.error === 'service-not-allowed';
      if (permissionFailure) typedVisible = true;
      const message = permissionFailure ? 'マイクを使えませんでした。キーボードでも入力できます。' : 'うまく聞き取れませんでした。もう一度話してみましょう。';
      setMessage(message, event.error === 'no-speech' ? 'retry' : 'normal');
      render();
    };
    active.onend = () => {
      if (recognitionFailed || !isCurrent()) return;
      capture.ended = true;
      if (stopping) commitCapture();
      else render();
    };
    try {
      active.start();
    } catch (_) {
      recognition = null;
      pendingCapture = null;
      stopping = false;
      state = capture.phase;
      typedVisible = true;
      setMessage('マイクを使えませんでした。キーボードでも入力できます。');
      render();
    }
  }

  function commitCapture() {
    if (state !== 'listening' || !pendingCapture) return;
    const { phase, text } = pendingCapture;
    recognition = null;
    pendingCapture = null;
    stopping = false;
    state = phase;
    acceptCapture(text, { fromSpeech: true });
  }

  function finishListening() {
    if (state !== 'listening' || !recognition || stopping) return;
    if (pendingCapture && pendingCapture.ended) {
      commitCapture();
      return;
    }
    stopping = true;
    render();
    try {
      recognition.stop();
    } catch (_) {
      if (!pendingCapture) return;
      state = pendingCapture.phase;
      abandonRecognition();
      setMessage('もう一度、マイクを押して話してみましょう。');
      render();
    }
  }

  function cancelListening() {
    if (!pendingCapture) return;
    state = pendingCapture.phase;
    abandonRecognition();
    const askingPrice = state === 'asking-price';
    setMessage(askingPrice ? askPriceMessage : orderPrompt, askingPrice ? 'retry' : 'normal');
    render();
  }

  function usePaymentKey(key) {
    if (state !== 'awaiting-payment') return;
    if (key === 'clear') amount = '';
    else if (key === 'backspace') amount = amount.slice(0, -1);
    else if (/^\d$/.test(key) && amount.length < 5) amount += key;
    render();
  }

  function pay() {
    if (state !== 'awaiting-payment' || !amount) return;
    const total = shopTotal();
    if (Number(amount) !== total) {
      amount = '';
      setMessage('もう一度、金額を聞いて入力しましょう。', 'retry');
      speakTotal(total);
      return;
    }
    purchasedStores.add(store);
    state = 'paid';
    setMessage(routeComplete() ? 'お買い物できました！ パーティー会場へ行きましょう。' : 'お買い物できました！ リストを見て、残りのお買い物を続けましょう。');
    speak('Thank you! Have a nice day!');
  }

  shopTiles.forEach((button) => {
    button.addEventListener('click', () => enterShop(button.dataset.store));
  });
  ui.list.addEventListener('click', (event) => {
    const button = event.target.closest('.list-shop-button');
    if (state !== 'browse' || !button) return;
    enterShop(button.dataset.store);
    ui.shopName.focus();
  });
  keyButtons.forEach((button) => {
    button.addEventListener('click', () => usePaymentKey(button.dataset.key));
  });
  ui.mic.addEventListener('click', () => {
    if (state === 'listening') finishListening();
    else startListening();
  });
  ui.cancelMic.addEventListener('click', cancelListening);
  const submitTyped = () => {
    if (!canEnterPhrase() || activeSpeech === 'clerk') return;
    acceptCapture(ui.typedOrder.value);
  };
  ui.submitTyped.addEventListener('click', submitTyped);
  ui.typedOrder.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitTyped();
    }
  });
  if (ui.showTyped) {
    ui.showTyped.addEventListener('click', () => {
      if (!canEnterPhrase() || activeSpeech === 'clerk') return;
      typedVisible = !typedVisible;
      render();
      if (typedVisible) ui.typedOrder.focus();
    });
  }
  ui.pay.addEventListener('click', pay);
  ui.replay.addEventListener('click', () => {
    if (state !== 'browse' && state !== 'listening' && lastClerkAudio) speak(lastClerkAudio);
  });
  ui.leave.addEventListener('click', () => {
    const button = listGroups.get(store)?.querySelector('.list-shop-button');
    leaveShop();
    button?.focus();
  });
  function selectLevel(level) {
    if (!Number.isInteger(level) || level < 1 || level > highestUnlockedLevel) {
      ui.level.value = String(currentLevel);
      return;
    }
    if (level === currentLevel) return;
    currentLevel = level;
    ui.level.value = String(level);
    ui.partyArt.src = `./assets/party-venue-level${level}.webp`;
    route = createRoute(currentLevel);
    purchasedStores.clear();
    buildShoppingList();
    updateLevelControls();
    leaveShop();
  }
  ui.level.addEventListener('change', () => selectLevel(Number(ui.level.value)));
  function closeParty() {
    if (typeof ui.party.close === 'function') ui.party.close();
    else ui.party.removeAttribute('open');
  }
  ui.venue.addEventListener('click', () => {
    if (!routeComplete()) return;
    cancelSpeech();
    const previousUnlock = highestUnlockedLevel;
    unlockNextLevel();
    const next = currentLevel + 1;
    ui.partyResult.textContent = previousUnlock < next && next <= highestUnlockedLevel
      ? `LEVEL ${next}が開放されたよ！`
      : '買い出し、できたね！';
    ui.nextLevel.hidden = next > highestUnlockedLevel;
    ui.nextLevel.textContent = `LEVEL ${next}へ進む`;
    if (typeof ui.party.showModal === 'function') ui.party.showModal();
    else ui.party.setAttribute('open', '');
    render();
  });
  ui.closeParty.addEventListener('click', closeParty);
  ui.nextLevel.addEventListener('click', () => {
    if (ui.nextLevel.hidden) return;
    closeParty();
    selectLevel(currentLevel + 1);
    ui.level.focus();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state === 'listening') {
      event.preventDefault();
      cancelListening();
    }
  });
  window.addEventListener('pagehide', () => {
    visitGeneration += 1;
    cancelSpeech();
    if (pendingCapture) cancelListening();
    else render();
  });
  ui.level.value = String(currentLevel);
  updateLevelControls();
  buildShoppingList();
  render();
})();
