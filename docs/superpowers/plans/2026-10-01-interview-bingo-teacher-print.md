# INTERVIEW BINGO Teacher Setup and MY CARD Printing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Games内で教師がBINGOを設定し、同じ語を最大2マスに使う児童プレビューと、A4を9等分した匿名MY CARD印刷を試せるようにする。

**Architecture:** 保存用プリセットは変更せず、教師の編集中設定・反映済み設定・印刷原稿をメモリ内で分離する。既存の児童状態と表示を拡張し、設定検証・語彙配分・教師用操作・印刷表示をBINGO専用部品に分ける。各部品を同じCreatorと保存済みタイルの教師用試行へ接続する、一つの設定フローとして実装する。

**Tech Stack:** 既存のJavaScript、HTML、CSS、Node.js、Playwright、Chromeの印刷機能。新規バックエンド・実行時依存関係なし。

**Spec:** `docs/superpowers/specs/2026-10-01-interview-bingo-teacher-print-design.md`（ユーザー承認済み）。

## Global Constraints

- ソース・テストの基準ディレクトリは `interview_work`。この文書のdocsパスは `interview_work/release_repo` 基準。
- 対象はGamesのCreatorと「教師用画面で試す」。Classroom本体への正式組み込み、配信URL、共有DB、GitHubへの公開、実名簿の児童画面への接続は含めない。
- `sources/` は読み取り専用。既存INTERVIEWには手を加えない。無関係なGrade34変更と保存データを保持する。
- BINGOサイズは3×3、4×4、5×5、初期値3×3。参加人数は1～100人、初期値35人。MY CARDは1人1～9語、候補語数以下。おすすめが範囲外でも切り詰めない。
- 同じカードIDは最大2マス、相手の児童IDは盤面全体で1回だけ。仮の1番を自分として選択不可にする。
- 教師設定・児童の配置・印刷原稿はタブ移動で保持し、再読み込み・別プリセットを開くと初期化する。保存用スキーマ・保存キーは変更しない。
- A4縦210×297mm、3×3、各70×99mm、用紙外側の余白と枠間隔0mm。内容は各枠の内側に約5mmの安全幅を取る。
- 印刷は匿名のMY CARD見出し・絵・英語・空欄の名前記入欄のみ。実名・仮名・教師用メモ・アプリ操作部を入れない。
- ユーザーの開いているブラウザを強制再読込しない。ブラウザ確認は隔離したテスト用プロファイルで行う。

## Review Focus

- 空入力・小数・範囲外のおすすめ値で、古い有効設定を黙って使わない（Task 1、5）。
- 設定変更キャンセルや、Creatorからの候補削除で、無関係なマス・名前・除外設定を失わない（Task 2、5）。
- 印刷の画像読込失敗・生成し直し中の遅い応答で、古い原稿を印刷可能にしない（Task 4、5）。
- 長い語を9語載せたとき、裁断線を越えたり、最終ページだけ拡大したりしない（Task 4、6）。
- クラス人数のコピー・名簿変更・100人試行でも、実名が児童画面や印刷へ流れない（Task 3、5）。

## 実行前確認と保存規約

実行開始時に既存worktreeと変更一覧を確認する。`release_repo` は既存のlinked worktreeで、既にBINGO関連の未コミット変更がある。新しいworktreeを機械的に作らず、この作業場所を再利用する。各Taskは失敗するテスト→最小実装→成功確認の順で進める。

編集は `games_site`、反映は `node games_site/build.cjs`。ビルドは `release_repo/games` にコピーし、HTMLの参照ハッシュを更新する。ビルドがGrade34を変更しないことを確認する。

各Task末尾で差分を確認する。新規ファイルは対象だけをローカルコミットし、既存の未コミット内容と重なるファイルは、今回分を安全に分離できない限りステージしない。テストとソースは作業ルートに保持し、成果物のコミットを理由に既存変更をまとめて取り込まない。push・PR・公開はしない。

## 部品と共通データ

新規 `games_site/interview-bingo-setup.js` は設定の初期化・検証・候補同期、新規 `interview-bingo-my-card.js` は匿名配分のみを担当する。両方とも既存sessionと同じwindow global／CommonJS形式にする。

`Config={size:3|4|5, candidateIds:string[], participantCount:number, myCardWordCount:number}`。
`Issue={field:string, message:string}`。
`Batch={config:Config, cards:string[][], counts:Record<string,number>}`。カードのラベル・画像は既存Picture Card情報から描画時に取得し、Batchに名簿は入れない。

新規 `interview-bingo-teacher.js/.css` は教師設定の表示・入力、新規 `interview-bingo-print.js/.css` は印刷用文書とプレビューを担当する。`interview-bingo-creator.js` が設定反映・確認・タブ移動を調停する。`interview-bingo-session.js` と `interview-bingo-student.js/.css` は既存盤面の拡張に限定する。

### Task 1: 教師設定検証と匿名MY CARD配分

**Files:** Create `games_site/interview-bingo-setup.js`, `games_site/interview-bingo-my-card.js`, `games_site/test-interview-bingo-setup.cjs`, `games_site/test-interview-bingo-my-card.cjs`。

**Interfaces:**
- `InterviewBingoSetup.initial({cardIds, recommendedMyCardWordCount}) -> Config`。
- `validate(config, availableCardIds) -> {errors:Issue[], warnings:Issue[]}`。入力を変更しない。
- `reconcileCandidates(config, previousIds, nextIds) -> Config`。既存の除外を保持し、新規候補は選択する。
- `boardKey(config) -> string` はsize・候補集合・人数、`printKey(config) -> string` は候補集合・人数・MY CARD語数。候補順だけの差は同一とする。
- `InterviewBingoMyCard.generate(config,{random=Math.random}={}) -> Batch`。不正設定なら例外、引数を変更しない。

- [ ] **失敗テストを書く。** 初期値3・35・おすすめ値、MY CARDおすすめ10をそのまま保持することを検証。人数0/101/小数/空、語数0/10/候補超過、未知ID、候補ゼロをエラーにする。候補容量不足は警告で、人数不足は10/17/26人を境に警告する。例：`assert.equal(validate({...valid,size:4,participantCount:16},ids).errors.length,0)` と人数警告を確認する。
- [ ] **配分テストを書く。** 候補数1/2/13/100、人数1/9/10/35/100、合法な語数1/4/9を組み合わせ、`batch.cards.length===N`、各カード長k・重複なし・既知IDのみ、`max(counts)-min(counts)<=1` を検証。13語・35人・1語では各2～3回、9人では未配布4語をcountsの0として残す。固定乱数で再現でき、入力は不変。
- [ ] **失敗確認。** `node games_site/test-interview-bingo-setup.cjs` と `node games_site/test-interview-bingo-my-card.cjs` が未実装APIを理由に失敗することを確認する。
- [ ] **実装。** 検証は数値を暗黙に補正しない。配分は各人ごとに未選択かつ総登場回数が最小の語から選び、同率を乱択する。人数分の生成後、カードの順もシャッフルする。配分はBINGO完成可能性を保証しない。
- [ ] **成功確認。** 上記2コマンドがPASS。候補同期は、除外a・選択bの元候補[a,b]を[a,b,c]に変えたとき[b,c]となり、除外aを維持することを確認する。bの削除時はbだけ選択から外れ、並び順の変更だけではキーが変わらないことも確認する。
- [ ] **チェックポイント。** ビルドして新規2モジュールのみ差分確認・ローカルコミット。メッセージ `feat: add Bingo trial settings and balanced MY CARD allocation`。

### Task 2: 2回までのカード配置と教師設定を受け取る児童画面

**Files:** Modify `games_site/interview-bingo-session.js`, `games_site/interview-bingo-student.js`, `games_site/interview-bingo-student.css`, `games_site/test-interview-bingo-session.cjs`。Create `games_site/test-interview-bingo-student-config.cjs`。

**Interfaces:**
- sessionの `createState`, `transition`, `getProgress`, `getLines` の引数・返り値を維持する。本人はstudentIdsに含めず、`assignName` の既存チェックで拒否する。
- studentの `update({activity,cards,page?,config?,reset=false})` を拡張。configは反映済みConfig。reset時は指定サイズ・候補・本人以外の仮IDで再作成。それ以外は候補削除だけ既存syncCandidatesで同期する。
- `student.getProgress() -> {filled,required,missing,complete,usedStudentIds}` を追加し、Creatorのリセット確認に使う。既存 `element,destroy,onPageChange` は維持。

- [ ] **失敗テストを書く。** 同じIDを2回配置可能、3回目は不変。一方のremoveCard/removeNameが他方を変えない。同じ語2マスでも異なる相手が必要。13語4×4 RANDOMは13種類、3種類だけ2回。13語5×5は25マス、12種類2回。12語5×5はRANDOM不変。十分な候補では重複なし。全サイズで行・列・斜めカウントと取り消しを維持する。
- [ ] **単体ブラウザテストを書く。** 隔離ページで実部品をmountし、configから4×4・16人を設定。サイズselectが児童側にない、使用数0／2→1／2→2／2、3回目無効、外すと再使用可能を確認。1番は「自分」で無効、他15名はIDが一意。100人、1人でも実名簿参照なし。`update({reset:false})` は同じ設定なら配置保持、`reset:true` は空盤面にする。
- [ ] **失敗確認。** `node games_site/test-interview-bingo-session.cjs` と `node games_site/test-interview-bingo-student-config.cjs` が新しい期待値で失敗することを確認する。
- [ ] **実装。** placeは配置数2で拒否。RANDOMは必要数まで異なる語を選び、不足分を二度目の候補から重複なしで取り、最後に全体シャッフル。容量は候補数×2。STARTは容量不足または未完成で無効。1～35番は既存仮名、36～100番は「児童36」等とし、IDは `bingo-demo-01` から連番。本人IDは許可ID集合から除外する。
- [ ] **表示と操作を調整。** サイズは読み取り表示。候補使用数を追加しても正方形と画像領域を保つ。select削除後の「シート作りへ戻る」のフォーカス先をRANDOMへ変更。既存拡大・表現置換・盤面固定位置を維持する。
- [ ] **成功確認とチェックポイント。** 上記2テストと `node games_site/test-interview-bingo-expressions.cjs` をPASSにする。既存Creator経由テストのサイズ操作更新はTask 5で行う。対象差分を確認し、安全に分離できる今回分だけローカルコミット `feat: support repeated Bingo cards and teacher-owned student settings`。

### Task 3: 教師用操作とクラス人数の読み取り

**Files:** Create `games_site/interview-bingo-teacher.js`, `games_site/interview-bingo-teacher.css`, `games_site/test-interview-bingo-teacher-controls.cjs`。Modify `games_site/interview-bingo-roster-preview.js`, `games_site/test-interview-bingo-roster-browser.cjs`。

**Interfaces:**
- `InterviewBingoTeacher.create({onChange,onTry,onGenerate,onUseRosterCount}) -> {element,candidatesElement,update,destroy}`。`onChange(config)` は新しいConfigを通知し、数値空欄はNaNとして保持。他のコールバックは引数なしの操作通知。保存・名簿の読み書きは行わない。
- `update({config,cards,recommendations,dirty,errors,warnings,rosterCount,distribution})`。cardsはプリセット全候補、distributionは `Record<string,number>|null`。elementを右側設定、candidatesElementを左側候補として使う。
- rosterの `create({onCountChange=()=>{}}={}) -> {element,refresh,getSelectedCount}` を拡張。未選択・エラーはnull。人数だけを通知し、名簿選択で教師設定を自動変更しない。

- [ ] **失敗テストを書く。** 教師用BINGOサイズ3/4/5、参加人数、MY CARD語数、候補チェック、未反映表示、エラー、各おすすめ範囲、試行／生成ボタンを確認する。候補チェックはcardIdsではなくcandidateIdsだけを通知。入力再描画でもフォーカスを失わない。
- [ ] **人数コピーと安全性テストを書く。** クラス未選択はコピー無効。選択しても人数入力は35のまま、明示的コピー操作のみその人数へ変わる。クラス削除・読込エラーで人数取得はnull。legacy名簿、番号のみ名簿、表示名切替を維持し、localStorage全キーが不変であることを検証する。
- [ ] **失敗確認。** `node games_site/test-interview-bingo-teacher-controls.cjs` と `node games_site/test-interview-bingo-roster-browser.cjs` を実行し、未追加操作・APIが原因で失敗することを確認する。
- [ ] **実装。** 既存配色・角丸を利用する。制御要素のラベルは「BINGOサイズ」「参加人数」「MY CARDの語数」「この設定で試す」「MY CARDを作る」「このクラスの人数を使う」。人数不足は全マスが埋められない旨に限定する。distributionの0～2回の語に配布不足の注意を表示し、単語別人数だけでは全体完成を保証しないことを添える。
- [ ] **成功確認とチェックポイント。** 上記2テストがPASS。新規教師部品と安全に分離できる名簿部品の差分だけ確認・ローカルコミット `feat: add Bingo teacher trial controls and roster count copy`。

### Task 4: 同じ原稿を表示し印刷する9等分MY CARD

**Files:** Create `games_site/interview-bingo-print.js`, `games_site/interview-bingo-print.css`, `games_site/test-interview-bingo-print.cjs`。

**Interfaces:**
- `InterviewBingoPrint.create({baseUrl=document.baseURI,onRegenerate=()=>{}}={}) -> {element,update,invalidate,print,getDocument,destroy}`。
- `update({batch,cards})` はTask 1のBatchと既存カード情報を受け取る。乱数を使わない。
- `invalidate(message)` は古い原稿を印刷不可にする。`print() -> Promise<boolean>` は準備済み原稿だけ印刷、未準備ならfalse。`getDocument() -> string` はプレビューiframeと同じ印刷用HTMLを返す。

- [ ] **失敗テストを書く。** 9/10/35人でsheet数1/2/4、全sheetが9枠、最後の未使用枠が空欄。各枠70×99mm、sheet210×297mm、cut線70/140・99/198mmをDOM実寸で確認する。MY CARD1/4/9語と長語、入力中のHTML記号を文字として扱い、実名・教師メモ・操作ボタンが印刷用HTMLにないことを検証する。
- [ ] **読込テストを書く。** 画像応答を遅らせると印刷不可、全画像とfonts.ready完了で可能。画像404なら対象英語と再試行、修復後のみ可能。旧世代の遅いloadは新原稿の状態を変えない。印刷を2回呼んでもgetDocumentと配分は同じで、呼ぶのはiframe内のprintだけ。
- [ ] **失敗確認。** `node games_site/test-interview-bingo-print.cjs` が未実装部品で失敗することを確認する。
- [ ] **実装。** 同一オリジンの印刷専用iframeへエスケープ済み文書を渡し、画面プレビューと印刷で同じ文書を使う。印刷CSSは `@page { size:A4 portrait; margin:0 }`、body余白0、grid列70mm×3／行99mm×3、border-box、gap0。裁断線は寸法を増やさず、最後以外だけ改ページ。内側padding5mm、絵はobject-fit:contain、英語は省略せず折り返す。画面上の縮小は印刷文書のmm寸法を変更しない。
- [ ] **印刷操作と失敗処理。** eager画像とフォントを待つ。update・invalidate・destroyで世代番号を更新し、古い非同期結果を無視。失敗対象と再試行ボタンを表示。操作部に「印刷」「作り直す」と、A4縦・倍率100％・余白なし・ヘッダーとフッターOFF、フチなし非対応や自動拡大についての注意を置く。これらは印刷文書外にする。
- [ ] **成功確認とチェックポイント。** 上記テストがPASS。新規印刷部品だけビルド・確認・ローカルコミット `feat: add exact A4 nine-up MY CARD print preview`。PDFと目視確認はTask 6で行う。

### Task 5: Creatorと保存済み教師試行を接続

**Files:** Modify `games_site/interview-bingo-creator.js`, `games_site/interview-bingo-creator.css`, `games_site/index.html`, `games_site/test-interview-bingo-student-fixture.cjs`, `games_site/test-interview-bingo-browser.cjs`, `games_site/test-interview-bingo-student-browser.cjs`, `games_site/test-interview-bingo-student-layout.cjs`, `games_site/test-interview-bingo-teacher-trial.cjs`, `run-classroom-tests.cjs`。Create `games_site/test-interview-bingo-teacher-flow.cjs`。

**Interfaces:** Creatorの公開 `open(id,{previewOnly}),renderLibrary` を維持。open内に `trialDraft:Config`, `applied:Config|null`, `batch:Batch|null` を所有する。上記部品APIだけで接続し、保存用draftとは区別する。

- [ ] **統合失敗テストを書く。** 13語4×4を教師設定→手動／RANDOM→STARTで試す。児童にサイズ変更操作はない。サイズ・候補・人数変更の確認をキャンセルすると元配置・名前を保持し教師タブに残る。承認で空盤面。kだけ変更では盤面維持。無効設定から児童／MY CARDへ進んでも古い設定で動かず、教師へ戻りエラーを表示する。
- [ ] **同期・原稿保持テストを書く。** Creatorで候補追加すると新語は選択され、教師が除外した語は戻らない。元候補削除はその語の両マスと名前だけ除去し他マスを保持。候補・人数・k変更で古い原稿の印刷不可。タブ往復・拡大・印刷で再抽選なし。「作り直す」だけ新配分になる。サイズだけ変更なら既存MY CARD配分を保持する。
- [ ] **保存・プライバシーテストを書く。** 通常CreatorとpreviewOnlyの両方で操作可能。クラス人数をコピーしても児童には仮名、印刷は匿名。名簿表示変更だけでは参加人数を変えない。試用前後の全localStorage一致、既存保存・再読込・DL・Unit割当を保持する。範囲外おすすめ10を含む既存プリセットも読め、保存値は変わらず、試用時だけ修正を求める。
- [ ] **失敗確認。** `node games_site/test-interview-bingo-teacher-flow.cjs` が未接続の教師設定を理由に失敗することを確認する。
- [ ] **接続実装。** indexの読込順はmodel/store→setup/my-card→roster/teacher→session/expressions/student→print→creator。保存タイル試行にもMY CARDタブを表示。未実装印刷／固定35人という旧案内を更新し、配信未実装は残す。既存 `status()` と保存エラーはauthorフォーム内だけを対象にし、新しいrole=statusと衝突させない。
- [ ] **反映処理。** onChangeはtrialDraftだけ更新、printKeyが変われば直ちに原稿無効化。試行・児童タブ・MY CARDタブ・生成の全入口でvalidateし、エラーなら教師へ戻る。boardKey変更かつfilled>0のとき一度だけ確認し、キャンセルではappliedを変えない。初回反映またはboardKey変更でreset=true、それ以外はfalseとしてstudent.updateへ渡し、反映成功後にappliedを更新する。「MY CARDを作る」は反映成功後、原稿が未作成・無効なら生成してMY CARDタブへ進み、有効な原稿があればそれを再表示する。タブを開くだけでは生成せず、有効原稿の再抽選は「作り直す」だけにする。
- [ ] **Creator候補同期。** 元候補集合が変わった場合にのみdraft/appliedをreconcileし、studentには有効な既存候補を渡してsyncCandidatesする（全盤面リセットしない）。batchは無効化。教師入力が未反映のときに一緒に反映しない。元のおすすめは初回設定にだけ使い、教師が入力したkをauthor編集で上書きしない。
- [ ] **既存テストを新しい操作へ更新。** fixtureの `setSize(page,ui,size)` は内部で教師タブ→サイズ→「この設定で試す」へ移る。person(0)の使用テストは本人以外へ変更。重複禁止・MY CARD未実装という旧期待値のみ改定する。独立layout fixtureはupdateへconfigを渡す。新規テストをrun-classroom-testsへ登録する。
- [ ] **成功確認とチェックポイント。** 新規flowテスト、既存Bingo browser/student/layout/teacher-trialを個別に実行しPASS。`node games_site/build.cjs` 後、公開形式も `$env:INTERVIEW_BUILT='1'; node games_site/test-interview-bingo-teacher-flow.cjs` でPASS。環境変数は確認後削除する。今回分を分離して差分確認・ローカルコミット `feat: connect Bingo teacher settings student trials and MY CARD printing`。

### Task 6: 印刷寸法と既存活動の最終確認

**Files:** Create `games_site/test-interview-bingo-print-pdf.cjs`, `release_repo/docs/superpowers/plans/2026-10-01-interview-bingo-teacher-print-results.md`。PDF・スクリーンショット・検証ログは `qa/bingo-teacher-print/` に置く。

**Interfaces:** Task 4のgetDocumentを隔離したページにそのまま載せ、`page.pdf({preferCSSPageSize:true,displayHeaderFooter:false,printBackground:true})` で印刷文書を出力する。プレビューiframe内のDOMと同じ配分であることも検証する。PDF確認時にPDFスキルを読み、用意されたランタイムで抽出・描画する。

- [ ] **PDFテストを作る。** 9/10/35人が1/2/4ページ、MediaBoxが210×297mm相当（約595.28×841.89pt）、枠位置が70×99mm相当であることを抽出とDOM測定で確認。35人の最終ページは1枠空欄。PDF中に実名・教師メモ・操作部がない。ページ数以外を成功と誤認しない。
- [ ] **PDFとブラウザを目視確認。** MY CARD1/4/9語、長い英語、最後のページを画像に描画して確認し、不具合を直す。1366×768・1280×600で5×5、左右55:45、正方形、ページ間の盤面位置保持、候補内部スクロール、使用数表示と名前取り消しを実ブラウザで確認する。印刷文書は全画像ロード済みで確認する。
- [ ] **全体検証。** `node run-classroom-tests.cjs` を実行。前回は86件中83件成功で、NHE Unit期待値1件とsource側のRoulette URL2件が既知の失敗。今回の結果を再実行ログで区別し、新しい失敗は修正する。URL2件はbuilt形式で個別再確認する。既存INTERVIEWの作成・保存・教師／児童プレビューも確認する。
- [ ] **最終レビュー。** 今回の全差分、仕様、テスト結果を独立レビュアーへ渡す。入力補正、候補削除時の保持、実名混入、古い原稿の印刷、印刷切れを重点確認し、指摘修正後に対象テストを再実行する。
- [ ] **記録と引き渡し。** 実施結果・未確認事項をresults文書へ保存。実プリンターで印刷したとは表現しない。確認済みの今回分だけローカルコミット `test: verify Bingo teacher setup and A4 MY CARD printing`。ローカルURL、操作場所、紙での印刷設定、公開していないことを短く報告して止める。

## 計画の自己確認

仕様の教師設定・設定変更・2回配置・人数警告・匿名配分・9等分印刷・データ分離・検証をTask 1～6へ対応させた。ConfigとBatch、各部品のAPI名、resetとsyncCandidatesの使い分け、印刷無効化条件を統一した。Review Focusの5項目に対象テストがあり、Classroom配信やMY CARD名簿割当は追加していない。

この計画の確認と実行方法の選択を受けてから、製品コードの変更を始める。
