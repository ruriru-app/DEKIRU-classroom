const test = require('node:test');
const assert = require('node:assert/strict');
const { unitPreset } = require('./support.cjs');

test('summaryText copies the current speech in summary order with one sentence per line', () => {
  const { w, preset } = unitPreset();
  let state = w.SpeechModel.initialState(preset);
  const before = w.SpeechModel.summary(preset, state);
  assert.ok(before.length > 1);

  const moved = w.SpeechModel.reduce(preset, state, {
    type: 'move-sentence',
    sentenceId: before[0].id,
    targetIndex: before.length - 1,
  });
  assert.equal(moved.ok, true);
  state = moved.state;

  assert.equal(
    w.SpeechModel.summaryText(preset, state),
    w.SpeechModel.summary(preset, state).map(({ text }) => text).join('\n'),
  );
});
