(() => {
  'use strict';
  const groups = [
    ['ai', '/eɪ/', 'a', 'train rain'],
    ['ay', '/eɪ/', 'a', 'play gray'],
    ['ea', '/iː/', 'e', 'eat tea beach'],
    ['ee', '/iː/', 'e', 'bee tree'],
    ['ey', '/iː/', 'e', 'key monkey'],
    ['ie', '/aɪ/', 'i', 'pie tie'],
    ['igh', '/aɪ/', 'i', 'light night'],
    ['oa', '/oʊ/', 'o', 'boat coat soap'],
    ['ow', '/oʊ/', 'o', 'snow window'],
    ['oe', '/oʊ/', 'o', 'toe'],
    ['ue', '/uː/', 'u', 'blue glue'],
    ['ui', '/uː/', 'u', 'fruit juice']
  ];
  const soundsByWord = {monkey: '/i/'};
  const words = [];
  const patterns = {};
  for (const [spelling, sound, group, list] of groups) {
    for (const word of list.split(' ')) {
      words.push(word);
      patterns[word] = {group, spelling, sound: soundsByWord[word] ?? sound, start: word.indexOf(spelling)};
    }
  }
  globalThis.PhonicsLesson = {
    words,
    patterns,
    imageExtension: 'webp',
    // Match the order of worksheets/vowel-teams-1-writing-random.pdf.
    randomWorksheetWords: 'toe bee coat rain juice light tree gray pie fruit window play soap tea boat key night blue train eat monkey tie snow glue beach'.split(' ')
  };
})();
