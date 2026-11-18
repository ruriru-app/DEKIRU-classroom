(() => {
  'use strict';
  const words = globalThis.PhonicsLesson?.words;
  if (!Array.isArray(words)) return;

  globalThis.PhonicsTypingActivity = {
    version: 1,
    type: 'english-typing',
    title: 'Consonant Blends',
    instructions: '',
    entries: words.map(english => ({english, japanese: ''})),
  };
})();
