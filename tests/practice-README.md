# Enlarged pronunciation cards

Run `node --test tests/practice-text-scaling.test.cjs` with Playwright installed.
`PLAYWRIGHT_PATH` can point to an existing Playwright package; `CHROME_PATH` can select a Chrome executable.

The browser checks real Grade34 and Grade56 pages, 1/3/5-card text enlargement, unchanged overview text, long expressions, Japanese/English/picture toggles, viewport resizing and fullscreen.
Set `INTERVIEW_PUBLIC=1` to check the published site instead of the local files.
Existing phonics rendering is outside this change and remains on its original typography.
