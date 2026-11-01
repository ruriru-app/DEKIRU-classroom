(() => {
  const expressions = ['neutral', 'troubled', 'angry', 'smile'];
  const definitions = [
    ['sunhat-woman', 1218 / 1292, 1, .79, 'feminine', 0, 1.05],
    ['mint-man', 1218 / 1292, 1.04, .73, 'masculine', 0, .96],
    ['lavender-woman', 1218 / 1292, .88, .70, 'feminine', 1, 1.12],
    ['orange-man', 1218 / 1292, 1.08, .60, 'masculine', 1, 1.04],
    ['coral-woman', 1218 / 1292, .96, .75, 'feminine', 2, .98],
    ['blue-senior-man', 1218 / 1292, .99, .64, 'masculine', 2, .89],
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
    // Scale describes visible stature above the counter; the fraction only
    // locates the torso crop within each unchanged source portrait. Fit the
    // entire cast to one scene unit so a short viewport cannot make every head
    // touch the same top limit or cancel stature against the crop fraction.
    const reference = CUSTOMERS[0].layout;
    const preferredWidth = viewportHeight <= 610 ? 340 : viewportHeight <= 700 ? 380 : 420;
    const preferredUnit = preferredWidth / reference.aspectRatio * reference.visibleFraction;
    const bodies = CUSTOMERS.includes(profile) ? CUSTOMERS : [...CUSTOMERS, profile];
    const tallest = Math.max(...bodies.map(body => body.layout.scale));
    const widest = Math.max(...bodies.map(body => body.layout.scale /
      body.layout.visibleFraction * (body === profile ? ratio : body.layout.aspectRatio)));
    const unit = Math.max(0, Math.min(preferredUnit,
      (counterY - topLimit) / tallest, (gapRight - gapLeft - 24) / widest));
    const width = unit * layout.scale / visibleFraction * ratio;
    return { left: (gapLeft + gapRight) / 2, top: counterY, width, height: width / ratio, visibleFraction };
  }

  globalThis.RuRiRuCustomers = Object.freeze({ CUSTOMERS, customerGeometry });
})();
