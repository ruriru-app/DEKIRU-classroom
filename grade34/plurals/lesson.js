(() => {
  'use strict';
  const groups = [
    ['s', '/s/', [
      ['cat', 'cats'], ['kite', 'kites'], ['cup', 'cups'], ['map', 'maps'],
      ['book', 'books'], ['sock', 'socks'], ['duck', 'ducks'], ['giraffe', 'giraffes']
    ]],
    ['z', '/z/', [
      ['dog', 'dogs'], ['bag', 'bags'], ['bed', 'beds'], ['pen', 'pens'],
      ['ball', 'balls'], ['drum', 'drums'], ['chair', 'chairs'], ['apple', 'apples'],
      ['shoe', 'shoes']
    ]],
    ['iz', '/ɪz/', [
      ['bus', 'buses'], ['dress', 'dresses'], ['box', 'boxes'], ['dish', 'dishes'],
      ['watch', 'watches'], ['bench', 'benches'], ['rose', 'roses'], ['orange', 'oranges']
    ]]
  ];
  const overviewGroups = [];
  const patterns = {};
  for (const [group, sound, pairs] of groups) {
    for (const [singular, plural] of pairs) {
      overviewGroups.push([singular, plural]);
      const start = singular.length;
      patterns[singular] = {group, spelling: '', start, label: '単数形'};
      patterns[plural] = {group, spelling: plural.slice(start), sound, start};
    }
  }
  globalThis.PhonicsLesson = {
    words: overviewGroups.flat(),
    overviewGroups,
    worksheetWords: overviewGroups.map(([, plural]) => plural),
    patterns,
    patternPrefix: 'plural',
    imageExtension: 'webp',
    // Match the order of worksheets/plurals-writing-random.pdf.
    randomWorksheetWords: 'roses giraffes buses cups books beds drums socks maps pens oranges chairs shoes benches boxes watches dresses dogs kites apples dishes bags ducks cats balls'.split(' ')
  };
})();
