# Roulette preset tile — 2026-09-20

## Implemented

- Grade 3/4 Unit Roulette tiles use the user-supplied SVG, unchanged, at its original 1527.43:1080 aspect ratio. The original is copied into `grade34/assets/ui/roulette-preset-base.svg` so the temporary upload is no longer required.
- The white field displays `everybodySentence` and `selectedSentence`, with separate lines. Longer expressions use smaller type; extreme text remains scrollable rather than overwriting other fields.
- WORDS displays the selected cards' category labels. Its modal lists only the selected, playable words, grouped by category. Native dialog keyboard focus, Escape and close-button behavior return focus to the WORDS button.
- Play opens the existing Roulette shared-game route in a separate tab; distribute opens the existing URL/QR dialog. The two button hit areas match the artwork capsules.
- The same tile currently renders browser-saved assigned Roulette games, allowing the design to be used immediately without labeling local games as official.

## Official content

`grade34_site/roulette-presets.js` (built as `grade34/roulette-presets.js`) is an administrator-controlled array of configurations using the existing Roulette schema. It is intentionally empty: no user game is automatically promoted to official status. To register an approved preset, add its selectedCardIds, expressions, assignedUnits, audiences and remaining configuration fields, then rebuild Grade34. Runtime mappable card IDs are restricted to `GAMES_CARD_ORDER` so the WORDS list matches the launch payload.

Actual official preset editorial content is still needed from the owner. The tile/registry implementation does not publish a sample as official. Grade56 has no existing Roulette integration and is not changed in this task.

## Verification / recovery

- Browser test: `interview_work/grade34_site/test-roulette-preset-tile.cjs` — expressions, selected subset, dialog focus/closing, launch and distribution, desktop/tablet/mobile dimensions, multiple categories, text escaping and official lookup with corrupt local storage.
- Rollback: local tag `backup-before-roulette-preset-tile-20260920` at `13b2159`.
- Build: `grade34_site/build-preview.cjs`.
- No publication requested or performed in this turn.
