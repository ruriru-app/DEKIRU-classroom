(() => {
  'use strict';
  const groups = [
    ['l', [
      ['black', 'bl', 'bl'], ['clock', 'cl', 'kl'], ['flag', 'fl', 'fl'],
      ['glass', 'gl', 'ɡl'], ['plane', 'pl', 'pl'], ['slide', 'sl', 'sl']
    ]],
    ['r', [
      ['bread', 'br', 'bɹ'], ['crab', 'cr', 'kɹ'], ['drum', 'dr', 'dɹ'],
      ['frog', 'fr', 'fɹ'], ['grass', 'gr', 'ɡɹ'], ['press', 'pr', 'pɹ'],
      ['truck', 'tr', 'tɹ']
    ]],
    ['s', [
      ['skate', 'sk', 'sk'], ['smile', 'sm', 'sm'], ['snake', 'sn', 'sn'],
      ['spoon', 'sp', 'sp'], ['stop', 'st', 'st'], ['swim', 'sw', 'sw']
    ]],
    ['triple', [['screw', 'scr', 'skɹ'], ['straw', 'str', 'stɹ']]],
    ['ending', [
      ['hand', 'nd', 'nd'], ['tent', 'nt', 'nt'], ['lamp', 'mp', 'mp'],
      ['nest', 'st', 'st']
    ]]
  ];
  const words = [];
  const patterns = {};
  for (const [group, entries] of groups) {
    for (const [word, spelling, sound] of entries) {
      words.push(word);
      const start = group === 'ending' ? word.length - spelling.length : 0;
      patterns[word] = {group, spelling, sound: `/${sound}/`, start};
    }
  }
  globalThis.PhonicsLesson = {
    words,
    patterns,
    patternPrefix: 'consonant-blend',
    imageExtension: 'webp',
    // Match the order of worksheets/consonant-blends-writing-random.pdf.
    randomWorksheetWords: 'straw clock frog lamp grass plane smile screw flag tent press skate black spoon nest bread swim glass truck slide crab hand drum stop snake'.split(' ')
  };
})();
