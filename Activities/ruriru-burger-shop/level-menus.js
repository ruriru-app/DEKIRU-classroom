(() => {
  // store.js remains the single runtime source for prices and artwork.
  const canonicalProducts = globalThis.RuRiRu?.PRODUCTS;
  const canonicalPrices = new Map((canonicalProducts || []).map(({ id, price }) => [id, price]));
  const LEVEL_PRODUCT_IDS = Object.freeze({
    1: Object.freeze(['hamburger', 'french-fries', 'orange-juice', 'milkshake']),
    2: Object.freeze(['hamburger', 'cheeseburger', 'french-fries', 'chicken-nuggets', 'orange-juice', 'milkshake']),
    3: Object.freeze(['hamburger', 'cheeseburger', 'hot-dog', 'french-fries', 'chicken-nuggets', 'ice-cream', 'orange-juice', 'milkshake']),
    4: Object.freeze((canonicalProducts || []).map(({ id }) => id)),
  });

  function getProducts(level, products = globalThis.RuRiRu?.PRODUCTS) {
    if (!Number.isInteger(level) || !Object.hasOwn(LEVEL_PRODUCT_IDS, level)) {
      throw new RangeError('LEVEL must be an integer from 1 to 4');
    }
    if (!canonicalPrices.size) throw new TypeError('Load store.js before level-menus.js to provide the canonical product catalog');
    if (!Array.isArray(products)) throw new TypeError('A product catalog array is required');
    const lookup = new Map();
    for (const product of products) {
      if (!product || typeof product.id !== 'string' || !product.id.trim() ||
        !Number.isSafeInteger(product.price) || product.price < 0) {
        throw new TypeError('Each catalog product requires a nonempty id and a safe nonnegative integer price');
      }
      if (lookup.has(product.id)) throw new TypeError(`Duplicate product id in catalog: ${product.id}`);
      lookup.set(product.id, product);
    }
    return Object.freeze(LEVEL_PRODUCT_IDS[level].map(id => {
      const product = lookup.get(id);
      if (!product) throw new TypeError(`LEVEL ${level} product ${id} is missing from the catalog`);
      const expectedPrice = canonicalPrices.get(id);
      if (product.price !== expectedPrice) {
        throw new TypeError(`Product ${id} price must match the canonical price of ${expectedPrice} yen`);
      }
      return product;
    }));
  }

  globalThis.RuRiRuLevelMenus = Object.freeze({ LEVEL_PRODUCT_IDS, getProducts });
})();
