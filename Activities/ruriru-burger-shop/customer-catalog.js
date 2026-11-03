(() => {
  const expressions = ['neutral', 'troubled', 'angry', 'smile'];
  // Cheek edges and eye/cheek height in each original PNG. These anchors stay
  // independent of the torso crop and body scale used to place the customer.
  const facePixels = {
    'sunhat-woman': [430, 790, 430], 'mint-man': [425, 790, 330],
    'lavender-woman': [430, 790, 350], 'orange-man': [425, 790, 310],
    'coral-woman': [430, 790, 370], 'blue-senior-man': [425, 790, 320],
    'level1-cyclist-boy': [360, 660, 370], 'level1-commuter-woman': [370, 650, 275],
    'level1-senior-man': [355, 665, 280],
    'level2-family-father': [290, 565, 280], 'level2-shopper-woman': [365, 670, 305],
    'level2-school-girl': [355, 675, 330], 'level2-school-boy': [355, 665, 285],
    'level3-copper-woman': [350, 675, 270], 'level3-silver-woman': [350, 660, 275],
    'level3-charcoal-man': [350, 680, 300], 'level3-campus-man': [350, 680, 290],
    'level3-olive-woman': [350, 670, 260],
  };
  function sourceFace(id, width, height) {
    const [left, right, centerY] = facePixels[id];
    return Object.freeze({ left: left / width, right: right / width, centerY: centerY / height });
  }
  const definitions = [
    ['sunhat-woman', 1218 / 1292, 1, .63, 'feminine', 0, 1.05],
    ['mint-man', 1218 / 1292, 1.08, .58, 'masculine', 0, .96],
    ['lavender-woman', 1218 / 1292, .80, .54, 'feminine', 1, 1.12],
    ['orange-man', 1218 / 1292, 1.14, .60, 'masculine', 1, 1.04],
    ['coral-woman', 1218 / 1292, .92, .58, 'feminine', 2, .98],
    ['blue-senior-man', 1218 / 1292, 1.01, .56, 'masculine', 2, .89],
  ];
  const CUSTOMERS = Object.freeze(definitions.map(([id, aspectRatio, scale, visibleFraction, gender, voiceIndex, pitch]) => Object.freeze({
    id,
    expressions: Object.freeze(Object.fromEntries(expressions.map(expression => [expression,
      `./assets/customer-${id === 'sunhat-woman' ? '' : `${id}-`}${expression}-v1.png`]))),
    layout: Object.freeze({ aspectRatio, scale, visibleFraction }),
    face: sourceFace(id, 1218, 1292),
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
      ['copper-woman', .96, 22, 680, 513, 'feminine', 0, 1.04],
      ['silver-woman', .81, 32, 570, 508, 'feminine', 1, .94],
      ['charcoal-man', 1.12, 38, 730, 509, 'masculine', 0, .94],
      ['campus-man', 1.18, 45, 720, 507, 'masculine', 1, 1.06],
      ['olive-woman', .88, 11, 550, 507, 'feminine', 2, 1],
    ],
  };
  const pools = {4:CUSTOMERS};
  for (const [level, records] of Object.entries(lowerDefinitions)) {
    // Each portrait meets the counter at its chest, matching the close LEVEL4
    // framing. LEVEL3 needs separate landmarks for its full-height source art;
    // using the waist would make faces and shoulders look far behind the counter.
    pools[level]=Object.freeze(records.map(([id,stature,headTop,counterCrop,centerX,gender,voiceIndex,pitch])=>Object.freeze({
      id:`level${level}-${id}`,level:Number(level),
      expressions:Object.freeze(Object.fromEntries(expressions.map(expression=>{
        const revision=Number(level)===3&&((id==='campus-man'&&expression==='smile')||(id==='charcoal-man'&&['smile','angry'].includes(expression)))?2:1;
        return [expression,`./assets/customer-level${level}-${id}-${expression}-v${revision}.png`];
      }))),
      layout:Object.freeze({aspectRatio:2/3,scale:stature*counterCrop/(counterCrop-headTop),visibleFraction:counterCrop/1536,headTop:headTop/1536,centerFraction:centerX/1024}),
      face:sourceFace(`level${level}-${id}`,1024,1536),
      voice:Object.freeze({gender,voiceIndex,pitch}),
    })));
  }
  Object.freeze(pools);
  function getCustomers(level=4) {
    if(!Number.isInteger(level)||!Object.hasOwn(pools,level))throw new RangeError('LEVEL must be an integer from 1 to 4');
    return pools[level];
  }

  function customerGeometry({ profile = CUSTOMERS[0], counterY, topLimit, cameraTopLimit = topLimit, gapLeft, gapRight, viewportHeight, aspectRatio } = {}) {
    const layout = profile.layout;
    const ratio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : layout.aspectRatio;
    const visibleFraction = layout.visibleFraction;
    // Scale describes visible stature above the counter; the fraction only
    // locates the torso crop within each unchanged source portrait. Fit the
    // entire cast to one scene unit so a short viewport cannot make every head
    // touch the same top limit or cancel stature against the crop fraction.
    const preferredWidth = viewportHeight <= 610 ? 340 : viewportHeight <= 700 ? 380 : 420;
    const proximity = profile.level === 1 ? 1.2 : 1;
    // Keep the chosen LEVEL3 camera unit independent of individual source crops.
    let preferredUnit = preferredWidth / (1218 / 1292) * .79;
    if (profile.level !== 3) {
      // Use LEVEL3's headroom as the common camera ceiling even where the
      // MAIN board is absent or a cast's source proportions differ.
      const referenceStature = Math.max(...getCustomers(3).map(body => body.layout.scale));
      preferredUnit = Math.min(preferredUnit, Math.max(0, counterY - cameraTopLimit) / referenceStature);
    }
    preferredUnit *= proximity;
    const pool = profile.level ? getCustomers(profile.level) : CUSTOMERS;
    const bodies = pool.includes(profile) ? pool : [...pool, profile];
    const tallest = Math.max(...bodies.map(body => body.layout.scale));
    const widest = Math.max(...bodies.map(body => body.layout.scale /
      body.layout.visibleFraction * (body === profile ? ratio : body.layout.aspectRatio)));
    const unit = Math.max(0, Math.min(preferredUnit,
      (counterY - topLimit) / tallest, (gapRight - gapLeft - 24) / widest));
    const width = unit * layout.scale / visibleFraction * ratio;
    const height = width / ratio;
    const headTop = counterY - height * (visibleFraction - (layout.headTop || 0));
    // Reveal more torso by moving the same-size portrait upward.
    // The source continues below the counter; only its visible portion changes.
    const lift = profile.level === 3 || !profile.level
      ? Math.min(viewportHeight * .045 * (profile.level === 3 ? 1 : layout.scale),
        Math.max(0, headTop - topLimit)) : 0;
    return { left: (gapLeft + gapRight) / 2 + (.5-(layout.centerFraction ?? .5))*width,
      top: counterY - lift, width, height, visibleFraction };
  }

  function reactionBubbleGeometry({ profile, portrait, viewportWidth, viewportHeight,
    safeLeft = 10, safeRight = viewportWidth - 10, bubbleWidth = 220, bubbleHeight = 48, gap = 16 } = {}) {
    const face = profile.face;
    const imageLeft = portrait.left - portrait.width / 2;
    const imageTop = portrait.top - portrait.height * portrait.visibleFraction;
    const leftCheek = imageLeft + portrait.width * face.left;
    const rightCheek = imageLeft + portrait.width * face.right;
    const leftBound = Math.max(10, safeLeft), rightBound = Math.min(viewportWidth - 10, safeRight);
    const leftRoom = Math.max(0, leftCheek - gap - leftBound);
    const rightRoom = Math.max(0, rightBound - rightCheek - gap);
    const side = rightRoom >= bubbleWidth || rightRoom >= leftRoom ? 'right' : 'left';
    const halfHeight = Math.min(bubbleHeight / 2, Math.max(0, viewportHeight / 2 - 10));
    return {
      side, left: side === 'right' ? rightCheek + gap : leftCheek - gap,
      top: Math.max(10 + halfHeight, Math.min(viewportHeight - 10 - halfHeight,
        imageTop + portrait.height * face.centerY)),
      maxWidth: Math.min(bubbleWidth, side === 'right' ? rightRoom : leftRoom),
    };
  }

  globalThis.RuRiRuCustomers = Object.freeze({ CUSTOMERS, getCustomers, customerGeometry, reactionBubbleGeometry });
})();
