(() => {
  const expressions = ['neutral', 'troubled', 'angry', 'smile'];
  const definitions = [
    ['sunhat-woman', 1218 / 1292, 1, .79, 'feminine', 0, 1.05],
    ['mint-man', 1218 / 1292, 1.12, .73, 'masculine', 0, .96],
    ['lavender-woman', 1218 / 1292, 1.12, .70, 'feminine', 1, 1.12],
    ['orange-man', 1218 / 1292, 1.32, .60, 'masculine', 1, 1.04],
    ['coral-woman', 1218 / 1292, 1.08, .75, 'feminine', 2, .98],
    ['blue-senior-man', 1218 / 1292, 1.26, .64, 'masculine', 2, .89],
  ];
  const CUSTOMERS = Object.freeze(definitions.map(([id, aspectRatio, scale, visibleFraction, gender, voiceIndex, pitch]) => Object.freeze({
    id,
    expressions: Object.freeze(Object.fromEntries(expressions.map(expression => [expression,
      `./assets/customer-${id === 'sunhat-woman' ? '' : `${id}-`}${expression}-v1.png`]))),
    layout: Object.freeze({ aspectRatio, scale, visibleFraction }),
    voice: Object.freeze({ gender, voiceIndex, pitch }),
  })));

  function customerGeometry({ profile = CUSTOMERS[0], counterY, topLimit, gapLeft, gapRight, viewportHeight, aspectRatio } = {}) {
    const layout = profile.layout;
    const ratio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : layout.aspectRatio;
    const visibleFraction = layout.visibleFraction;
    const preferredWidth = (viewportHeight <= 610 ? 340 : viewportHeight <= 700 ? 380 : 420) * layout.scale;
    const width = Math.max(0, Math.min(preferredWidth, gapRight - gapLeft - 24,
      Math.max(0, counterY - topLimit) / visibleFraction * ratio));
    return { left: (gapLeft + gapRight) / 2, top: counterY, width, height: width / ratio, visibleFraction };
  }

  globalThis.RuRiRuCustomers = Object.freeze({ CUSTOMERS, customerGeometry });
})();
