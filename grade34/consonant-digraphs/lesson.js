(() => {
  'use strict';
  const groups = [
    ['sh', 'sh', '/ʃ/', 'fish ship dish shop'],
    ['ch', 'ch', '/tʃ/', 'chip chase bench lunch'],
    ['th-voiceless', 'th', '/θ/', 'bath math thin'],
    ['th-voiced', 'th', '/ð/', 'this that these those'],
    ['ck', 'ck', '/k/', 'duck sock kick'],
    ['ng', 'ng', '/ŋ/', 'ring king sing'],
    ['wh', 'wh', '/w/', 'whale white'],
    ['ph', 'ph', '/f/', 'phone photo']
  ];
  const words = [];
  const digraphs = {};
  for (const [group, spelling, sound, list] of groups) {
    for (const word of list.split(' ')) {
      words.push(word);
      digraphs[word] = {group, spelling, sound, start: word.indexOf(spelling)};
    }
  }
  globalThis.PhonicsLesson = {
    words,
    digraphs,
    imageExtension: 'webp',
    // Match the order of worksheets/consonant-digraphs-writing-random.pdf.
    randomWorksheetWords: 'white lunch ring bath shop those phone chase duck thin fish bench sing that chip photo whale these sock dish math kick ship king this'.split(' ')
  };
})();
