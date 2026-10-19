(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NheSpeechLinks = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const publicBase = 'https://ruriru-app.github.io/DEKIRU-classroom/grade56/';

  function entries(hasBuild, book, unit) {
    if (!hasBuild) return [];
    const buildPath = `build-my-speech.html?book=${encodeURIComponent(book)}&unit=${encodeURIComponent(unit)}`;
    return [
      {
        id: 'build',
        title: 'BUILD MY SPEECH',
        description: 'カードで文を作り、まとめてスピーチを練習しよう',
        path: buildPath,
        publicUrl: `${publicBase}${buildPath}`,
      },
      ...((book === 'nh5' || book === 'nh6') && Number(unit) === 5 ? [{
        id: 'practice',
        title: 'PRACTICE MY SPEECH',
        description: '英文を見ながら読み、伝わらなかった単語を練習しよう',
        path: 'practice-my-speech.html',
        publicUrl: `${publicBase}practice-my-speech.html`,
      }] : []),
      {
        id: 'memorize',
        title: 'MEMORIZE MY SPEECH',
        description: '英文を見ずに話し、覚えたスピーチを確かめよう',
        path: 'memorize-my-speech.html',
        publicUrl: `${publicBase}memorize-my-speech.html`,
      },
    ];
  }

  return Object.freeze({ entries });
});
