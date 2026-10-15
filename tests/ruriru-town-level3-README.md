# RuRiRu Town LEVEL 3

Open `games/ruriru-town-level3.html` on an HTTPS host (or localhost).
The A–N starts, sprites and effects reuse LEVEL 2; LEVEL 3 has its own map and scripts.

1. Choose a start, then confirm a destination from the map or list.
2. Press 音声入力 and speak one of the four unit expressions.
3. Inspect the recognized sentence; press 動かす to execute an accepted sentence.
4. If the expression is rejected, optionally press ヒントを表示. Only the next instruction is shown. 🔊 reads it after capture has stopped and resumes capture after a short pause.
5. End with You can see it on your right/left at a configured roadside arrival spot.

Named quarter-size facilities use their outer side street as the arrival spot; large full-block facilities can be approached from all four sides. Destination borders and highlights identify the selected facility.

Run core checks with:

```sh
node --test tests/ruriru-town-level3-*.test.cjs
```

The model test independently checks all 308 start/goal routes against shortest walking distances. Speech tests use controlled lifecycle events; they do not measure microphone quality or recognition accuracy. Check actual speech, permissions, classroom noise and synthesis on the school's managed Chrome/Chromebooks before classroom use. Recognition can require a network connection. No speech audio, transcripts or pupil data are stored by the app.

To export a standalone HTML (embedded map, animation frames and sound effects):

```sh
python scripts/export-ruriru-town-level3.py /absolute/output/RuRiRu_Town_LEVEL3.html
```

Speech recognition and some device voices may still need internet. The student page contains no links to teacher or administrator screens.
