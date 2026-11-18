(() => {
  'use strict';
  const groups = [
    ['ar', '/ɑɹ/', 'car star arm park farm'],
    ['er', '/ɝ/', 'person mermaid'],
    ['er', '/ɚ/', 'teacher river winter'],
    ['ir', '/ɝ/', 'bird girl shirt skirt circle'],
    ['or', '/ɔɹ/', 'fork corn horse horn short'],
    ['ur', '/ɝ/', 'turtle nurse turn hurt surf']
  ];
  const words = [];
  const patterns = {};
  for (const [spelling, sound, list] of groups) {
    for (const word of list.split(' ')) {
      words.push(word);
      patterns[word] = {group: spelling, spelling, sound, start: word.indexOf(spelling)};
    }
  }
  globalThis.PhonicsLesson = {
    words,
    patterns,
    patternPrefix: 'r-controlled',
    imageExtension: 'webp',
    // Match the order of worksheets/r-controlled-vowels-writing-random.pdf.
    randomWorksheetWords: 'hurt teacher horse arm farm bird skirt person park girl surf circle corn turn short nurse horn river star fork turtle winter mermaid car shirt'.split(' ')
  };
})();
