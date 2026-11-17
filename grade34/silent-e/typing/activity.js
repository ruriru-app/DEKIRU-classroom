(() => {
  'use strict';
  const words = globalThis.PhonicsLesson?.words;
  if (!Array.isArray(words)) return;

  globalThis.PhonicsTypingActivity = {
    version: 1,
    type: 'english-typing',
    title: 'Silent E',
    instructions: '',
    entries: words.map(english => ({english, japanese: ''})),
  };
})();
