(() => {
  const counts = ['zero', 'one', 'two', 'three', 'four', 'five'];
  const units = {
    'french-fries': [['fries', 'fries'], ['order of fries', 'orders of fries']],
    'chicken-nuggets': [['box of nuggets', 'boxes of nuggets'], ['order of nuggets', 'orders of nuggets']],
    'onion-rings': [['order of onion rings', 'orders of onion rings'], ['box of onion rings', 'boxes of onion rings']],
    'salad': [['salad', 'salads'], ['bowl of salad', 'bowls of salad']],
    'ice-cream': [['ice cream', 'ice creams'], ['ice cream cone', 'ice cream cones']],
    'water': [['cup of water', 'cups of water']],
  };
  // The center receives 20 of 26 slots; every allowed total can still occur.
  const totals = [6, 7, 7, ...Array(6).fill(8), ...Array(8).fill(9), ...Array(6).fill(10), 11, 11, 12];

  function createLevel4Plan({ products, customerIds, random = Math.random } = {}) {
    if (!Array.isArray(products) || products.length < 3 || products.some(product =>
      typeof product?.id !== 'string' || !product.id.trim() || typeof product.name !== 'string' || !product.name.trim() ||
      !Number.isSafeInteger(product.price) || product.price < 0) || new Set(products.map(product => product.id)).size !== products.length) {
      throw new TypeError('A valid product catalog with at least three distinct products is required');
    }
    if (!Array.isArray(customerIds) || customerIds.length !== 6 ||
      customerIds.some(id => typeof id !== 'string' || !id.trim()) || new Set(customerIds).size !== 6) {
      throw new TypeError('Six distinct customer ids are required');
    }
    if (typeof random !== 'function') throw new TypeError('Random source must be a function');
    function index(length) {
      const sample = random();
      if (!Number.isFinite(sample) || sample < 0 || sample >= 1) throw new TypeError('Random source must return a number from 0 up to 1');
      return Math.floor(sample * length);
    }
    function shuffled(source) {
      const result = [...source];
      for (let i = result.length - 1; i > 0; i--) {
        const other = index(i + 1);
        [result[i], result[other]] = [result[other], result[i]];
      }
      return result;
    }
    function phraseFor(order) {
      const parts = order.map(({ id, quantity }) => {
        const product = products.find(item => item.id === id), name = product.name.toLowerCase();
        const choices = units[id] || [[name, `${name}s`], ...(product.category === 'drink' ? [[`cup of ${name}`, `cups of ${name}`]] : [])];
        const forms = choices[index(choices.length)];
        return `${counts[quantity]} ${forms[quantity === 1 ? 0 : 1]}`;
      });
      return `${parts.slice(0, -1).join(', ')}, and ${parts.at(-1)}`;
    }
    const customers = shuffled(customerIds).slice(0, 4).map(customerId => {
      const total = totals[index(totals.length)];
      const typeCount = 3 + index(Math.min(5, products.length) - 2);
      const order = shuffled(products).slice(0, typeCount).map(({ id }) => ({ id, quantity: 1 }));
      for (let remaining = total - typeCount; remaining > 0; remaining--) {
        const available = order.filter(line => line.quantity < 5);
        available[index(available.length)].quantity++;
      }
      const phrase = phraseFor(order);
      const orderText = index(2) === 0 ? `I'd like ${phrase}, please.` : `Can I have ${phrase}, please?`;
      for (const line of order) Object.freeze(line);
      return Object.freeze({ customerId, order: Object.freeze(order), greeting: index(2) === 0 ? 'Hello!' : 'Hi!',
        orderText, correctiveText: `I ordered ${phrase}.` });
    });
    return Object.freeze(customers);
  }
  globalThis.RuRiRuServicePlan = Object.freeze({ createLevel4Plan });
})();
