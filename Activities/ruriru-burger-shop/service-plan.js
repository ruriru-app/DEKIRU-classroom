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
  // The center receives most slots; every allowed total can still occur.
  const totalChoices = {
    1: [1, ...Array(8).fill(2), 3],
    2: [2, ...Array(6).fill(3), ...Array(8).fill(4), ...Array(6).fill(5), 6],
    3: [4, ...Array(6).fill(5), ...Array(8).fill(6), ...Array(6).fill(7), 8, 9],
    4: [6, 7, 7, ...Array(6).fill(8), ...Array(8).fill(9), ...Array(6).fill(10), 11, 11, 12],
  };
  const legacyLevel4 = Object.freeze({ level: 4, customerCount: 4, poolCount: 6,
    typeMin: 3, typeMax: 5, totalMin: 6, totalMax: 12, perTypeMax: 5 });

  function createNormalPlan({ level = 4, products, customerIds, random = Math.random } = {}) {
    const rules = globalThis.RuRiRuLevels ? globalThis.RuRiRuLevels.getLevelRules(level) : level === 4 ? legacyLevel4 : null;
    if (!rules) throw new RangeError('LEVEL must be an integer from 1 to 4; load level-config.js for all levels');
    const minimumProducts = Math.max(rules.typeMin, Math.ceil(rules.totalMax / rules.perTypeMax));
    if (!Array.isArray(products) || products.length < minimumProducts || products.some(product =>
      typeof product?.id !== 'string' || !product.id.trim() || typeof product.name !== 'string' || !product.name.trim() ||
      !Number.isSafeInteger(product.price) || product.price < 0) || new Set(products.map(product => product.id)).size !== products.length) {
      throw new TypeError(`A valid product catalog with at least ${minimumProducts} distinct products is required`);
    }
    if (!Array.isArray(customerIds) || customerIds.length !== rules.poolCount ||
      customerIds.some(id => typeof id !== 'string' || !id.trim()) || new Set(customerIds).size !== rules.poolCount) {
      throw new TypeError(`${rules.poolCount} distinct customer ids are required`);
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
        let choices = units[id] || [[name, `${name}s`], ...(product.category === 'drink' ? [[`cup of ${name}`, `cups of ${name}`]] : [])];
        if (level <= 2) {
          if (id === 'french-fries') choices = [['fries', 'fries']];
          else if (id === 'chicken-nuggets') choices = [['box of nuggets', 'boxes of nuggets']];
          else if (product.category === 'drink') choices = [[name, `${name}s`]];
        }
        const forms = choices[index(choices.length)];
        return `${counts[quantity]} ${forms[quantity === 1 ? 0 : 1]}`;
      });
      return parts.length === 1 ? parts[0] : parts.length === 2 ? parts.join(' and ') : `${parts.slice(0, -1).join(', ')}, and ${parts.at(-1)}`;
    }
    const totals = totalChoices[level];
    const customers = shuffled(customerIds).slice(0, rules.customerCount).map(customerId => {
      const total = totals[index(totals.length)];
      const minTypes = Math.max(rules.typeMin, Math.ceil(total / rules.perTypeMax));
      const maxTypes = Math.min(rules.typeMax, products.length, total);
      const typeCount = minTypes + index(maxTypes - minTypes + 1);
      const order = shuffled(products).slice(0, typeCount).map(({ id }) => ({ id, quantity: 1 }));
      for (let remaining = total - typeCount; remaining > 0; remaining--) {
        const available = order.filter(line => line.quantity < rules.perTypeMax);
        available[index(available.length)].quantity++;
      }
      const phrase = phraseFor(order);
      const orderText = level < 4 || index(2) === 0 ? `I'd like ${phrase}, please.` : `Can I have ${phrase}, please?`;
      for (const line of order) Object.freeze(line);
      return Object.freeze({ customerId, order: Object.freeze(order), greeting: index(2) === 0 ? 'Hello!' : 'Hi!',
        orderText, correctiveText: `I ordered ${phrase}.` });
    });
    return Object.freeze(customers);
  }
  function createLevel4Plan(options) { return createNormalPlan({ ...options, level: 4 }); }
  globalThis.RuRiRuServicePlan = Object.freeze({ createNormalPlan, createLevel4Plan });
})();
