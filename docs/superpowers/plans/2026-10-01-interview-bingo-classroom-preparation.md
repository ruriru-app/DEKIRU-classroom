# INTERVIEW BINGO Classroom Preparation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ローカル版で、保存済みBINGOをClassroomのActivitiesから教師用準備画面へつなぎ、匿名の配布用カードを同じ原稿でプレビュー・印刷・HTML保存できるようにする。

**Architecture:** Gamesに専用の準備ページを追加し、既存BINGOの設定・名簿表示・児童試用・均等カード生成・印刷部品を組み合わせる。Classroomは通常タイルと安全な往復リンクのみを追加する。準備状態はページ内で保持し、プリセット・名簿の保存形式や既存INTERVIEWの配信には触れない。

**Tech Stack:** 既存の素のJavaScript、HTML、CSS、Node.jsテスト、既存Playwrightテスト用ヘルパー、CUAによる実ブラウザ確認。新しい依存パッケージは追加しない。

**Spec:** [承認済み設計書](../specs/2026-10-01-interview-bingo-classroom-preparation-design.md)

## Global Constraints

- 今回はローカル版のみ。配信URL・QR、実名の児童画面、児童回答保存、共有DB、公式BINGO登録、新しい恒久保存、GitHub公開は実装しない。
- 実装方法は選択済みのNative方式。主担当が実装し、最後に別担当が全体を確認する。実装前にこの計画の利用者確認を待つ。
- `sources/` は読み取り専用。既存の未コミット変更とユーザーのブラウザ内データを保持する。検証は原則として独立したテスト用ブラウザで行う。
- クラス登録・編集はGrade 3＆4のみ。教師画面は名簿を参照するが、児童試用は仮名、紙カードは匿名。教師用メモも紙に出さない。
- BINGOは3×3・4×4・5×5、初期3×3。同じ語は最大2回、名前は1回、本人を除外。候補数×2がマス数未満なら児童試用を止め、印刷は可能にする。
- 参加人数と印刷枚数は各1～100、初期35、独立。セット名はタイトルを初期値に80文字以内。語数はおすすめ値を保持し、1～9かつ候補数以下でなければエラーにする。
- 通常9枚は70×99mm・3列×3段、ラミネート用12枚は50×89mm・4列×3段。セット名・No.番号を残し、MY CARD見出し・記名欄は追加しない。
- 先頭から使う枚数ごとの語の登場回数差は最大1。タブ・印刷・9枚／12枚の切替で再抽選しない。
- 同一オリジンのブラウザ内保存のみ。別端末・別ブラウザ・localhostと公開サイト間の自動同期はない。
- 実印刷の確定操作は行わない。印刷ダイアログ、呼び出しの自動テスト、PDFレイアウト、実機印刷を区別して報告する。

## Review Focus

1. NHE側にない有効カードでタイルが消える、または一覧用の検証緩和が通常保存にも広がること。Task 2のカード集合差・既定検証テストで固定する。
2. 別タブのプリセット更新・削除後、古い原稿が印刷／保存されること。Task 3の変更検出と出力直前ガードのテストで固定する。
3. 遅れて完了した画像読み込みが、無効化済み原稿の出力を再び有効にすること。Task 1の読み込み競合テストで固定する。
4. 氏名・教師メモ・入力されたHTMLが、児童画面・保存原稿・URLへ混入すること。Task 3のプライバシー／エスケープテストで固定する。
5. ソースでは動くが配信用ビルドでGamesへの参照やNHE未設定Unitの入口が壊れること。Task 4の全入口と参照ハッシュ、Task 5のビルド版テストで固定する。

## 作業場所とファイルの役割

コマンドの作業ディレクトリは `interview_work`。編集元は `games_site/`、`grade34_site/`、`grade56_site/`。Git管理下のローカル配信用成果物は `release_repo/`。既存の57575番サーバーとユーザーの試用タブを維持する。

- `games_site/interview-bingo-print.js`：既存原稿の出力とHTML保存。印刷レイアウトCSSは原則変更しない。
- 新規 `games_site/interview-bingo-cards.js`：Gamesと同じ利用可能カード集合。
- 新規 `games_site/interview-bingo-routes.js`：教材・Unitの検証と往復URL。
- 新規 `games_site/interview-bingo-prepare.html/js/css`：専用教師ページ、状態管理、レイアウト。
- 新規 `games_site/interview-bingo-links.js`：Classroomの個人保存タイル・削除。
- 既存 `interview-bingo-store.js`、`interview-bingo-teacher.js`：明示的な小さなインターフェース追加のみ。
- 各Task記載のテスト：単体境界と独立ブラウザでの接続を確認する。

## 実装開始時の事前確認

- [ ] 承認後、コードを変える前に `node run-classroom-tests.cjs` の結果を記録する。過去のNHE unit5／公式Roulette関連の失敗をそのまま引き継がず、現状で確認する。
- [ ] ソースとrelease_repoの差分を確認し、今回の開始時点を記録する。以後のビルドは `node games_site/build.cjs`、`node grade34_site/build-preview.cjs`、`node grade56_site/build.cjs` を使い、編集元と生成先の双方で既存変更を保護する。

### Task 1 印刷の再現確認と同一原稿の保存

**Files:** Modify `games_site/interview-bingo-print.js`; extend `games_site/test-interview-bingo-print.cjs`; create `games_site/test-interview-bingo-print-download.cjs`.

**Interfaces:**

- Consumes: `InterviewBingoMyCard.generate(config)` の `{config,cards,counts}` とカード一覧。既存の原稿・readiness・generationトークンを維持する。
- Produces: `InterviewBingoPrint.create({baseUrl=document.baseURI,onRegenerate=()=>{},canOutput=()=>true}={})`。既存戻り値に `download():boolean` を追加。`canOutput():boolean` は同期・出力直前に実行し、falseなら印刷と保存を行わない。`print():Promise<boolean>` は呼出成否のみで印刷完了を意味しない。

- [ ] **Step 1 印刷の対照確認を記録する。** 同じ有効原稿でIABと通常Chromeの印刷ボタンをCUAから押し、プレビューの有無とコンソールエラーを記録する。印刷を確定せずキャンセルする。通常Chromeを操作できない場合は未確認とし、原因をブラウザ制限と断定しない。
- [ ] **Step 2 失敗テストを書く。** 新テスト `download_uses_current_ready_document` は保存イベントのHTMLが `getDocument()` と一致し、絶対URLのCSS・画像と番号・セット名のみを含むことを検査する。既存テストに `output_guard_and_late_load` を追加する。主要アサーションは以下。

```js
assert.equal(savedHtml, currentHtml);
assert.equal(downloadWhileLoading, false);
assert.equal(downloadAfterInvalidate, false);
assert.equal(downloadAfterDestroy, false);
assert.equal(printCallsWithGuardFalse, 0);
assert.equal(downloadsWithGuardFalse, 0);
assert.equal(readyAfterInvalidatedImageCompletes, 'false');
```

- [ ] **Step 3 REDを確認する。** `node games_site/test-interview-bingo-print-download.cjs` は保存ボタン／download APIがないため失敗することを確認する。既存画像404・CSS404・再読み込みテストも実行して基準を残す。
- [ ] **Step 4 出力経路を実装する。** `[data-save-print]`「印刷用原稿を保存」を追加。valid・ready・未破棄・canOutputを印刷と保存で共通確認し、現在のHTMLをUTF-8 Blobとして固定の安全なファイル名 `interview-bingo-cards.html` で保存する。Object URLを後で解放する。ネット接続／localhostサーバーが必要と明記する。原稿再生成・再抽選はしない。再現できた印刷不具合は、その原因に限定した回帰テストを先に追加して修正する。
- [ ] **Step 5 GREENを確認する。** 新テスト、`test-interview-bingo-print.cjs`、`test-interview-bingo-print-layout.cjs` を各 `node games_site/<file>` で実行し、全て終了コード0を確認する。保存したHTMLを独立したブラウザページで開き、全画像のnaturalWidthが正であることも検査する。
- [ ] **Step 6 ローカル差分を確定する。** Gamesをビルドし、このTaskの差分だけをレビューしてローカルコミット `fix: add a guarded Bingo print document download`。既存の同一ファイル内の未確定変更を分離できなければ勝手に含めず、コミットを保留して結果に記録する。

### Task 2 保存データとカード集合の境界

**Files:** Modify `games_site/interview-bingo-store.js`; create `games_site/interview-bingo-cards.js`, `games_site/interview-bingo-routes.js`, `games_site/test-interview-bingo-preparation-model.cjs`; extend `games_site/test-interview-bingo-model.cjs`.

**Interfaces:**

- `InterviewBingoStore.create(storage,{validCardIds}={})`：一覧検証だけに明示したSet/nullを渡す。undefinedは従来の既定検証、nullは構造検証。`savePreset` のカード検証は従来どおりで緩和しない。
- `InterviewBingoCards.available(data=window.GAMES_DATA):Card[]`：completedPictureCardIdsに含まれimageを持つstandard/plus、続いてlets-tryの順。元データを変更しない。
- `InterviewBingoRoutes.parse(search):{presetId,bookId,unit}`：preset/book/unitが各1個、既存ID規則、lt1/lt2は1～9、nh5/nh6は1～8を検証。不正・未知パラメータは例外。任意returnToは受けない。
- `InterviewBingoRoutes.prepareHref(presetId,bookId,unit):string` と `unitHref(bookId,unit):string`：自身のscript URLを基準に同一オリジンのGames準備ページ／該当学年index.htmlのUnitハッシュを組み立てる。

- [ ] **Step 1 境界の失敗テストを書く。** `structural_listing_preserves_strict_writes` でNHEにないGamesカードを明示nullで一覧表示できること、既定の一覧と保存は未知IDを拒否することを検査する。壊れたJSON・重複ID・容量エラーで保存内容が変わらない既存テストを維持する。
- [ ] **Step 2 カードとURLの失敗テストを書く。** `cards_match_games_order` でstandard/plus→lets-try、未完成・画像なし除外を検査する。`routes_reject_unsafe_inputs` で重複query・範囲外Unit・外部returnTo・不正IDを拒否し、4教材の往復URLを検査する。

```js
assert.deepEqual(availableIds, ['standard-card', 'plus-card', 'lt-card']);
assert.equal(rawAfterReadFailure, rawBeforeReadFailure);
assert.throws(() => routes.parse('?preset=x&book=nh6&unit=9'));
assert.throws(() => routes.parse('?preset=x&book=nh6&unit=5&returnTo=https://example.org'));
assert.match(routes.unitHref('nh6', 5), /grade56(?:_site)?\/index\.html#\/unit\/nh6\/5$/);
```

- [ ] **Step 3 REDを確認する。** `node games_site/test-interview-bingo-preparation-model.cjs` が未実装APIで失敗することを確認する。
- [ ] **Step 4 上記3インターフェースを実装する。** 一覧用Storeは構造検証後にのみ削除でき、読み込み失敗を空一覧として書き戻さない。準備ページでは次Taskで対象プリセットを利用可能GamesカードのSetで再検証する。既存rouletteAvailableCardsと旧INTERVIEWは変更しない。
- [ ] **Step 5 GREENを確認する。** 新テストと `node games_site/test-interview-bingo-model.cjs` を実行、終了コード0。ブラウザでカードID順を既存rouletteAvailableCardsと比較する検査をTask 3のfixtureに加える。
- [ ] **Step 6 ローカル差分を確定する。** Gamesビルド後、今回分のみローカルコミット `feat: define Bingo preparation data and route boundaries`。Task 1と同じ既存変更保護を適用する。

### Task 3 専用教師ページと状態管理

**Files:** Create `games_site/interview-bingo-prepare.html/js/css`, `games_site/test-interview-bingo-preparation-fixture.cjs`, `games_site/test-interview-bingo-preparation-browser.cjs`, `games_site/test-interview-bingo-preparation-state.cjs`; modify `games_site/interview-bingo-teacher.js`.

**Interfaces:**

- New `InterviewBingoPrepare.mount({root,search=location.search}):{destroy()}`。root内に見出し・戻る・教師／仮名児童／配布用カードの表示を構成する。HTMLはDOMContentLoaded時に一度mountする。
- `InterviewBingoTeacher.create` に任意の `tryLabel='この設定で試す'` を追加。準備ページだけ「児童画面を仮名で試す」にする。Creatorの既定挙動を変えない。
- Uses `RosterPreview.create({onCountChange})`、`refresh()`、`getSelectedCount()`。名簿を外へ取り出すAPIは追加しない。
- Uses `Student.create({onPageChange})`、`update({activity,cards,config,reset,page})`、`getProgress()`。activityはtitle/studentInstructions/expressionsだけ。pageはcompose/interview。
- Uses Task 1のPrint、Setupのinitial/validate/boardKey/printKey、MyCard.generate。draft、applied、batch、選択タブ、元プリセットfingerprintは閉じたページ内状態。
- Fixture exports `seed(t,{assignedUnits,cardCount=13,recommendedMyCardWordCount=4}):Promise<{preset,cards,rawBingo,rawInterview,rawRosters}>`。独立contextのGamesで有効な実カードを取得・保存する。ユーザーの名簿やプリセットは使用しない。

- [ ] **Step 1 教師画面の失敗テストを書く。** `preparation_loads_without_creator_shell` は有効queryからタイトル・説明・メモ・表現・候補・名簿・各設定を確認し、Games Creator／ライブラリーが存在しないことを検査する。fixtureでカード順の互換性も確認する。未知カード・消失プリセット・割当外Unitは停止し、保存内容を変えない。
- [ ] **Step 2 設定と名簿の失敗テストを書く。** 標準・番号のみ・旧形式・同名・未入力表記の名簿、クラス削除／他タブ編集を既存ClassRoster規則と照合する。選択だけでは35人を変えず、明示人数コピーのみ反映し、印刷枚数は35のままとする。おすすめ10語は10のままエラー、候補0・語数超過・NaNもエラー。名簿破損時でも有効な匿名カードを生成できる。
- [ ] **Step 3 状態とプライバシーの失敗テストを書く。** `trial_and_print_have_distinct_lifetimes` と `stale_preset_blocks_output` を追加する。主要アサーションは以下。

```js
assert.equal(defaultSize, 3);
assert.equal(printCountAfterCopyRoster, 35);
assert.equal(trialStartsWithEightCandidatesFor4x4, true);
assert.equal(trialStartsWithSevenCandidatesFor4x4, false);
assert.equal(printWithSevenCandidatesFor4x4, true);
assert.equal(batchAfterParticipantOrRosterChange, originalBatch);
assert.equal(batchAfterTabOrLayoutChange, originalBatch);
assert.equal(outputEnabledAfterCandidateCountNameOrWordChange, false);
assert.equal(outputEnabledAfterSourcePresetUpdateOrDelete, false);
assert.equal(outputEnabledAfterOnlyUnrelatedPresetChange, true);
assert.equal(rawPresetAfterPreparation, rawPresetBeforePreparation);
assert.doesNotMatch(studentText + printHtml + pageUrl, /実名テスト児童|教師専用メモ/);
assert.equal(injectedScriptExecuted, false);
```

- [ ] **Step 4 REDを確認する。** 新browser/stateテストをそれぞれ `node games_site/<file>` で実行し、準備ページが存在しないため失敗することを確認する。
- [ ] **Step 5 ページと表示を実装する。** catalog→Let’s Try追加カード→SentenceForms→InterviewModel/ClassRoster/InterviewStore→Bingoモデル・Store・cards・routes・Setup/MyCard/Roster/Teacher/Session/Expressions/Student/Print→prepareの順で読み込む。shell/state/share/Creatorは読み込まない。student.cssとteacher.cssを利用し、Creator限定のフォームスタイルをprepare.cssで補う。左に活動と候補、右に名簿と教師設定、狭幅では縦に配置。文字はtextContentまたは既存の同等エスケープを使う。
- [ ] **Step 6 状態遷移を実装する。** Setup検証に加え試用のみ候補不足をブロックする。人数不足は警告のみ。boardKeyが変わり配置済みなら確認後にreset、同一条件のタブ往復はresetしない。printKey変更のみ旧batchを無効化。生成は未生成時か明示「作り直す」だけ。表現の複数スロットは既存試用の未対応案内を維持し、対応済みと見せない。
- [ ] **Step 7 再読み込みと離脱を実装する。** focus/storageおよび試用・生成・出力直前に対象の正規化プリセット全体を初期fingerprintと比較する。対象変更・削除・読み取り不能なら試用と原稿を無効にして開き直しを案内する。無関係レコードだけの更新では保持する。名簿変更はrefreshだけで匿名batchを無効にしない。設定変更後のアプリ内戻るには確認、再読込で初期化されることは常時案内。destroyでイベントと各部品を破棄する。
- [ ] **Step 8 GREENを確認する。** 新browser/stateテスト、既存teacher-controls/teacher-sync/teacher-flow/student-config/expressionsを `node games_site/test-interview-bingo-<name>.cjs` で実行して終了コード0。1366×768・1024×768・狭幅390×844で操作切れがないことを検査する。
- [ ] **Step 9 ローカル差分を確定する。** Gamesビルド後、今回分のみ `feat: add the standalone Bingo teacher preparation page` としてローカルコミットする。

### Task 4 Classroomの通常タイルと安全な往復

**Files:** Create `games_site/interview-bingo-links.js`, `games_site/test-interview-bingo-classroom-links.cjs`; modify `grade34_site/index.html`, `grade34_site/app.js`, `grade34_site/build-preview.cjs`, `grade56_site/index.html`, `grade56_site/app.js`, `games_site/interview-bingo-creator.js`.

**Interfaces:**

- `InterviewBingoLinks.tiles(bookId,unit):string`：構造検証Storeを使い、割当一致の通常タイルまたは読み込みエラーを返す。要素に `[data-personal-bingo]`、削除に `[data-delete-bingo]` を付ける。HTMLはエスケープし、URLはTask 2だけで作る。
- 削除は委譲イベントを1回登録し、同一BINGOがGamesと全割当Unitから消える確認を表示する。確定後のみStore.deletePreset、対象タイルを除去。旧Interviewの属性・イベントには触れない。

- [ ] **Step 1 全入口の失敗テストを書く。** lt1:4・lt2:5・nh5:5・nh5:2・nh6:5に使い捨てBINGOを割り当て、Grade34のrenderUnitSectionsとunit-activities、NHE設定済み／未設定Unitで同じ準備画面へ開けることを検査する。割当なしUnitには表示されない。戻り先は元Unit。
- [ ] **Step 2 削除と保存保護の失敗テストを書く。** キャンセル時は全保存データ不変、確定時は対象BINGOだけ削除、他のBINGO・旧Interview・名簿は保持する。壊れたBINGO JSONはエラー表示のみ。GamesカードがNHE一覧にない場合でも通常タイルを表示する。
- [ ] **Step 3 REDを確認する。** `node games_site/test-interview-bingo-classroom-links.cjs` がタイル未実装で失敗することを確認する。
- [ ] **Step 4 読み込みと入口を追加する。** Grade34/56 indexに必要なBingoモデル・Store・routes・linksを読み込み、上記4入口のActivitiesへ追加する。Grade56へGamesの全カードカタログは追加しない。Creatorの「Classroomへの表示は次の段階」の古い案内を、同じブラウザの割当Unitから準備できる案内へ更新する。児童への配信未実装の案内は残す。
- [ ] **Step 5 ビルド参照を整える。** Grade34 build-previewに `../games_site/`→`../games/` 変換を追加。HTMLのJS/CSSハッシュ対象は検証済みrelease_repo配下のGrade34・Grade56・Gamesに限定し、親外のパスを許さない。Games→Grade34→Grade56→Gamesの順でビルドし、Games HTMLが最新共通ファイルのハッシュを持つようにする。
- [ ] **Step 6 GREENを確認する。** 新linksテストと既存 `node grade34_site/test-interview-integration-browser.cjs` を実行する。ビルドの準備ページと両学年indexから参照する新JS/CSSが存在し、ソース用ディレクトリ名が残っていないこと、付与ハッシュが実ファイルと一致することを新linksテストで検査する。
- [ ] **Step 7 ローカル差分を確定する。** このTaskの入口・参照変更だけを `feat: link personal Bingo presets from Classroom activities` としてローカルコミットする。旧作業のphonics等は含めない。

### Task 5 ソースとビルドの回帰確認および最終レビュー

**Files:** Modify `run-classroom-tests.cjs`, `games_site/test-interview-bingo-print-pdf.cjs`; create `release_repo/docs/superpowers/plans/2026-10-01-interview-bingo-classroom-preparation-results.md` after verification.

**Interfaces:** 既存 `grade34_site/interview-test-helper.cjs` の独立contextと `INTERVIEW_BUILT=1` を利用する。新しいテスト5本（download、preparation-model、preparation-browser、preparation-state、classroom-links）を既存runnerへ追加する。fixtureは実行対象に含めない。

- [ ] **Step 1 新しいテストを登録する。** runnerに上記5本を追加し、実行一覧に各1回ずつ現れることを確認する。実装前の基準結果を比較対象として保持する。
- [ ] **Step 2 新規・既存テストを実行する。** 新5本をソース版と `$env:INTERVIEW_BUILT='1'` のビルド版で実行、終了コード0を確認して環境変数を元に戻す。`node run-classroom-tests.cjs` で全体を再実行し、新規失敗ゼロを確認。既存失敗は差分を特定し別記する。
- [ ] **Step 3 紙面を確認する。** 既存 `node games_site/test-interview-bingo-print-pdf.cjs` と `games_site/check-interview-bingo-pdf.py` を実行する。9枚／12枚、1／4／9語、端数ページ、長い英語と80文字セット名を追加検査し、PDFレンダリングを目視する。番号・裁断線・絵・文字のはみ出し、空ページがないことを確認する。
- [ ] **Step 4 実ブラウザで接続を確認する。** 専用の使い捨てデータを使うページで、各学年の入口、3／4／5サイズ、13語4×4、手動／RANDOM、配置維持、P置換、名前1回・取り外し、縦横斜めBINGOを操作する。既存INTERVIEW Creatorの作成・保存・再読込も確認する。ユーザーの開いているタブは置き換えない。
- [ ] **Step 5 印刷操作を最終確認する。** Task 1の対照確認と、HTML保存→通常ブラウザで開く→印刷プレビューを再確認する。見られなかった環境は未確認と明記し、物理印刷は実行しない。
- [ ] **Step 6 独立した最終レビューを依頼する。** 完了差分、設計・本計画、実測テスト結果を1名の別担当に渡す。保存データ境界、匿名性、stale出力、全入口、旧INTERVIEW非破壊を確認してもらい、指摘修正後は該当テストを再実行する。
- [ ] **Step 7 結果を保存し利用者へ提示する。** 上記結果と既知の未確認事項をresults.mdに記録する。ローカル準備ページのリンクと、追加した入口・印刷原稿保存・今回は未配信／未公開であることを簡潔に伝える。変更済みファイルを一括で無差別にstageせず、確認した差分だけローカル確定する。

## 実装前の計画自己確認

- 設計書の12検証条件はTask 1～5で網羅する。特に印刷可能と児童試用可能を分け、少語数で印刷まで禁止しない。
- 新API名・パラメータは上記Interfacesを正とする。既定Store／Teacher／Print呼び出しは従来互換を維持する。
- 既存Printの原稿生成・Studentのゲーム進行・MyCardの均等生成を複製しない。新しい保存形式は作らない。
- Review Focusの5点はそれぞれ所有Taskにテストを置く。
- この計画を利用者が確認するまで実装は開始しない。実装開始時は既存チェックアウトと進行中の未確定作業を再確認し、必要な場合のみ隔離方法を調整する。
