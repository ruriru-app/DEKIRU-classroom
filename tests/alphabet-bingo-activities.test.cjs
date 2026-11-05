const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const chrome = process.env.CHROME_PATH
  || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function dumpDom(url) {
  assert.ok(fs.existsSync(chrome), `Chrome not found: ${chrome}`);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'alphabet-bingo-activities-'));
  try {
    const run = spawnSync(chrome, [
      '--headless=new',
      '--disable-gpu',
      '--disable-extensions',
      '--no-first-run',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--allow-file-access-from-files',
      '--run-all-compositor-stages-before-draw',
      '--virtual-time-budget=4000',
      '--window-size=1366,768',
      `--user-data-dir=${profile}`,
      '--dump-dom',
      url
    ], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    assert.equal(run.status, 0, run.stderr || `Chrome failed for ${url}`);
    return run.stdout;
  } finally {
    if (profile.startsWith(os.tmpdir())) fs.rmSync(profile, { recursive: true, force: true });
  }
}

test('Grade 3-4 Activities keeps the original draw game and opens the new sheet maker separately', () => {
  const activitiesUrl = `${pathToFileURL(path.join(root, 'grade34', 'index.html')).href}#/activities`;
  const activities = dumpDom(activitiesUrl);

  assert.match(activities, /href="alphabet-bingo\.html"[^>]*>ひらく<\/a>/,
    'the original ALPHABET BINGO activity must remain');
  assert.match(activities, /href="alphabet-bingo-sheet\.html"[^>]*>ひらく<\/a>/,
    'the new sheet maker must have its own activity URL');
  assert.match(activities, />ALPHABET BINGO SHEET<\/h2>/,
    'the two activities must have distinguishable names');

  const original = dumpDom(pathToFileURL(path.join(root, 'grade34', 'alphabet-bingo.html')).href);
  assert.match(original, /id="open-guide"/);
  assert.match(original, /id="open-game"/);
  assert.doesNotMatch(original, /id="speechToggle"/,
    'the original URL must not be overwritten by the sheet maker');

  const sheet = dumpDom(pathToFileURL(path.join(root, 'grade34', 'alphabet-bingo-sheet.html')).href);
  assert.match(sheet, /id="speechToggle"/);
  assert.match(sheet, /id="board"/);
  assert.match(sheet, /id="cards"/);
});
