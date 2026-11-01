(() => {
  const { isHereYouAre, counterTopY } = globalThis.RuRiRu;

  function rowsFor(units, columns) {
    if (!units.length) return [];
    if (units.length <= columns) return [{ depth: 'front', units }];
    return [
      { depth: 'back', units: units.slice(columns) },
      { depth: 'front', units: units.slice(0, columns) },
    ];
  }

  function buildCounterLayout(items) {
    const categoryRank = { main: 0, side: 1, dessert: 2, drink: 3 };
    const groups = [...items].sort((a, b) => (categoryRank[a.category] ?? 4) - (categoryRank[b.category] ?? 4));
    const units = groups.flatMap(product => Array.from({ length: product.quantity }, (_, index) => ({
      id: product.id, ordinal: index + 1, key: `${product.id}-${index + 1}`, product,
    })));
    const trays = [];
    for (let index = 0; index < units.length; index += 6) {
      const trayUnits = units.slice(index, index + 6);
      trays.push({ units: trayUnits, rows: rowsFor(trayUnits, 3) });
    }
    return { units, preparingRows: rowsFor(units, 6), trays };
  }

  function createCounterSession(store, { capacity = 12 } = {}) {
    let phase = 'preparing';
    const count = () => store.items().reduce((total, item) => total + item.quantity, 0);
    return {
      add(id) {
        const before = count();
        if (before >= capacity) return false;
        store.add(id);
        if (count() === before) return false;
        phase = 'preparing';
        return true;
      },
      remove(id) {
        const before = count();
        store.remove(id);
        if (count() === before) return false;
        phase = 'preparing';
        return true;
      },
      present(heard) {
        if (phase === 'presented' || !count() || !isHereYouAre(heard)) return false;
        phase = 'presented';
        return true;
      },
      view() {
        const items = store.items();
        const layout = buildCounterLayout(items);
        return { phase, capacity, count: layout.units.length, total: store.total(), items, ...layout };
      },
    };
  }

  function counterGeometry(width, height, speechTop, menuBottom = 0) {
    const artworkWidth = Math.max(width, height * 1.5);
    const counterRear = counterTopY(width, height);
    const naturalWorkFront = height / 2 + artworkWidth * (339 / 1536);
    const workFront = Math.max(counterRear + 24, Math.min(naturalWorkFront, speechTop - 20));
    const scale = (workFront - counterRear) / 216;
    const workBack = counterRear + 163 * scale;
    const rowGap = (workFront - workBack) * .3;
    return {
      counterRear,
      serviceFront: counterRear + 43 * scale,
      workBack,
      workFront,
      rowGap,
      foregroundHeight: 389 * scale,
      unitSize: Math.max(32, Math.min(104, height * .112, workFront - rowGap - menuBottom - 6)),
    };
  }

  globalThis.RuRiRuCounter = Object.freeze({ buildCounterLayout, createCounterSession, counterGeometry });
})();
