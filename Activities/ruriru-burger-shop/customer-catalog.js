(() => {
  const expressions = ['neutral', 'troubled', 'angry', 'smile'];
  const definitions = [
    ['sunhat-woman', 1218 / 1292, 1, .79, 'feminine', 0, 1.05],
    ['mint-man', 1218 / 1292, 1.08, .73, 'masculine', 0, .96],
    ['lavender-woman', 1218 / 1292, .80, .70, 'feminine', 1, 1.12],
    ['orange-man', 1218 / 1292, 1.14, .60, 'masculine', 1, 1.04],
    ['coral-woman', 1218 / 1292, .92, .75, 'feminine', 2, .98],
    ['blue-senior-man', 1218 / 1292, 1.01, .64, 'masculine', 2, .89],
  ];
  const CUSTOMERS = Object.freeze(definitions.map(([id, aspectRatio, scale, visibleFraction, gender, voiceIndex, pitch]) => Object.freeze({
    id,
    expressions: Object.freeze(Object.fromEntries(expressions.map(expression => [expression,
      `./assets/customer-${id === 'sunhat-woman' ? '' : `${id}-`}${expression}-v1.png`]))),
    layout: Object.freeze({ aspectRatio, scale, visibleFraction }),
    voice: Object.freeze({ gender, voiceIndex, pitch }),
  })));

  const lowerDefinitions = {
    1: [
      ['cyclist-boy', .88, 88, 800, 514, 'masculine', 0, 1.12],
      ['commuter-woman', 1, 11, 710, 508, 'feminine', 0, 1],
      ['senior-man', .95, 31, 735, 512, 'masculine', 1, .90],
    ],
    2: [
      ['family-father', 1.25, 79, 930, 430, 'masculine', 0, .97],
      ['shopper-woman', .90, 109, 650, 515, 'feminine', 1, 1.02],
      ['school-girl', 1, 101, 750, 520, 'feminine', 0, 1.10],
      ['school-boy', 1.12, 50, 770, 500, 'masculine', 1, 1.02],
    ],
    3: [
      ['copper-woman', .96, 22, 940, 513, 'feminine', 0, 1.04],
      ['silver-woman', .81, 32, 940, 508, 'feminine', 1, .94],
      ['charcoal-man', 1.12, 38, 1150, 509, 'masculine', 0, .94],
      ['campus-man', 1.18, 45, 1190, 507, 'masculine', 1, 1.06],
      ['olive-woman', .88, 11, 927, 507, 'feminine', 2, 1],
    ],
  };
  const pools = {4:CUSTOMERS};
  for (const [level, records] of Object.entries(lowerDefinitions)) {
    // The counter crop is at the upper chest in LEVEL1/2, matching the close
    // LEVEL4 framing; it is not the waist position in the full-height PNG.
    pools[level]=Object.freeze(records.map(([id,stature,headTop,counterCrop,centerX,gender,voiceIndex,pitch])=>Object.freeze({
      id:`level${level}-${id}`,level:Number(level),
      expressions:Object.freeze(Object.fromEntries(expressions.map(expression=>{
        const revision=Number(level)===3&&((id==='campus-man'&&expression==='smile')||(id==='charcoal-man'&&['smile','angry'].includes(expression)))?2:1;
        return [expression,`./assets/customer-level${level}-${id}-${expression}-v${revision}.png`];
      }))),
      layout:Object.freeze({aspectRatio:2/3,scale:stature*counterCrop/(counterCrop-headTop),visibleFraction:counterCrop/1536,headTop:headTop/1536,centerFraction:centerX/1024}),
      voice:Object.freeze({gender,voiceIndex,pitch}),
    })));
  }
  Object.freeze(pools);
  function getCustomers(level=4) {
    if(!Number.isInteger(level)||!Object.hasOwn(pools,level))throw new RangeError('LEVEL must be an integer from 1 to 4');
    return pools[level];
  }

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
    const pool = profile.level ? getCustomers(profile.level) : CUSTOMERS;
    const bodies = pool.includes(profile) ? pool : [...pool, profile];
    const tallest = Math.max(...bodies.map(body => body.layout.scale));
    const widest = Math.max(...bodies.map(body => body.layout.scale /
      body.layout.visibleFraction * (body === profile ? ratio : body.layout.aspectRatio)));
    const unit = Math.max(0, Math.min(preferredUnit,
      (counterY - topLimit) / tallest, (gapRight - gapLeft - 24) / widest));
    const width = unit * layout.scale / visibleFraction * ratio;
    return { left: (gapLeft + gapRight) / 2 + (.5-(layout.centerFraction ?? .5))*width,
      top: counterY, width, height: width / ratio, visibleFraction };
  }

  globalThis.RuRiRuCustomers = Object.freeze({ CUSTOMERS, getCustomers, customerGeometry });
})();
