# Self Introduction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Recommended execution is native in this session, with one independent review at the end.

**Goal:** Gamesで教師が正式カードを使った自己紹介シートを設計・保存・配布し、児童が別ページで名前と好きなものを作って見せられるようにする。

**Architecture:** 教師Creator、Activityモデルと保存、配布データ、児童状態、児童画面を別モジュールにする。既存Gamesのヘッダー・設定とプレビューの配置・完成済みカード一覧と圧縮部品を利用する。児童ページは教師Creatorのコードを読み込まず、URLに含まれる設定とブラウザ内の児童状態だけを扱う。

**Tech Stack:** 既存のHTML/CSS、素のJavaScript、localStorage、ShareCodecとCompressionStream、NodeのassertとPlaywright。新しい依存パッケージは導入しない。

**Spec:** `docs/superpowers/specs/2026-10-08-self-introduction-design.md`

## Global Constraints

- 読み上げは実装しない。
- 教師設定のDOMも処理も児童ページに含めない。
- 既存のDEKIRUカード・デザイン・アイコンを利用する。
- 候補カードは1〜100枚、児童の最大選択枚数は1〜5枚、初期値5枚。
- 名前・選択・設定をサーバーや共有DBに保存しない。
- 元の `F:/DEKIRU Classroom/DEKIRU_Self_Introduction_v1.html` と `sources/` は変更しない。
- ClassroomのUnit組み込み、名簿連携、印刷、任意画像追加、英文生成は今回追加しない。
- release_repoの既存の無関係な変更を維持し、新規変更だけを書き出す。公開はこの計画に含めない。
- 以下のソースパスは `interview_work/` 基準。設計書・計画書は `release_repo/` 基準。

## Review Focus

- 保存済みActivityの破損や容量不足で既存セットが上書きされないこと。Task 1で破損・書込失敗を検証する。
- 配布時と後の編集で内容が変わらず、異なる配布IDの児童状態が混ざらないこと。Tasks 1・2でスナップショットと保存分離を検証する。
- 細工されたURLや設定JSONでHTMLを実行しないこと。Tasks 1〜3で不正入力とテキスト表示を検証する。
- 長い名前、5枚のカード、低い横画面でも完成画面が収まること。Task 2で最大入力と1024×600を検証する。
- 共通データが読み込まれる順序や正式画像のパスが公開構成でも正しいこと。Task 4で書き出し後の画像と既存Activityを検証する。

## Task 1 モデルと保存と配布

**Files:** Create `games_site/self-introduction-model.js`, `self-introduction-store.js`, `self-introduction-share.js`, `test-self-introduction-model.cjs`, `test-self-introduction-store.cjs`, `test-self-introduction-share.cjs`.

**Interfaces:** `SelfIntroductionModel.validatePreset(value, validCardIds) -> Preset`; `snapshot(preset) -> Delivery`; `validateDelivery(value, validCardIds) -> Delivery`. Presetは `{version:1,type:'self-introduction',id,name,title,studentInstructions,cardIds,maxCards,createdAt,updatedAt}`。Deliveryは `{version:1,type:'self-introduction-delivery',deliveryId,issuedAt,activity:{title,studentInstructions,cardIds,maxCards}}`。タイトル・保存名80文字、説明500文字、既存ID方式とISO日時を検証し、余分なフィールドを出力しない。

`SelfIntroductionStore.create(storage, {validCardIds})` は `listPresets()`, `savePreset(value)`, `deletePreset(id)` を返す。保存キーは `dekiru-self-introduction-presets-v1`、上限500セット。

`SelfIntroductionShare.buildShortUrl(delivery, baseUrl) -> Promise<string>` と `decodeShared(token, validCardIds) -> Promise<Delivery>`。ハッシュは `#intro=s1z.<base64url>`、圧縮不可なら `s1j.`。配布URLは2024文字以下のみ生成する。圧縮前・展開後データは160000バイト以下、トークン220000文字以下。共通ShareCodecを利用し、現行Bingo配布と同じdeflate方式で配列に圧縮する。別Activityを解読するコードには依存しない。

- [ ] **Step 1:** テストに `rejects_unknown_or_duplicate_cards`, `accepts_max_cards_1_to_5`, `preserves_corrupt_storage`, `reports_storage_failure`, `snapshot_is_immutable`, `strips_unrecognized_fields`, `short_url_roundtrip`, `rejects_oversize_and_bad_token` を追加する。1・100枚の候補、最大枚数0・6、保存容量不足、圧縮の有無、2024文字超過をassertする。
- [ ] **Step 2:** Nodeでこの3テストを実行し、未実装で失敗することを確認する。
- [ ] **Step 3:** 上記インターフェースを実装する。ブラウザとCommonJSの両方で利用できる純粋モデルにする。スナップショットは新しい配布IDを生成する。
- [ ] **Step 4:** `node --test games_site/test-self-introduction-model.cjs games_site/test-self-introduction-store.cjs games_site/test-self-introduction-share.cjs` が失敗0となることを確認する。
- [ ] **Step 5:** この変更だけを確認し、機能の履歴として保存する。

## Task 2 児童状態と専用画面

**Files:** Create `games_site/self-introduction-session.js`, `self-introduction-student.js`, `self-introduction-student.css`, `self-introduction-receive.html`, `self-introduction-receive.js`, `test-self-introduction-session.cjs`, `test-self-introduction-student-browser.cjs`.

**Interfaces:** `SelfIntroductionSession.create(delivery) -> State`; `validate(delivery,state)`, `addLetter(delivery,state,char)`, `removeLetter(delivery,state,index)`, `colorLetter(delivery,state,index,color)`, `chooseCard(delivery,state,cardId)`, `removeCard(delivery,state,index)`, `setPage(delivery,state,page)` は検証した新しいStateを返す。Stateは `{version:1,deliveryId,letters:[{char,color}],selectedCardIds:[],page:'compose'|'presentation'}`。入力はA〜Zと空白のみ、最大120文字。元HTMLの8色を使用し、名前の空欄は許可、完成は1枚以上の選択が条件。

`SelfIntroductionStudent.mount(root,{delivery,cards,state,onChange}) -> {update(state),destroy()}` はDOMを安全に生成する。正式カードの解決には `InterviewBingoCards.available(window.GAMES_DATA)` を使用する。元HTMLの名前入力、文字ごとの色、選択・取り外し、最適なカード配置の振る舞いを移植し、見た目は既存の児童シートに揃える。

受信ページは専用HTMLで配布データだけを解読し、`dekiru-self-introduction-progress-v1:<deliveryId>` に保存する。配布IDと選択候補を検証して復元し、保存失敗・不正データは日本語で表示する。教師ページへの戻りは置かず、完成画面から作成画面へ戻れる。教師向けプレビューは `?authorPreview=1` のiframeだけで有効とし、`{type:'self-introduction-preview',delivery,page:'compose'|'presentation'}` のメッセージを同一オリジンの親からだけ受信する。deliveryは通常配布と同じ検証を行い、プレビューでは保存しない。

- [ ] **Step 1:** 状態テストに文字・色・選択上限・重複・取り外し・完成条件・別配布ID拒否を追加する。ブラウザテストに `no_teacher_controls_or_audio`, `name_color_and_delete`, `cards_1_to_5`, `reload_restores`, `separate_delivery_storage`, `long_name_fits`, `no_page_scroll_1024x600` を追加する。
- [ ] **Step 2:** テストを実行して未実装の失敗を確認する。
- [ ] **Step 3:** 状態と表示を実装する。児童ページにCreator・教師設定・speechSynthesisのコードを読み込まない。表示する名前や説明はtextContent等で扱う。
- [ ] **Step 4:** `node --test games_site/test-self-introduction-session.cjs games_site/test-self-introduction-student-browser.cjs` の失敗0を確認し、1366×768、1024×600、768×1024の画像を目視する。
- [ ] **Step 5:** この変更だけを確認し、機能の履歴として保存する。

## Task 3 Games CreatorとActivity一覧

**Files:** Create `games_site/self-introduction-creator.js`, `self-introduction-creator.css`, `test-self-introduction-creator-browser.cjs`. Modify `games_site/index.html`, `games_site/boot.js`, `games_site/shell.js` のCreator登録とルーティング。

**Interfaces:** `SelfIntroductionCreator.open(id?)`, `renderLibrary()`。直接ルートは `#/createSelfIntroduction`。既存Creatorと同じ左設定・右プレビューを用い、カード一覧は完成済みカードをカテゴリーとdisplayGroupでまとめる。プレビューのiframeにはTask 2の同一オリジン契約を利用する。

保存タイルには編集・複製・削除・設定ファイルDL・児童用URLコピーを用意する。複製は新IDと現在日時にし、JSON読込はモデルを検証して新しいセットとして追加する。読込ファイルは160000バイトまで。削除は確認付き。共有URLのベースは現在の受信ページの絶対URLから作り、クリップボード失敗時は選択可能なURL欄で代替する。

- [ ] **Step 1:** ブラウザテストに新規Creator直リンク、全項目プレビュー、正式画像選択、候補のまとめ選択、最大枚数、保存・再読込・編集・複製・削除、JSON往復、不正JSONで既存セット維持を追加する。コピーしたURLを独立ブラウザ環境で開き、元セット編集後も配布済み内容が変わらないことをassertする。
- [ ] **Step 2:** テストを実行して未実装で失敗することを確認する。
- [ ] **Step 3:** Creatorとタイルを実装し、既存ヘッダー・アイコン・既存Creator CSSの配置と寸法を利用する。新規Activityには専用のCSSスコープを使用する。
- [ ] **Step 4:** `node --test games_site/test-self-introduction-creator-browser.cjs` の失敗0を確認する。
- [ ] **Step 5:** この変更だけを確認し、機能の履歴として保存する。

## Task 4 公開構成への書き出しと最終確認

**Files:** Create `qa/self-introduction/build.cjs`, `qa/self-introduction/verify.cjs`. Export新規ファイルを `release_repo/games/` に、Games入口の変更を `release_repo/games/index.html`, `boot.js`, `shell.js` に反映する。

**Interfaces:** `build.cjs` はTask 1〜3の自己紹介ファイルのみを書き出す。Games入口はHEADを基準に自己紹介の追加だけを適用する。ソースの `../grade34_site/` は公開構成の `../grade34/` に直し、依存ファイルのハッシュ付きバージョンを設定する。`verify.cjs` は既存テスト補助の `INTERVIEW_BUILT=1` を使い、書き出し後の実際のファイルをブラウザで確認する。

- [ ] **Step 1:** 書き出し後のCreator→新しい児童環境→完成→再読込のテストを作り、未書き出しで失敗することを確認する。通信を監視し、名前と選択内容の送信がないことと正式画像の読込をassertする。
- [ ] **Step 2:** 限定書き出しを実装して実行する。既存の無関係な変更は取り込まない。
- [ ] **Step 3:** 新規自己紹介テスト一式と `grade34_site/test-interview-student-browser.cjs`, `test-interview-sentences-browser.cjs`, `test-named-distribution-browser.cjs`, `games_site/test-interview-bingo-browser.cjs` を実行して失敗0を確認する。
- [ ] **Step 4:** 書き出し後の3画面サイズの見た目、教師操作が児童ページにないこと、長い名前と5枚、URL長さ2024文字以下を確認する。
- [ ] **Step 5:** 全体の差分を独立レビューし、指摘があれば該当テストを追加して修正・再確認する。元HTMLと無関係な変更が保持されていることを確認し、ブラウザで確認できる状態をユーザーへ渡す。公開は行わない。
