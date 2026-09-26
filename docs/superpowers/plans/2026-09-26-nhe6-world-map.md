# NHE6 Unit整理・世界地図 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** NHE6 Unit5/6を修正し、日本語の国名検索とカードに対応した日本向け輸入情報を使える世界地図活動を追加する。

**Architecture:** Unit設定・保存移行と世界地図活動を独立したモジュールに分ける。地図・国名・調査済み輸入品は静的データとして同梱し、授業中の外部検索を不要にする。既存カードIDと画像を再利用する。

**Tech Stack:** 既存のJavaScript/HTML/CSS、localStorage、SVG、Node.js、Playwright。新規バックエンドなし。

**Spec:** `docs/superpowers/specs/2026-09-26-nhe6-world-map-design.md`

## Global Constraints

- 作業ルートは `interview_work`。以下のソースパスはこのルートからの相対パス。
- `sources/` は読み取り専用。既存の未公開grade34変更を混ぜない。
- NHE5の内容は変更しない。
- 各カテゴリーの通常／Plusを表示。通常には接尾語を付けない。
- 「カードで学べる」は上位ランキングを意味しない。
- 日本向け輸入を確認できた品目だけ掲載。原則2025年通年、年と統計区分を明記。
- 未調査・未確認は「輸入なし」ではなく「この品目の情報は未収録」とする。
- 今回は日本向け輸入のみ。「その国の主な輸出品」は将来候補として残す。
- 公開は改めてユーザーの指示を確認してから。公開前に全体テストを実行する。

## Review Focus

- 保存容量不足や途中終了でも旧Unit5のセットを失わない（Task 1）。
- 読み込み直し・複数タブで移行したとき重複や他Unitの消失がない（Task 1）。
- 国名の別名・ひらがな、小国、分割された国土でも場所を発見できる（Task 2/4）。
- 冷凍・加工品や飼料用途を生鮮の食用品として説明しない（Task 3）。
- 未収録国、日本、音声非対応、画面が狭い場合にも使い道と戻り先が明確（Task 4）。

## 実行・コミット規約

各Taskはテスト失敗を確認→最小実装→対象テスト成功→レビュー可能なコミットの順。
Nodeは `C:/Users/withc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`。
コマンド表記の `node` はこの実行ファイルを用いる。
ビルドは `node grade56_site/build.cjs`、公開形式のテストは `INTERVIEW_BUILT=1`。
公開用Gitは `release_repo`。ソースとテストは作業ルートに保存し、公開用成果物は
Task対象ファイルだけ `git add --sparse` する。docs以外の既存変更は勝手に含めない。
実行前にgit-worktreesスキルで現在の既存worktreeを確認する。複製は不要なら行わない。

### Task 1: NHE6 Unit移動と保存データの保護

**Files:** 新規 `grade56_site/unit-config.js`, `grade56_site/unit-migration.js`。
変更 `grade56_site/app.js`, `grade56_site/index.html`, `grade56_site/UNIT5-NOTES.md`。
テスト `grade34_site/test-nhe-unit5.cjs`, 新規 `grade34_site/test-nhe-unit-migration.cjs`。

**Interfaces:** `NheUnits.get(book,unit) -> {main:string[],sub:string[]}|null`。
`NheMigration.run(storage) -> {ok:boolean,migrated:boolean,error?:string}`。
通常のセット操作は既存 `SavedCardSets` を維持する。

- [ ] テスト：Unit5のmainは `['clothes','ingredients']`、subは `['fruits_vegetables','stationery']`、初期選択23語。
  Unit6のmainは `['nature','sea_animals','living_things']`、subは `['animals','bugs']`、初期選択26語。
  NHE5 Unit5は42語のまま。両Unitの保存・編集・削除がそれぞれ独立することを確認。
- [ ] 移行テスト：旧 `nh6:5` のセットID・名前・payloadがUnit6へ移り、再実行しても1件。
  旧選択 `[]` はUnit6でも空を維持。Unit5は新規初期値となる。
  Unit6既存セットを保持。同名は移行名で区別。LTセットは完全に不変。
  保存失敗、途中終了を模した再開、2タブ相当の繰り返しで消失しないことを確認。
- [ ] 上記を実行し、現在の固定Unit5構成では失敗することを確認。
- [ ] Unit番号の固定値を設定参照へ置換。移行は全保存領域のバックアップを先に確保し、
  名前付きセットの更新を1回の保存で行い、選択状態を書いた後に完了マーカーを付ける。
  再開時はバックアップと移行ID対応表を用い、同じセットを再追加しない。
  失敗時は完了扱いにせず、元データを残し案内を表示する。
- [ ] `node grade56_site/build.cjs` 後、移行テスト・NHE Unitテスト・セットテストを実行。
- [ ] 対象成果物だけをコミット：`Correct NHE6 Units 5 and 6 with safe saved-set migration`。

### Task 2: 国名検索と地理データ

**Files:** 新規 `grade56_site/world-countries.js`, `grade56_site/world-search.js`,
`grade56_site/assets/world-map.svg`, `grade56_site/assets/WORLD-MAP-SOURCES.md`。
変更 `grade56_site/build.cjs`（地図アセットのコピー）。
テスト 新規 `grade34_site/test-world-search.cjs`。

**Interfaces:** `WorldCountries` は `{id,ja,en,aliases:string[],mapId,anchor:[x,y]}` の配列。
`WorldSearch.find(query) -> Country[]`（空文字は空配列、完全一致を先頭）。
SVGは同一IDの国形状と、太平洋中心座標系のanchorを使う。

- [ ] 検索テスト：`アメリカ`・`米国`・`あめりか`が同じ米国IDを返し、
  前後空白を許容。部分一致候補を返す。存在しない入力は空。
  全Countryに表示名・地図形状または位置anchorがあることを検証する。
- [ ] テストを実行し失敗確認。
- [ ] Natural Earthの利用可能な地理データを取得し、出典・版・変換方法を記録。
  教科書画像は使わない。日付変更線をまたぐ形状を分割し、国・地域を恣意的に併合しない。
  日本語名と別名を登録し、検索正規化は空白・大小文字・ひらがな/カタカナを扱う。
- [ ] `node grade34_site/test-world-search.cjs` を実行。小国のmarkerと太平洋中心の地図を目視確認。
- [ ] 対象成果物をコミット：`Add local country search and world map assets`。

### Task 3: 輸入情報の調査・カード対応

**Files:** 新規 `grade56_site/world-imports.js`,
`grade56_site/WORLD-IMPORT-SOURCES.md`, `grade34_site/test-world-imports.cjs`。

**Interfaces:** `WorldImports.get(countryId) -> {status:'verified'|'unresearched'|'domestic',cards:ImportItem[],other:ImportItem[]}`。
`ImportItem={ja,cardId?:string,note:string,evidence:{url,title,year,releaseStatus,classification,checkedAt,selectionBasis}}`。
cardIdは既存衣類/食材/果物・野菜IDに限る。otherの主要品は根拠の基準も必要。

- [ ] データ検証テスト：全cardIdが実在し対象3カテゴリーに属する、年・出典URL・分類・
  確認日が欠けた掲載品目は失敗。日本はdomestic、未収録国はunresearched。
  「輸入なし」の自動生成をしない。加工形態・用途に差がある資料には注記が必須。
- [ ] テスト失敗を確認。
- [ ] 仕様の20か国（日本を含む）を調査し、日本以外の各国について、
  財務省/農水省等の資料で日本向け輸入を検証する。対象72カードを確認対象とし、
  国×カード全組合せの存在を仮定しない。個別の資料・分類・確認結果を記録する。
- [ ] 衣類20カード（靴・帽子・眼鏡等を含む）は財務省等の適切な分類で調査。
  衣類全体の資料を個別カードの根拠にしていないことを検証する。
- [ ] 広い分類の推測割り当てをしない。「カードで学べる」と「主な」を分け、
  証拠未確認は掲載しない。情報取得ができない国は実装者が未収録と報告する。
- [ ] `node grade34_site/test-world-imports.cjs` と、掲載項目全件の根拠照合を行う。
- [ ] 対象成果物をコミット：`Add verified Japan import facts linked to picture cards`。

### Task 4: 世界地図活動の画面・Unit接続

**Files:** 新規 `grade56_site/world-map.html`, `grade56_site/world-map.js`,
`grade56_site/world-map.css`, `grade34_site/test-world-map-browser.cjs`。
変更 `grade56_site/app.js`（Unit5 Activitiesの入口）。

**Interfaces:** 入り口 `world-map.html?book=nh6&unit=5`、戻り先 `index.html#/unit/nh6/5`。
Task2の検索結果から同じcountryIdをTask3へ渡す。画像は既存picture-linksとCardSet.sourceを再利用。

- [ ] ブラウザテスト：Activitiesから開く→日本語検索→候補を選択→位置強調と英語名、
  カード欄・その他欄・出典/年が表示される。対象カードがUnitで未選択でも表示。
  日本・未収録国・該当なしが別の表示になる。
  戻るとActivitiesが開いていること、全画面の切替、狭い画面の横はみ出しなしを確認。
- [ ] テストを実行し、入口がないため失敗することを確認。
- [ ] 地図画面を実装：検索候補はボタン/キーボード対応、選択国を強調し小国はmarkerも使用。
  パン・拡縮・全体復帰・全画面を設ける。音声はクリック時のみ、非対応時は案内。
  地図/データ読込失敗は再試行案内を出し、戻る操作を残す。
- [ ] ブラウザテストと、マウス/タブレット相当サイズでスクリーンショット確認。
- [ ] 対象成果物をコミット：`Add searchable world map activity for NHE6 Unit 5`。

### Task 5: 統合確認と公開準備

**Files:** 新規 `check-published-world-map.cjs`、必要に応じ上記テストを補強。

- [ ] `INTERVIEW_BUILT=1 node run-classroom-tests.cjs` を実行。全件成功を確認する。
- [ ] 保存データ移行、地図と事実データ、児童向け表示について最終レビューを受け、問題を修正。
- [ ] 公開対象diffを確認。無関係なgrade34変更を含めない。
- [ ] ユーザーの公開指示がある場合にのみmainへ通常push（force禁止）。
  Pagesの対象コミットがbuiltになった後、隔離ブラウザーでUnit5/6・地図・検索・戻るを確認。
- [ ] 完了範囲、収録国、未収録項目、出典年、公開状態を日本語で報告する。
