(() => {
  'use strict';
  const groups = [
    ['t', '/t/', [
      ['jump', 'jumped'], ['walk', 'walked'], ['kick', 'kicked'], ['cook', 'cooked'],
      ['wash', 'washed'], ['watch', 'watched'], ['laugh', 'laughed'], ['dance', 'danced']
    ]],
    ['d', '/d/', [
      ['play', 'played'], ['clean', 'cleaned'], ['open', 'opened'], ['listen', 'listened'],
      ['call', 'called'], ['climb', 'climbed'], ['wave', 'waved'], ['close', 'closed'], ['smile', 'smiled']
    ]],
    ['id', '/ɪd/', [
      ['paint', 'painted'], ['count', 'counted'], ['plant', 'planted'], ['skate', 'skated'],
      ['fold', 'folded'], ['land', 'landed'], ['add', 'added'], ['hand', 'handed']
    ]]
  ];
  const overviewGroups = [];
  const patterns = {};
  const imageAliases = {};
  for (const [group, sound, pairs] of groups) {
    for (const [base, past] of pairs) {
      overviewGroups.push([base, past]);
      const start = base.length;
      patterns[base] = {group, spelling: '', start, formLabel: '原形'};
      patterns[past] = {group, spelling: past.slice(start), sound, start, formLabel: '過去形'};
      imageAliases[past] = base;
    }
  }
  globalThis.PhonicsLesson = {
    words: overviewGroups.flat(),
    overviewGroups,
    worksheetWords: overviewGroups.map(([, past]) => past),
    patterns,
    patternPrefix: 'past-tense',
    imageAliases,
    imageExtension: 'webp',
    // Give speech synthesis the verb pronunciation of close.
    speechAliases: {close: 'cloze'},
    // Match the order of worksheets/past-tense-writing-random.pdf.
    randomWorksheetWords: 'added danced painted kicked washed opened climbed watched cooked listened handed waved smiled landed planted folded counted played walked closed skated cleaned laughed jumped called'.split(' ')
  };
})();
