(() => {
  const small = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const numberWords = new Set([...small, ...tens.filter(Boolean), 'hundred', 'thousand', 'and', 'a', 'minus', 'negative']);
  const unsupportedParts = new Set(['point', 'dot', 'million', 'billion', 'trillion', 'e', 'x', '+', '-', '/', '*', '×', '÷', '^', '$']);
  const numericToken = token => /^-?(?:\d|\.\d)/.test(token || '');
  const expressionPart = token => numberWords.has(token) || unsupportedParts.has(token) || numericToken(token);

  function quantities(lines, label) {
    if (!Array.isArray(lines)) throw new TypeError(`${label} order must be an array`);
    const result = new Map();
    for (const line of lines) {
      if (typeof line?.id !== 'string' || !line.id.trim()) throw new TypeError('A product id is required');
      if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0) throw new TypeError('Quantity must be a positive safe integer');
      const total = (result.get(line.id) || 0) + line.quantity;
      if (!Number.isSafeInteger(total)) throw new TypeError('Combined quantity is unsafe');
      result.set(line.id, total);
    }
    return result;
  }

  function matchOrder(expected, actual) {
    const wanted = quantities(expected, 'Expected');
    if (!wanted.size) throw new TypeError('Expected order must contain products');
    const prepared = quantities(actual, 'Actual');
    const missing = [], extra = [];
    for (const [id, quantity] of wanted) {
      const deficit = quantity - (prepared.get(id) || 0);
      if (deficit > 0) missing.push({ id, quantity: deficit });
    }
    for (const [id, quantity] of prepared) {
      const surplus = quantity - (wanted.get(id) || 0);
      if (surplus > 0) extra.push({ id, quantity: surplus });
    }
    return { matches: !missing.length && !extra.length, missing, extra };
  }

  function underHundred(words) {
    if (words.length === 1) {
      const single = small.indexOf(words[0]);
      if (single >= 0) return single;
      const ten = tens.indexOf(words[0]);
      return ten >= 2 ? ten * 10 : null;
    }
    if (words.length !== 2) return null;
    const ten = tens.indexOf(words[0]), unit = small.indexOf(words[1]);
    return ten >= 2 && unit >= 1 && unit <= 9 ? ten * 10 + unit : null;
  }

  function underThousand(words) {
    const hundred = words.indexOf('hundred');
    if (hundred < 0) return underHundred(words);
    const multiplier = words[0] === 'a' ? 1 : small.indexOf(words[0]);
    if (hundred !== 1 || multiplier < 1 || multiplier > 9) return null;
    let rest = words.slice(2);
    if (!rest.length) return multiplier * 100;
    if (rest[0] === 'and') rest = rest.slice(1);
    const tail = underHundred(rest);
    return tail !== null && tail > 0 ? multiplier * 100 + tail : null;
  }

  function englishNumber(words) {
    const thousand = words.indexOf('thousand');
    if (thousand < 0) return underThousand(words);
    if (words.lastIndexOf('thousand') !== thousand) return null;
    const head = words.slice(0, thousand);
    const multiplier = head.length === 1 && head[0] === 'a' ? 1 : underThousand(head);
    if (multiplier === null || multiplier <= 0) return null;
    let rest = words.slice(thousand + 1);
    if (!rest.length) return multiplier * 1000;
    if (rest[0] === 'and') rest = rest.slice(1);
    const tail = underThousand(rest);
    return tail !== null && tail > 0 ? multiplier * 1000 + tail : null;
  }

  function amountBefore(tokens, index) {
    let start = index;
    while (start > 0 && (expressionPart(tokens[start - 1]) ||
      (tokens[start - 1] === ',' && expressionPart(tokens[start - 2])))) start--;
    const expression = tokens.slice(start, index);
    // English ASR can format a spoken yen amount as "$2,140 yen".
    // Tolerate that single symbol only inside this explicitly yen-marked amount.
    const numericExpression = expression.length === 2 && expression[0] === '$'
      ? expression.slice(1) : expression;
    if (numericExpression.length === 1 && numericToken(numericExpression[0])) {
      if (!/^(?:0|[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)$/.test(numericExpression[0])) return null;
      const amount = Number(numericExpression[0].replaceAll(',', ''));
      return Number.isSafeInteger(amount) && amount <= 999999 ? { amount, start } : null;
    }
    const amount = englishNumber(expression.filter(token => token !== ','));
    return amount === null ? null : { amount, start };
  }

  function readSpokenYen(value = '') {
    const normalized = String(value ?? '').normalize('NFKC').toLowerCase()
      .replace(/([a-z])[-‐‑–—]([a-z])/g, '$1 $2').replace(/−/g, '-');
    const tokens = normalized.match(/-?(?:\d[\d,.]*|\.\d+)|[a-z]+|円|[^\s]/g) || [];
    const amounts = [], consumed = new Set();
    for (let index = 0; index < tokens.length; index++) {
      if (!['yen', 'yens', '円'].includes(tokens[index])) continue;
      const parsed = amountBefore(tokens, index);
      if (parsed === null) return { status: 'invalid', amount: null };
      for (let part = parsed.start; part < index; part++) consumed.add(part);
      amounts.push(parsed.amount);
    }
    if (!amounts.length) return { status: 'missing', amount: null };
    // An unmarked alternative/correction must not be silently dropped.
    if (tokens.some((token, index) => !consumed.has(index) &&
      (numericToken(token) || (numberWords.has(token) && !['a', 'and', 'minus', 'negative'].includes(token))))) {
      return { status: 'ambiguous', amount: null };
    }
    const unique = [...new Set(amounts)];
    return unique.length === 1
      ? { status: 'valid', amount: unique[0] }
      : { status: 'ambiguous', amount: null };
  }

  function wordsFor(amount) {
    if (amount < 20) return small[amount];
    if (amount < 100) return tens[Math.floor(amount / 10)] + (amount % 10 ? ` ${small[amount % 10]}` : '');
    if (amount < 1000) return `${small[Math.floor(amount / 100)]} hundred` + (amount % 100 ? ` and ${wordsFor(amount % 100)}` : '');
    const rest = amount % 1000;
    return `${wordsFor(Math.floor(amount / 1000))} thousand` + (rest ? `${rest < 100 ? ' and ' : ' '}${wordsFor(rest)}` : '');
  }

  function yenInWords(amount) {
    if (!Number.isSafeInteger(amount) || amount < 0 || amount > 999999) throw new RangeError('Amount must be an integer from 0 to 999999');
    return `${wordsFor(amount)} yen`;
  }

  globalThis.RuRiRuServiceValidation = Object.freeze({ matchOrder, readSpokenYen, yenInWords });
})();
