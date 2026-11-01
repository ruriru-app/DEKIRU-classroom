(() => {
function dessertLayers(foodImage) {
  return [
    { role: 'plate', src: './assets/packaging-dessert-paper-plate-burger-only-v1.png', x: 0, y: 0, width: 100, height: 100 },
    { role: 'ruriru-word', src: './assets/brand-ruriru-curved-word-v1.png', x: 25.6685, y: 67.6389, width: 48.2643, height: 22.2859, preserveAspectRatio: 'none' },
    { role: 'food', src: foodImage, x: 12, y: 12, width: 76, height: 76 },
  ];
}

function drinkLayers(id) {
  return [
    { role: 'drink', src: `./assets/product-${id}-menu-v1.png`, x: 0, y: 0, width: 100, height: 100 },
    { role: 'marker', src: `./assets/drink-marker-${id}-v1.png`, x: 58, y: 60, width: 42, height: 40 },
  ];
}

const PRODUCTS = [
  { id: 'hamburger', category: 'main', name: 'Hamburger', price: 300, art: '🍔', menuImage: './assets/product-hamburger-menu-v1.png', tone: 'orange' },
  { id: 'cheeseburger', category: 'main', name: 'Cheeseburger', price: 450, art: '🍔', menuImage: './assets/product-cheeseburger-menu-v1.png', tone: 'yellow' },
  { id: 'double-cheeseburger', category: 'main', name: 'Double cheeseburger', price: 580, art: '🍔', menuImage: './assets/product-double-cheeseburger-menu-v1.png', tone: 'pink' },
  { id: 'chicken-burger', category: 'main', name: 'Chicken burger', price: 420, art: '🍔', menuImage: './assets/product-chicken-burger-menu-v1.png', tone: 'mint' },
  { id: 'fish-burger', category: 'main', name: 'Fish burger', price: 490, art: '🍔', menuImage: './assets/product-fish-burger-menu-v3.png', tone: 'blue' },
  { id: 'plant-based-burger', category: 'main', name: 'Plant-based burger', price: 530, art: '🍔', menuImage: './assets/product-plant-based-burger-menu-v1.png', tone: 'green' },
  { id: 'hot-dog', category: 'main', name: 'Hot dog', price: 280, art: '🌭', menuImage: './assets/product-hot-dog-menu-v1.png', tone: 'purple' },
  { id: 'chili-dog', category: 'main', name: 'Chili dog', price: 390, art: '🌭', menuImage: './assets/product-chili-dog-menu-v2.png', tone: 'coral' },
  { id: 'french-fries', category: 'side', name: 'French fries', price: 200, art: '🍟', menuImage: './assets/product-french-fries-menu-v4.png', tone: 'yellow' },
  { id: 'chicken-nuggets', category: 'side', name: 'Chicken nuggets', price: 350, art: '◒', menuImage: './assets/product-chicken-nuggets-menu-v4.png', tone: 'orange' },
  { id: 'salad', category: 'side', name: 'Salad', price: 260, art: '🥗', menuImage: './assets/product-salad-menu-v2.png', tone: 'green' },
  { id: 'onion-rings', category: 'side', name: 'Onion rings', price: 240, art: '◎', menuImage: './assets/product-onion-rings-menu-v6.png', tone: 'coral' },
  { id: 'ice-cream', category: 'dessert', name: 'Ice cream', price: 170, art: '🍦', menuImage: './assets/product-ice-cream-menu-v1.png', tone: 'blue' },
  { id: 'apple-pie', category: 'dessert', name: 'Apple pie', price: 230, art: '🥧', menuLayers: dessertLayers('./assets/product-apple-pie-menu-v1.png'), tone: 'pink' },
  { id: 'cookie', category: 'dessert', name: 'Cookie', price: 160, art: '🍪', menuLayers: dessertLayers('./assets/product-cookie-menu-v1.png'), tone: 'orange' },
  { id: 'donut', category: 'dessert', name: 'Donut', price: 210, art: '🍩', menuLayers: dessertLayers('./assets/product-donut-menu-v1.png'), tone: 'purple' },
  { id: 'orange-juice', category: 'drink', name: 'Orange juice', price: 100, art: '🍊', menuLayers: drinkLayers('orange-juice'), tone: 'orange' },
  { id: 'apple-juice', category: 'drink', name: 'Apple juice', price: 140, art: '🍎', menuLayers: drinkLayers('apple-juice'), tone: 'green' },
  { id: 'grape-juice', category: 'drink', name: 'Grape juice', price: 160, art: '🍇', menuImage: './assets/product-grape-juice-menu-v1.png', tone: 'purple' },
  { id: 'lemonade', category: 'drink', name: 'Lemonade', price: 230, art: '🍋', menuLayers: drinkLayers('lemonade'), tone: 'yellow' },
  { id: 'milkshake', category: 'drink', name: 'Milkshake', price: 300, art: '🥤', menuImage: './assets/product-milkshake-menu-v1.png', tone: 'pink' },
  { id: 'cola', category: 'drink', name: 'Cola', price: 190, art: '🥤', menuImage: './assets/product-cola-menu-v1.png', tone: 'coral' },
  { id: 'iced-tea', category: 'drink', name: 'Iced tea', price: 180, art: '🧋', menuLayers: drinkLayers('iced-tea'), tone: 'orange' },
  { id: 'water', category: 'drink', name: 'Water', price: 120, art: '💧', menuImage: './assets/product-water-menu-v1.png', tone: 'blue' },
];

function formatYen(value) {
  return `¥${value.toLocaleString('en-US')}`;
}

function productArtwork(product, surface = 'menu') {
  if (surface === 'preparing' || surface === 'serving') {
    if (product.category === 'main') {
      const isBurger = product.id.includes('burger');
      const foodWidth = isBurger ? 82 : 64;
      return { kind: 'layers', layers: [
        { role: 'wrapper', src: './assets/packaging-burger-wrapper-open-v1.png', x: isBurger ? -6 : 0, y: isBurger ? -2 : 12, width: isBurger ? 112 : 100, height: isBurger ? 112 : 88 },
        { role: 'food', src: product.menuImage, x: (100 - foodWidth) / 2, y: 0, width: foodWidth, height: 90 },
      ] };
    }
    if (product.menuLayers) return { kind: 'layers', layers: product.menuLayers.filter(layer => layer.role !== 'marker') };
    if (product.menuImage) return { kind: 'image', src: product.menuImage };
  }
  if (surface === 'menu' && product.menuLayers) {
    return { kind: 'layers', layers: product.menuLayers };
  }
  if (surface === 'menu' && product.menuImage) {
    return { kind: 'image', src: product.menuImage };
  }
  return { kind: 'text', value: product.art };
}

function createOrderStore(products = PRODUCTS) {
  const lookup = new Map(products.map((product) => [product.id, product]));
  const quantities = new Map();

  return {
    add(id) {
      if (!lookup.has(id)) return;
      quantities.set(id, (quantities.get(id) || 0) + 1);
    },
    remove(id) {
      const next = (quantities.get(id) || 0) - 1;
      if (next > 0) quantities.set(id, next);
      else quantities.delete(id);
    },
    items() {
      return products
        .filter(({ id }) => quantities.has(id))
        .map((product) => ({ ...product, quantity: quantities.get(product.id) }));
    },
    total() {
      return this.items().reduce((sum, item) => sum + item.price * item.quantity, 0);
    },
  };
}

function advanceMicState(state) {
  if (state === 'idle') return 'listening';
  if (state === 'listening') return 'review';
  return 'idle';
}

function isHereYouAre(value = '') {
  const normalized = String(value)
    .toLowerCase()
    .replace(/[^a-z]+/g, ' ')
    .trim();
  return /\b(?:here|hear) you are\b/.test(normalized);
}

function customerReactionForSpeech(value = '', hasPreparedItems = false) {
  const heard = String(value).trim();
  if (!heard || /聞き取れ|聞いています/.test(heard)) return 'troubled';
  if (isHereYouAre(heard)) return hasPreparedItems ? 'smile' : 'angry';
  return 'neutral';
}

function counterTopY(viewportWidth, viewportHeight) {
  const width = Number(viewportWidth);
  const height = Number(viewportHeight);
  const renderedArtworkWidth = Math.max(width, height * 1.5);
  return height / 2 + renderedArtworkWidth * (123 / 1536);
}

globalThis.RuRiRu = Object.freeze({
  PRODUCTS,
  createOrderStore,
  formatYen,
  productArtwork,
  advanceMicState,
  isHereYouAre,
  customerReactionForSpeech,
  counterTopY,
});
})();

