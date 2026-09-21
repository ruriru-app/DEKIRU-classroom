# Roulette preset tile — 2026-09-20

## Implemented

- Grade 3/4 Unit Roulette tiles use the user-supplied SVG, unchanged, at its original 1527.43:1080 aspect ratio. The original is copied into `grade34/assets/ui/roulette-preset-base.svg` so the temporary upload is no longer required.
- The white field displays `everybodySentence` and `selectedSentence`, with separate lines. Longer expressions use smaller type; extreme text remains scrollable rather than overwriting other fields.
- WORDS displays the selected cards' category labels. Its modal lists only the selected, playable words, grouped by category. Native dialog keyboard focus, Escape and close-button behavior return focus to the WORDS button.
- Play opens the existing Roulette shared-game route in a separate tab; distribute opens the existing URL/QR dialog. The two button hit areas match the artwork capsules.
- Only administrator-registered official presets use the illustrated tile. Browser-saved games use the usual titled personal tile with play, share and confirmed deletion.

## Official content

`grade34_site/roulette-presets.js` (built as `grade34/roulette-presets.js`) is an administrator-controlled array of configurations using the existing Roulette schema. No user game is automatically promoted to official status. To register an approved preset, add its selectedCardIds, expressions, assignedUnits, audiences and remaining configuration fields, then rebuild Grade34. Runtime mappable card IDs are restricted to `GAMES_CARD_ORDER` so the WORDS list matches the launch payload.

The first owner-supplied official preset has now been registered: `official-roulette-lt1-u5-colors`, “すきな色をきいてみよう”, Let's Try! 1 Unit 5, individual devices. Expressions: `What color do you like?` / `I like (P).`. All 14 colors (`color_001`–`color_014`) are selected; picture and English enabled, Japanese disabled. Initial course length is 12, still selectable at play time. The owner supplied its share URL and confirmed the Unit. Grade56 has no existing Roulette integration and is not changed in this task.

## Verification / recovery

- Browser test: `interview_work/grade34_site/test-roulette-preset-tile.cjs` — expressions, selected subset, dialog focus/closing, launch and distribution, desktop/tablet/mobile dimensions, multiple categories, text escaping and official lookup with corrupt local storage.
- Rollback: local tag `backup-before-roulette-preset-tile-20260920` at `13b2159`.
- Build: `grade34_site/build-preview.cjs`.
- Publication will include all three owner-supplied Unit 5 presets together, following the owner's request to add two more before publishing.

## Additional owner-supplied presets

- `official-roulette-lt1-u5-fruits`: “すきなフルーツをきいてみよう”; `What fruit do you like?` / `I like (P).`; the 12 selected fruit cards from the supplied share URL (not the entire fruits/vegetables category).
- `official-roulette-lt1-u5-foods`: “すきな食べ物をきいてみよう”; `What food do you like?` / `I like (P).`; the supplied 10 food and 3 dessert cards, plus owner-requested noodle (14 total).
- Both use `lt1:5`, individual devices, initial 12 cards with runtime choice, English/picture on and Japanese off, matching the supplied URLs.
- `test-official-roulette-presets.cjs` checks all three from a clean browser (no local presets) and their game launch. `INTERVIEW_PUBLIC=1` runs the same checks on the public site.

## Vocabulary and pronunciation update

- 83 image-backed Let’s Try expression cards appended after the original 882 playable IDs. Never reorder or insert within this extension: old share links encode bit positions. Source dictionary entries stay unchanged.
- Food additions noodle/jam/snack appear under foods → Let’s Try! 追加語; remaining extra words and alphabet cards have a Let’s Try! 追加語 category. All source artwork is checked to exist.
- Explicit preference forms apply at each `like (P)` placeholder, not to other sentence placeholders; uncountable food and color orange stay unchanged. Sentence read-aloud uses displayed forms.
- Top-right temporary 発音練習 button opens only the preset’s selected vocabulary, with pictures and tap-to-speak using the activity’s preference forms. Close/Escape stops speech and restores focus. Replace the temporary button contents with owner-supplied SVG later; keep its handler and accessible name.
- Regression tests: test-games-vocabulary.cjs, test-games-vocabulary-browser.cjs, test-roulette-practice.cjs. Existing URL positions, full image loading, preference speech, non-preference isolation, modal focus and narrow screens covered.

## Personal / official separation — 2026-09-21

- Origin is taken from the official registry, never a stored flag or an ID prefix. Personal records remain personal even if an ID matches an official preset.
- Personal deletion updates only `dekiru-created-games-v1`, retaining unrelated records. The confirmation explains that all Unit placements and the Create Games entry are removed, while official presets and existing share URLs remain.
- Cancellation and failed storage writes leave the tile/data unchanged; successful deletion removes both class/individual tile instances without closing the current section.
- Browser regression: `test-personal-roulette-tiles.cjs`; also supports `INTERVIEW_PUBLIC=1` with an isolated test browser.
