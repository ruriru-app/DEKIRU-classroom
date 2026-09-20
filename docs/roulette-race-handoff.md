# Roulette Race: all-player completion (2026-09-20)

- Before choosing 2–4 players, users can choose 4, 6, 8 or 12 course cards. This changes the current play session only, not the saved author preset or vocabulary pool. Existing presets using another count open with 6. Existing supported counts remain the initial selection. START is separate; the final card is GOAL.
- A player reaching GOAL is removed from the wheel and further draws. Play continues until every player reaches GOAL; only then is the replay overlay shown.
- The wheel uses 12 sectors. Remaining players' colors repeat evenly; winners are selected uniformly among unfinished players. Supported remaining counts are 1–4.
- Move controls are grey and disabled initially, during spins and after moving. Only the selected player's corner is colored/enabled. The clickable clipped corner includes the outer diagonal instruction strip, not just the pawn; the surrounding square is not clickable.
- Card-display changes update existing cards without rebuilding or interrupting the wheel.
- Source: `interview_work/games_site/roulette.js`, `legacy.css`, `index.html`. Rebuild using `games_site/build.cjs`.
- Regression: `interview_work/grade34_site/test-roulette-all-finish.cjs` covers four lengths, 2/3/4-player setup, 12 sectors, successive goals, control states and outer-strip hit testing for all four corners. It uses an isolated browser and local artwork fixtures; it does not modify teacher browser data.
- Recovery: `7fefe9290d0b3aa5147083a92955c585bae752dc`, local tag `backup-before-roulette-all-finish-20260920`.
- This change is prepared locally. Publication was not requested in the implementation turn.
