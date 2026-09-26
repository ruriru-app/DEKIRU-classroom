# NHE6 World Map implementation results

2026-09-26. Implementation complete locally; not published. Existing unrelated grade34 modifications remain untouched.

- NHE6 former Unit5 vocabulary and named sets now appear under Unit6. New Unit5: clothes/ingredients main; fruit-vegetables/stationery optional.
- 205 country/territory records searchable by Japanese/English/aliases, Pacific-centered map, pan/zoom/fullscreen, English speech and return to Activities.
- Japan special case; 19 researched countries with 2025 Japan import evidence, linked cards including clothes. Unresearched records are not represented as zero trade. 72 cards audited, six clothing cards have sufficiently specific mappings. Annual/month sums validated for 94,732 official CSV rows.
- Read-only fresh gpt-6-astra review: no Critical, two Important, one Minor. No declined-to-judge items. Important findings fixed with failing regressions then passing tests. No second review.
- Final built suite: 76/76 passed. check-published-world-map.cjs validated against the local built server only, not live deployment.

## Rulings I made (ledger order)

1. Main import groups use top three HS chapters, separately from card matches. Complete annual totals support this; cost: broad groups, not individual product rankings.
2. Windows has no bash executable, so native commands and patch-maintained briefs/ledger replace shell bookkeeping. Evidence gates preserved; cost: manual record discipline.
3. Reused the existing isolated feature/interview-phase1 worktree. Unrelated grade34 changes excluded; cost: explicit path staging required.
4. Publication requires a fresh request under the approved plan. No public push performed; cost: current website unchanged.
5. Replaced shared-document migration with a read overlay and per-ID NHE6 updates. This cannot overwrite unrelated saves from legacy tabs. Original sets and selections remain; cost: additional local storage and raw source records keep their former Unit tags. User-visible sets appear in Unit6. First migration requires Web Locks; unsupported browsers receive a safe stop message.

## Review fixes

- Concurrent writer data loss: shared source is never rewritten by migration/NHE6 updates. Per-ID override records preserve updates, tombstones preserve deletion. Unit5 uses a new selection key. Tests cover interleaved unrelated saves, simultaneous tabs, effective Unit6 edits/deletes, new Unit5 isolation, source retention and no-lock guard.
- Map failure recovery: selecting a country does not erase the reload button or claim a visible location when the map has not loaded.

## Deferred minors

- Browse-all country/region list not included yet. Japanese search and direct map selection are available.

## Reproduction

From interview_work: node grade56_site/build.cjs; set INTERVIEW_BUILT=1; node run-classroom-tests.cjs.
Sources/tests remain in grade56_site and grade34_site per the implementation plan. Generated release assets are committed under grade56. Official input CSVs are preserved under outputs; hashes in grade56/assets/import-audit.json.

## Follow-up: Games ownership and publication

The user explicitly requested publication and approved Games as the shared home.
Map sources, generators, datasets and assets now live in games_site, with release
assets under games. The former grade56/world-map.html redirects to Games.
NHE6 Unit5 Activities supplies its return context; direct Games entry returns to
Games. Only valid NHE book/unit parameters can choose a return destination.
NHE6 Unit5 adds personal_items as an unchecked standard/Plus subcategory.

Verification: built-output full suite 76/76 passed. Browser checks cover Games
entry, Unit return and reopened Activities, old URL, invalid context, Japanese
search, image loading, zoom/fullscreen, mobile layout, unavailable speech, and
failed map recovery. Personal-items standard/Plus selections survive reload.
The number-only browser test now waits for navigation load before reading the
initialized scope; no product behavior was changed for that timing fix.

Independent read-only review: no Critical or Important findings. Kept the
regenerated sentence-forms cache hash because it matches the existing committed
asset; no sentence content changed. Unchanged geographic/import evidence and
storage-disabled behavior retain their prior review; unrelated grade34 edits
are excluded from publication. The full-suite gate was verified separately.

Current reproduction: build games_site/build.cjs and grade56_site/build.cjs,
then run run-classroom-tests.cjs with INTERVIEW_BUILT=1. Source evidence/audit
files moved unchanged to games/assets. Existing local worktree is retained.
