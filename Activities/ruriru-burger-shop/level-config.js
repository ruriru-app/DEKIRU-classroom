(() => {
  const rules = Object.freeze({
    1: { typeMin: 1, typeMax: 2, totalMin: 1, totalMax: 3, perTypeMax: 2, preferredTotals: [2] },
    2: { typeMin: 2, typeMax: 3, totalMin: 2, totalMax: 6, perTypeMax: 3, preferredTotals: [3, 4, 5] },
    3: { typeMin: 3, typeMax: 4, totalMin: 4, totalMax: 9, perTypeMax: 4, preferredTotals: [5, 6, 7] },
    4: { typeMin: 3, typeMax: 5, totalMin: 6, totalMax: 12, perTypeMax: 5, preferredTotals: [8, 9, 10] },
  });
  for (const [level, rule] of Object.entries(rules)) {
    Object.freeze(rule.preferredTotals);
    Object.assign(rule, { level: Number(level), customerCount: Number(level), poolCount: Number(level) + 2 });
    Object.freeze(rule);
  }
  function getLevelRules(level) {
    if (!Number.isInteger(level) || !Object.hasOwn(rules, level)) throw new RangeError('LEVEL must be an integer from 1 to 4');
    return rules[level];
  }
  globalThis.RuRiRuLevels = Object.freeze({ getLevelRules });
})();
