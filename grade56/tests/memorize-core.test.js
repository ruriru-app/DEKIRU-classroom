'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../memorize-core.js');

test('parseSpeech treats each non-empty pasted line as one source sentence', () => {
  const sentences = Core.parseSpeech('  I like dogs.\r\n\r\nWe can play together!  ');
  assert.deepEqual(sentences, [
    { id: 'sentence-0', text: 'I like dogs.', tokens: ['i', 'like', 'dogs'] },
    { id: 'sentence-1', text: 'We can play together!', tokens: ['we', 'can', 'play', 'together'] },
  ]);
});

test('parseSpeech splits a single line at English terminal punctuation', () => {
  const sentences = Core.parseSpeech('First we sing. Do you dance? I do!');
  assert.deepEqual(sentences.map(({ text, tokens }) => ({ text, tokens })), [
    { text: 'First we sing.', tokens: ['first', 'we', 'sing'] },
    { text: 'Do you dance?', tokens: ['do', 'you', 'dance'] },
    { text: 'I do!', tokens: ['i', 'do'] },
  ]);
});

test('parseSpeech keeps closing quotation marks with their sentence', () => {
  const sentences = Core.parseSpeech('"Hello!" She said, "Goodbye."');
  assert.deepEqual(sentences.map(({ text, tokens }) => ({ text, tokens })), [
    { text: '"Hello!"', tokens: ['hello'] },
    { text: 'She said, "Goodbye."', tokens: ['she', 'said', 'goodbye'] },
  ]);
});

test('parseSpeech accepts one unpunctuated sentence and rejects blank input', () => {
  assert.deepEqual(Core.parseSpeech('  We help animals  '), [
    { id: 'sentence-0', text: 'We help animals', tokens: ['we', 'help', 'animals'] },
  ]);
  assert.deepEqual(Core.parseSpeech(' \n\t '), []);
});

test('normalizeTokens ignores case punctuation apostrophe style and spacing', () => {
  assert.deepEqual(Core.normalizeTokens('  Ｉ’ｍ,   HAPPY！ '), ['i', 'am', 'happy']);
  assert.deepEqual(Core.normalizeTokens('I am happy.'), ['i', 'am', 'happy']);
});

test('normalizeTokens keeps Japanese words returned by speech recognition', () => {
  assert.deepEqual(Core.normalizeTokens('I like お好み焼き。'), ['i', 'like', 'お好み焼き']);
});

test('normalizeTokens expands every supported elementary contraction', () => {
  const cases = [
    ["I'm", 'i am'], ["you're", 'you are'], ["we're", 'we are'], ["they're", 'they are'],
    ["it's", 'it is'], ["that's", 'that is'], ["don't", 'do not'], ["doesn't", 'does not'],
    ["didn't", 'did not'], ["can't", 'can not'], ['cannot', 'can not'], ["won't", 'will not'],
    ["isn't", 'is not'], ["aren't", 'are not'], ["wasn't", 'was not'], ["weren't", 'were not'],
    ["I've", 'i have'], ["we've", 'we have'], ["I'll", 'i will'], ["we'll", 'we will'],
  ];
  for (const [contracted, expanded] of cases) {
    assert.deepEqual(Core.normalizeTokens(contracted), expanded.split(' '), contracted);
    assert.deepEqual(Core.normalizeTokens(contracted.replace("'", '’')), expanded.split(' '), `${contracted} curly`);
  }
});

test('normalizeTokens expands additional common contractions for general English', () => {
  const cases = [
    ["let's", 'let us'], ["he's", 'he is'], ["she's", 'she is'], ["there's", 'there is'],
    ["what's", 'what is'], ["who's", 'who is'], ["where's", 'where is'], ["how's", 'how is'],
    ["you've", 'you have'], ["they've", 'they have'], ["you'll", 'you will'], ["he'll", 'he will'],
    ["she'll", 'she will'], ["they'll", 'they will'], ["it'll", 'it will'], ["couldn't", 'could not'],
    ["shouldn't", 'should not'], ["wouldn't", 'would not'], ["haven't", 'have not'], ["hasn't", 'has not'],
    ["hadn't", 'had not'], ["mustn't", 'must not'], ["needn't", 'need not'],
  ];
  for (const [contracted, expanded] of cases) {
    assert.deepEqual(Core.normalizeTokens(contracted), expanded.split(' '), contracted);
  }
});

test('parseSpeech preserves HTML-looking input as plain display text', () => {
  const [sentence] = Core.parseSpeech('<b>Hello</b>.');
  assert.equal(sentence.text, '<b>Hello</b>.');
});

test('parseSpeech automatically marks Japanese text as a flexible name slot', () => {
  const [sentence] = Core.parseSpeech('I went to イオンモール with my family.');
  assert.equal(sentence.text, 'I went to イオンモール with my family.');
  assert.deepEqual(sentence.matchParts, [
    { type: 'exact', tokens: ['i', 'went', 'to'] },
    { type: 'name', label: 'イオンモール' },
    { type: 'exact', tokens: ['with', 'my', 'family'] },
  ]);
});

test('parseSpeech turns double-bracketed romanized text into a hidden flexible name slot', () => {
  const [sentence] = Core.parseSpeech('I ate [[okonomiyaki]] in Osaka.');
  assert.equal(sentence.text, 'I ate okonomiyaki in Osaka.');
  assert.deepEqual(sentence.matchParts, [
    { type: 'exact', tokens: ['i', 'ate'] },
    { type: 'name', label: 'okonomiyaki' },
    { type: 'exact', tokens: ['in', 'osaka'] },
  ]);
});

test('speechFingerprint is stable for equivalent words and punctuation', () => {
  const first = Core.parseSpeech('I like dogs.\nWe play together.');
  const equivalent = Core.parseSpeech('  i LIKE dogs!\nwe play together?  ');
  assert.equal(Core.speechFingerprint(first), Core.speechFingerprint(equivalent));
});

test('speechFingerprint changes for different words or sentence boundaries', () => {
  const original = Core.parseSpeech('I like dogs.\nWe play together.');
  const changedWord = Core.parseSpeech('I like cats.\nWe play together.');
  const changedBoundary = Core.parseSpeech('I like.\nDogs we play together.');
  assert.notEqual(Core.speechFingerprint(original), Core.speechFingerprint(changedWord));
  assert.notEqual(Core.speechFingerprint(original), Core.speechFingerprint(changedBoundary));
});

test('speechFingerprint changes when a flexible name or its matching rule changes', () => {
  const firstName = Core.parseSpeech('I ate [[okonomiyaki]].');
  const secondName = Core.parseSpeech('I ate [[takoyaki]].');
  const strictName = Core.parseSpeech('I ate okonomiyaki.');
  assert.notEqual(Core.speechFingerprint(firstName), Core.speechFingerprint(secondName));
  assert.notEqual(Core.speechFingerprint(firstName), Core.speechFingerprint(strictName));
});

function sentenceFixture(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `sentence-${index}`,
    text: `Sentence ${index + 1}.`,
    tokens: ['sentence', String(index + 1)],
  }));
}

function stageShape(stages) {
  return stages.map(({ id, sentenceIndexes }) => ({ id, sentenceIndexes }));
}

test('buildStages creates one beginner stage per sentence', () => {
  assert.deepEqual(stageShape(Core.buildStages(sentenceFixture(4), 'beginner')), [
    { id: 'sentence-0', sentenceIndexes: [0] },
    { id: 'sentence-1', sentenceIndexes: [1] },
    { id: 'sentence-2', sentenceIndexes: [2] },
    { id: 'sentence-3', sentenceIndexes: [3] },
  ]);
});

test('buildStages splits even and odd intermediate manuscripts into contiguous halves', () => {
  assert.deepEqual(stageShape(Core.buildStages(sentenceFixture(4), 'intermediate')), [
    { id: 'half-0', sentenceIndexes: [0, 1] },
    { id: 'half-1', sentenceIndexes: [2, 3] },
  ]);
  assert.deepEqual(stageShape(Core.buildStages(sentenceFixture(5), 'intermediate')), [
    { id: 'half-0', sentenceIndexes: [0, 1, 2] },
    { id: 'half-1', sentenceIndexes: [3, 4] },
  ]);
});

test('buildStages never creates an empty stage for a one-sentence manuscript', () => {
  assert.deepEqual(stageShape(Core.buildStages(sentenceFixture(1), 'intermediate')), [
    { id: 'half-0', sentenceIndexes: [0] },
  ]);
});

test('buildStages creates one full advanced stage and preserves 120 sentences', () => {
  const advanced = Core.buildStages(sentenceFixture(120), 'advanced');
  assert.equal(advanced.length, 1);
  assert.equal(advanced[0].id, 'full');
  assert.equal(advanced[0].sentences.length, 120);
  assert.deepEqual(advanced[0].sentenceIndexes, Array.from({ length: 120 }, (_, index) => index));
});

test('buildStages returns no stages for empty input', () => {
  for (const difficulty of ['beginner', 'intermediate', 'advanced']) {
    assert.deepEqual(Core.buildStages([], difficulty), []);
  }
});

test('progressSegments keeps one total width while stages span their sentence counts', () => {
  const sentences = sentenceFixture(6);
  assert.deepEqual(Core.progressSegments(Core.buildStages(sentences, 'beginner')), {
    totalUnits: 6,
    segments: [
      { id: 'sentence-0', units: 1 },
      { id: 'sentence-1', units: 1 },
      { id: 'sentence-2', units: 1 },
      { id: 'sentence-3', units: 1 },
      { id: 'sentence-4', units: 1 },
      { id: 'sentence-5', units: 1 },
    ],
  });
  assert.deepEqual(Core.progressSegments(Core.buildStages(sentences, 'intermediate')), {
    totalUnits: 6,
    segments: [{ id: 'half-0', units: 3 }, { id: 'half-1', units: 3 }],
  });
  assert.deepEqual(Core.progressSegments(Core.buildStages(sentences, 'advanced')), {
    totalUnits: 6,
    segments: [{ id: 'full', units: 6 }],
  });
});

test('layoutFor chooses one RuRiRu column or responsive ordinary-text columns', () => {
  assert.deepEqual(Core.layoutFor(1, 1400), { columns: 1, rows: 1, writingLines: true });
  assert.deepEqual(Core.layoutFor(4, 1400), { columns: 1, rows: 4, writingLines: true });
  assert.deepEqual(Core.layoutFor(5, 759), { columns: 1, rows: 5, writingLines: true });
  assert.deepEqual(Core.layoutFor(5, 760), { columns: 1, rows: 5, writingLines: true });
  assert.deepEqual(Core.layoutFor(6, 1400), { columns: 1, rows: 6, writingLines: true });
  assert.deepEqual(Core.layoutFor(7, 1400), { columns: 1, rows: 7, writingLines: true });
  assert.deepEqual(Core.layoutFor(8, 760), { columns: 2, rows: 4, writingLines: false });
  assert.deepEqual(Core.layoutFor(10, 1400), { columns: 2, rows: 5, writingLines: false });
  assert.deepEqual(Core.layoutFor(11, 1099), { columns: 2, rows: 6, writingLines: false });
  assert.deepEqual(Core.layoutFor(11, 1100), { columns: 3, rows: 4, writingLines: false });
  assert.deepEqual(Core.layoutFor(120, 600), { columns: 1, rows: 120, writingLines: true });
});

test('sentencePresentation keeps the full manuscript and marks active and cleared ranges', () => {
  const sentences = sentenceFixture(5);
  const stages = Core.buildStages(sentences, 'intermediate');
  assert.deepEqual(
    Core.sentencePresentation(sentences, stages, ['half-0'], 'half-1')
      .map(({ index, active, cleared }) => ({ index, active, cleared })),
    [
      { index: 0, active: false, cleared: true },
      { index: 1, active: false, cleared: true },
      { index: 2, active: false, cleared: true },
      { index: 3, active: true, cleared: false },
      { index: 4, active: true, cleared: false },
    ],
  );
});

test('sentenceCardView keeps compact cards hidden until the active hint opens', () => {
  const active = { index: 0, active: true, cleared: false };
  assert.deepEqual(Core.sentenceCardView(active, false), {
    numberLabel: '1.', checked: false, revealed: false,
  });
  assert.deepEqual(Core.sentenceCardView(active, true), {
    numberLabel: '1.', checked: false, revealed: true,
  });
  assert.deepEqual(Core.sentenceCardView({ index: 11, active: false, cleared: true }, true), {
    numberLabel: '12.', checked: true, revealed: false,
  });
  assert.deepEqual(Core.sentenceCardView({ index: 2, active: true, cleared: false, attemptMatched: true }, false), {
    numberLabel: '3.', checked: true, revealed: false,
  });
});

test('practiceActionFor exposes one control for starting stopping and waiting', () => {
  const idle = sessionFixture();
  assert.deepEqual(Core.practiceActionFor(idle), {
    label: 'スタート', mode: 'start', disabled: false,
  });

  const listening = Core.transition(idle, { type: 'start-listening' });
  assert.deepEqual(Core.practiceActionFor(listening), {
    label: 'できた！', mode: 'stop', disabled: false,
  });

  const stopping = Core.transition(listening, { type: 'request-stop' });
  assert.deepEqual(Core.practiceActionFor(stopping), {
    label: '判定中…', mode: 'stopping', disabled: true,
  });

  assert.equal(Core.practiceActionFor({ ...idle, attemptState: 'hint-open' }).disabled, true);
  assert.equal(Core.practiceActionFor(null).disabled, true);
});

test('manuscriptConfirmationFor describes checking the English instead of a hint', () => {
  assert.deepEqual(Core.manuscriptConfirmationFor({ attemptState: 'hint-open' }), {
    label: '英文を閉じる',
    open: true,
  });
  assert.deepEqual(Core.manuscriptConfirmationFor({ attemptState: 'hint-available' }), {
    label: '英文を確認する',
    open: false,
  });
});

test('reconcileProgress creates empty per-difficulty progress when none is stored', () => {
  const sentences = sentenceFixture(5);
  const fingerprint = Core.speechFingerprint(sentences);
  const validIds = Core.stageIdsByDifficulty(sentences);
  assert.deepEqual(Core.reconcileProgress(undefined, fingerprint, validIds), {
    status: 'new',
    progress: {
      schemaVersion: 1,
      fingerprint,
      completed: { beginner: [], intermediate: [], advanced: [] },
    },
  });
});

test('reconcileProgress preserves only unique valid IDs for the same manuscript', () => {
  const sentences = sentenceFixture(5);
  const fingerprint = Core.speechFingerprint(sentences);
  const validIds = Core.stageIdsByDifficulty(sentences);
  const stored = {
    schemaVersion: 1,
    fingerprint,
    completed: {
      beginner: ['sentence-0', 'sentence-0', 'sentence-99'],
      intermediate: ['half-1', 'half-0'],
      advanced: ['full'],
    },
  };
  const result = Core.reconcileProgress(stored, fingerprint, validIds);
  assert.equal(result.status, 'same');
  assert.deepEqual(result.progress.completed, {
    beginner: ['sentence-0'],
    intermediate: ['half-1', 'half-0'],
    advanced: ['full'],
  });
});

test('reconcileProgress resets every difficulty for another fingerprint', () => {
  const sentences = sentenceFixture(3);
  const validIds = Core.stageIdsByDifficulty(sentences);
  const result = Core.reconcileProgress({
    schemaVersion: 1,
    fingerprint: 'v1-old',
    completed: { beginner: ['sentence-0'], intermediate: ['half-0'], advanced: ['full'] },
  }, Core.speechFingerprint(sentences), validIds);
  assert.equal(result.status, 'reset');
  assert.deepEqual(result.progress.completed, { beginner: [], intermediate: [], advanced: [] });
});

test('reconcileProgress safely replaces malformed or stale completion fields', () => {
  const sentences = sentenceFixture(2);
  const fingerprint = Core.speechFingerprint(sentences);
  const validIds = Core.stageIdsByDifficulty(sentences);
  const result = Core.reconcileProgress({
    schemaVersion: 1,
    fingerprint,
    completed: {
      beginner: 'sentence-0',
      intermediate: ['half-0', '__proto__', 'constructor'],
      advanced: null,
    },
  }, fingerprint, validIds);
  assert.equal(result.status, 'same');
  assert.deepEqual(result.progress.completed, {
    beginner: [],
    intermediate: ['half-0'],
    advanced: [],
  });
});

test('matchTranscript accepts exact normalized text and contracted equivalents', () => {
  const ordinary = Core.parseSpeech('I like dogs.\nWe can play together.');
  assert.deepEqual(Core.matchTranscript(ordinary, 'I LIKE DOGS! We can play together.'), {
    matched: true,
    actualTokens: ['i', 'like', 'dogs', 'we', 'can', 'play', 'together'],
    sentenceMatches: [true, true],
  });

  const contractions = Core.parseSpeech('I am happy.\nWe cannot swim.');
  assert.equal(Core.matchTranscript(contractions, "I'm happy. We can't swim!").matched, true);
});

test('matchTranscript reports which complete sentences were recognized in order', () => {
  const sentences = Core.parseSpeech('I like dogs.\nWe can play together.\nIt is fun.');
  assert.deepEqual(
    Core.matchTranscript(sentences, 'I like dogs. We can play outside. It is fun.').sentenceMatches,
    [true, false, true],
  );
  assert.deepEqual(
    Core.matchTranscript(sentences, 'We can play together.').sentenceMatches,
    [false, true, false],
  );
  assert.deepEqual(
    Core.matchTranscript(sentences, 'First, I like dogs. Then, it is fun.').sentenceMatches,
    [true, false, true],
  );
});

test('sentence diagnostics support flexible names without weakening the full-stage result', () => {
  const sentences = Core.parseSpeech('I went to イオンモール.\nI ate [[okonomiyaki]].\nIt was delicious.');
  const result = Core.matchTranscript(sentences, 'I went to eon mall. It was delicious.');
  assert.equal(result.matched, false);
  assert.deepEqual(result.sentenceMatches, [true, false, true]);
});

test('matchTranscript rejects missing replaced reordered and extra words', () => {
  const sentences = Core.parseSpeech('I like dogs.\nWe can play together.');
  const rejected = [
    'I like. We can play together.',
    'I like cats. We can play together.',
    'I dogs like. We can play together.',
    'Today I like dogs. We can play together.',
    'I really like dogs. We can play together.',
    'I like dogs. We can play together now.',
  ];
  for (const transcript of rejected) {
    assert.equal(Core.matchTranscript(sentences, transcript).matched, false, transcript);
  }
});

test('matchTranscript accepts a misrecognized Japanese or marked proper name', () => {
  const japanese = Core.parseSpeech('I went to イオンモール with my family.');
  assert.equal(Core.matchTranscript(japanese, 'I went to eon more with my family.').matched, true);

  const marked = Core.parseSpeech('I ate [[okonomiyaki]] in Osaka.');
  assert.equal(Core.matchTranscript(marked, 'I ate economy yaki in Osaka.').matched, true);
  assert.equal(Core.matchTranscript(marked, 'I ate お好み焼き in Osaka.').matched, true);
});

test('matchTranscript requires speech in every name slot and keeps surrounding English strict', () => {
  const sentences = Core.parseSpeech('I ate [[okonomiyaki]] with my family.');
  const rejected = [
    'I ate with my family.',
    'I ate economy yaki my family.',
    'I eat economy yaki with my family.',
    'I ate economy yaki with family.',
  ];
  for (const transcript of rejected) {
    assert.equal(Core.matchTranscript(sentences, transcript).matched, false, transcript);
  }
});

test('matchTranscript permits one listed connector at each sentence boundary', () => {
  const sentences = Core.parseSpeech('I like dogs.\nWe can play together.');
  const connectors = ['First', 'Next', 'Then', 'And', 'But', 'So', 'Also', 'Finally', 'After that', 'Because'];
  for (const connector of connectors) {
    assert.equal(
      Core.matchTranscript(sentences, `${connector}, I like dogs. We can play together.`).matched,
      true,
      connector,
    );
  }
  assert.equal(
    Core.matchTranscript(sentences, 'First, I like dogs. After that, we can play together.').matched,
    true,
  );
});

test('matchTranscript does not discard a connector already registered in the source sentence', () => {
  const sentences = Core.parseSpeech('And I like dogs.\nBecause we can play together.');
  assert.equal(Core.matchTranscript(sentences, 'And I like dogs. Because we can play together.').matched, true);
  assert.equal(Core.matchTranscript(sentences, 'First, and I like dogs. Then, because we can play together.').matched, true);
});

test('matchTranscript rejects connectors away from boundaries stacks and unrelated extras', () => {
  const sentences = Core.parseSpeech('I like dogs.\nWe can play together.');
  const rejected = [
    'I like and dogs. We can play together.',
    'First next I like dogs. We can play together.',
    'First today I like dogs. We can play together.',
    'I like dogs. Then now we can play together.',
  ];
  for (const transcript of rejected) {
    assert.equal(Core.matchTranscript(sentences, transcript).matched, false, transcript);
  }
});

function sessionFixture(count = 3, recognitionSupported = true, completed = {}) {
  const sentences = sentenceFixture(count);
  const fingerprint = Core.speechFingerprint(sentences);
  const validIds = Core.stageIdsByDifficulty(sentences);
  const progress = Core.reconcileProgress({
    schemaVersion: 1,
    fingerprint,
    completed: {
      beginner: completed.beginner || [],
      intermediate: completed.intermediate || [],
      advanced: completed.advanced || [],
    },
  }, fingerprint, validIds).progress;
  return Core.createSession(sentences, progress, recognitionSupported);
}

test('createSession selects the first beginner stage and represents recognition support', () => {
  const supported = sessionFixture(3, true);
  assert.equal(supported.selectedDifficulty, 'beginner');
  assert.equal(supported.selectedStageId, 'sentence-0');
  assert.equal(supported.recognitionState, 'idle');
  assert.equal(supported.attemptState, 'locked');
  assert.equal(supported.lastTranscript, '');
  assert.equal(supported.lastResult, null);
  assert.equal(supported.difficultyComplete, false);

  const unsupported = sessionFixture(3, false);
  assert.equal(unsupported.recognitionState, 'unsupported');
  assert.equal(Core.transition(unsupported, { type: 'start-listening' }).recognitionState, 'unsupported');
});

test('navigation resets transient attempt data and preserves unsupported recognition state', () => {
  let state = sessionFixture(5, false);
  state = { ...state, attemptState: 'hint-available', lastTranscript: 'old words', lastResult: 'incorrect' };
  state = Core.transition(state, { type: 'select-difficulty', difficulty: 'intermediate' });
  assert.equal(state.selectedDifficulty, 'intermediate');
  assert.equal(state.selectedStageId, 'half-0');
  assert.equal(state.recognitionState, 'unsupported');
  assert.equal(state.attemptState, 'locked');
  assert.equal(state.lastTranscript, '');
  assert.equal(state.lastResult, null);

  state = Core.transition(state, { type: 'select-stage', stageId: 'half-1' });
  assert.equal(state.selectedStageId, 'half-1');
  state = Core.transition(state, { type: 'restart-stage' });
  assert.equal(state.selectedStageId, 'half-1');
  assert.equal(state.attemptState, 'locked');
});

test('recognition lifecycle hides scoring until a stopped attempt result arrives', () => {
  let state = sessionFixture();
  state = Core.transition(state, { type: 'start-listening' });
  assert.equal(state.recognitionState, 'listening');
  assert.equal(state.lastTranscript, '');
  assert.equal(state.lastResult, null);

  state = Core.transition(state, { type: 'request-stop' });
  assert.equal(state.recognitionState, 'stopping');

  const unchanged = Core.transition(state, { type: 'select-stage', stageId: 'sentence-2' });
  assert.equal(unchanged.selectedStageId, state.selectedStageId);

  state = Core.transition(state, { type: 'recognition-error' });
  assert.equal(state.recognitionState, 'idle');
  assert.equal(state.lastResult, 'error');
  assert.equal(state.attemptState, 'locked');
});

test('incorrect results unlock one closable hint and allow retry without consuming it', () => {
  let state = sessionFixture();
  state = Core.transition(state, { type: 'start-listening' });
  state = Core.transition(state, { type: 'request-stop' });
  state = Core.transition(state, { type: 'attempt-result', matched: false, transcript: 'wrong words' });
  assert.equal(state.recognitionState, 'idle');
  assert.equal(state.attemptState, 'hint-available');
  assert.equal(state.lastTranscript, 'wrong words');
  assert.equal(state.lastResult, 'incorrect');

  const retry = Core.transition(state, { type: 'start-listening' });
  assert.equal(retry.recognitionState, 'listening');
  assert.equal(retry.attemptState, 'hint-available');

  state = Core.transition(state, { type: 'open-hint' });
  assert.equal(state.attemptState, 'hint-open');
  assert.deepEqual(Core.transition(state, { type: 'start-listening' }), state);
  state = Core.transition(state, { type: 'close-hint' });
  assert.equal(state.attemptState, 'hint-available');
});

test('an incorrect grouped attempt keeps only its per-sentence feedback until retry', () => {
  let state = sessionFixture(5);
  state = Core.transition(state, { type: 'select-difficulty', difficulty: 'intermediate' });
  state = Core.transition(state, { type: 'start-listening' });
  state = Core.transition(state, { type: 'request-stop' });
  state = Core.transition(state, {
    type: 'attempt-result',
    matched: false,
    transcript: 'partial words',
    sentenceMatches: [true, false, true],
  });
  assert.deepEqual(state.lastSentenceMatches, ['sentence-0', 'sentence-2']);
  assert.deepEqual(state.completed.intermediate, []);

  state = Core.transition(state, { type: 'start-listening' });
  assert.deepEqual(state.lastSentenceMatches, []);
});

test('correct results clear once advance to the next uncleared stage and remain replayable', () => {
  let state = sessionFixture(3);
  state = Core.transition(state, { type: 'start-listening' });
  state = Core.transition(state, { type: 'request-stop' });
  state = Core.transition(state, { type: 'attempt-result', matched: true, transcript: 'sentence one' });
  assert.deepEqual(state.completed.beginner, ['sentence-0']);
  assert.equal(state.selectedStageId, 'sentence-1');
  assert.equal(state.attemptState, 'locked');
  assert.equal(state.lastResult, 'correct');
  assert.equal(state.difficultyComplete, false);

  state = Core.transition(state, { type: 'select-stage', stageId: 'sentence-0' });
  assert.equal(state.selectedStageId, 'sentence-0');
  assert.deepEqual(state.completed.beginner, ['sentence-0']);
  state = Core.transition(state, { type: 'restart-stage' });
  assert.deepEqual(state.completed.beginner, ['sentence-0']);
});

test('clearing the final uncleared stage marks only the selected difficulty complete', () => {
  let state = sessionFixture(3, true, { beginner: ['sentence-0', 'sentence-1'] });
  state = Core.transition(state, { type: 'select-stage', stageId: 'sentence-2' });
  state = Core.transition(state, { type: 'start-listening' });
  state = Core.transition(state, { type: 'request-stop' });
  state = Core.transition(state, { type: 'attempt-result', matched: true, transcript: 'sentence three' });
  assert.deepEqual(state.completed.beginner, ['sentence-0', 'sentence-1', 'sentence-2']);
  assert.deepEqual(state.completed.intermediate, []);
  assert.deepEqual(state.completed.advanced, []);
  assert.equal(state.selectedStageId, 'sentence-2');
  assert.equal(state.difficultyComplete, true);
});
