(() => {
  'use strict';
  const groups = [
    ['s', '/s/', [
      ['jump', 'jumps'], ['sleep', 'sleeps'], ['walk', 'walks'], ['cook', 'cooks'],
      ['eat', 'eats'], ['sit', 'sits'], ['write', 'writes'], ['laugh', 'laughs']
    ]],
    ['z', '/z/', [
      ['run', 'runs'], ['swim', 'swims'], ['sing', 'sings'], ['read', 'reads'],
      ['play', 'plays'], ['open', 'opens'], ['draw', 'draws'], ['listen', 'listens'], ['go', 'goes']
    ]],
    ['iz', '/ɪz/', [
      ['wash', 'washes'], ['brush', 'brushes'], ['watch', 'watches'], ['catch', 'catches'],
      ['teach', 'teaches'], ['mix', 'mixes'], ['close', 'closes'], ['sneeze', 'sneezes']
    ]]
  ];
  const overviewGroups = [];
  const patterns = {};
  const imageAliases = {};
  for (const [group, sound, pairs] of groups) {
    for (const [base, inflected] of pairs) {
      overviewGroups.push([base, inflected]);
      const start = base.length;
      patterns[base] = {group, spelling: '', start, formLabel: '原形'};
      patterns[inflected] = {group, spelling: inflected.slice(start), sound, start, formLabel: '三人称単数現在形'};
      imageAliases[inflected] = base;
    }
  }
  globalThis.PhonicsLesson = {
    words: overviewGroups.flat(),
    overviewGroups,
    worksheetWords: overviewGroups.map(([, inflected]) => inflected),
    patterns,
    patternPrefix: 'third-person',
    imageAliases,
    imageExtension: 'webp',
    // Give speech synthesis the verb pronunciations for these isolated words.
    speechAliases: {read: 'reed', close: 'cloze'},
    // Match the order of worksheets/third-person-singular-writing-random.pdf.
    randomWorksheetWords: 'closes laughs washes walks eats sings opens sits cooks reads sneezes draws goes mixes watches teaches brushes runs sleeps listens catches swims writes jumps plays'.split(' ')
  };
})();
