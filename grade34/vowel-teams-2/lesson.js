(() => {
  'use strict';
  const groups = [
    ['oo', '/uː/', 'long-u', 'moon boot zoo'],
    ['oo', '/ʊ/', 'short-oo', 'book foot wood'],
    ['ew', '/uː/', 'long-u', 'chew new'],
    ['oi', '/ɔɪ/', 'oy', 'coin oil boil'],
    ['oy', '/ɔɪ/', 'oy', 'boy toy'],
    ['ou', '/aʊ/', 'ow', 'out house mouth'],
    ['ow', '/aʊ/', 'ow', 'cow down owl'],
    ['au', '/ɔ/・/ɑ/', 'aw', 'sauce August'],
    ['aw', '/ɔ/・/ɑ/', 'aw', 'paw saw'],
    ['ea', '/ɛ/', 'short-e', 'feather head']
  ];
  const words = [];
  const patterns = {};
  for (const [spelling, sound, group, list] of groups) {
    for (const word of list.split(' ')) {
      words.push(word);
      patterns[word] = {group, spelling, sound, start: word.toLowerCase().indexOf(spelling)};
    }
  }
  globalThis.PhonicsLesson = {
    words,
    patterns,
    imageExtension: 'webp',
    // Match the order of worksheets/vowel-teams-2-writing-random.pdf.
    randomWorksheetWords: 'paw foot out coin feather boot owl oil August house chew book cow sauce boy moon wood head boil toy down mouth new saw zoo'.split(' ')
  };
})();
