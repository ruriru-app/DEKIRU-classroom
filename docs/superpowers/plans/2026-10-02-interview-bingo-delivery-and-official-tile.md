# INTERVIEW BINGO Pupil Delivery and Official Tile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** INTERVIEW BINGOを児童の端末へ配信して再開可能にし、提供SVGの公式タイルから配信・文④・単語練習へ進める状態で公開する。

**Architecture:** 再利用プリセット、発行時に固定する配信情報、児童ごとの保存情報を分離する。既存BINGO画面には明示的な配信用設定を追加し、Creatorの仮名プレビューを変えない。既存INTERVIEWの配信形式は変更せず、圧縮・名簿表示変換・共有ダイアログ・練習画面を再利用する。

**Tech Stack:** Vanilla JavaScriptの既存IIFE/CommonJS形式、HTML/CSS、localStorage、CompressionStream、既存QR部品、Node.js assert、Playwrightとインストール済みChrome。新規パッケージ・共有DBなし。

**Spec:** `docs/superpowers/specs/2026-10-02-interview-bingo-delivery-and-official-tile-design.md`。この計画と併せて全文を読む。利用者が仕様書、計画、分担実装方式と公開までの実行を承認済み。

## Global Constraints

- BINGOサイズは3×3・4×4・5×5。同じカードは最大2回、相手は1回、自分の名前は使用不可。
- 有効期間は1・4・12・24時間、初期値1時間。期限は端末時計による利用制限で、リンクの秘匿化・遠隔失効ではない。
- 配信候補1～100語、名簿1～100人。候補語数×2がマス数未満なら配信不可。相手不足は警告にとどめる。
- 差し替えなし・1種類の差し替え枠に対応。同じ枠の繰り返しは可。複数独立枠は理由を示して発行不可。
- 圧縮前後160,000バイト、トークン220,000文字を上限とする。URL 2,024文字超は添付失敗の可能性を伝える目安であり、外部サービスの保証された制限値とはしない。
- 登録・編集はClassroom Grade3＆4のみ。配信には選択された表示名だけを入れ、教師メモ・名前の別表記・印刷情報・元名簿の内部IDを入れない。
- 保存失敗時の案内は「この端末では途中保存できません。ページを閉じると記録が失われます」。破損した記録は明示的なやり直しまで上書きしない。
- 個人保存タイルと削除、既存INTERVIEW、BINGO Creatorの仮名試用、紙カード9枚・12枚の印刷を維持する。
- `sources/` と提供されたSVG・JSONは読み取り専用。実名簿やリンク全文をテストログ・スクリーンショット・コミットに残さない。
- 結果収集、別端末同期、本人認証、Google Classroomへの自動投稿は実装しない。

## Review Focus

1. 確認から圧縮完了までに別タブで名簿が変わる場合、確認前の情報を配信しない。Task 5で圧縮中の変更も試す。
2. 名簿の先頭以外を本人に選ぶ場合と共用端末で本人を切り替える場合、名前・盤面・保存先が混ざらない。Tasks 3・4で検証する。
3. 読み取り可能だが書き込み禁止の保存領域や、不正な保存盤面で、誤った保存成功・無断リセットを起こさない。Tasks 2・4で検証する。
4. バックグラウンドから復帰した直後の操作やリンクの高速切り替えで、期限切れ・別配信へ書き込まない。Task 4で検証する。
5. 同名、番号のみ、長い名前・表現・カード英語でも本人を区別でき、5×5と印刷が崩れない。Tasks 1・4・7で検証する。

## 作業場所とファイルの責任

コマンドの作業ディレクトリは `C:/Users/withc/.codex/.chatgpt-projects/g-p-6aa08aad243481919856c7e8453ef444/interview_work`。以下のソース・テストパスはこの場所からの相対パス。設計書・計画とGit管理対象は `release_repo` 内にある。

- `games_site/interview-bingo-delivery.js` 新規：児童向け情報の投影・形式検証・期限判定。
- `games_site/interview-bingo-share.js` 新規：版付き圧縮リンクの作成と復号。配信IDや名簿を生成し直さない。
- `games_site/interview-bingo-progress.js` 新規：配信と本人ごとの検証付き保存。
- `games_site/interview-bingo-session.js` 変更：保存状態の純粋な検証関数のみ追加し、既存状態遷移の契約を保つ。
- `games_site/interview-bingo-student.js` 変更：実名簿・本人ID・復元・変更通知・操作可否の注入。保存や名簿読み込み自体は置かない。
- `games_site/interview-bingo-receive.html`、同名の `.js`・`.css` 新規：児童の入口、本人選択、期限管理、保存との接続。
- `games_site/interview-bingo-distribution.js` 新規：教師の配信確認と発行。準備画面の印刷や試用とは分離する。
- `games_site/interview-bingo-roster-preview.js`、`interview-bingo-prepare.js/html/css` 変更：名簿の読み取りAPIと配信欄の接続。
- `games_site/assets/ui/interview-bingo-preset.svg` 新規、`interview-bingo-links.js/css` 変更：公式タイルだけの差し替え。
- `grade34_site/app.js` 変更：重ね表示から正しい呼び出し元へフォーカスを戻す。既存練習をそのまま使う。
- 各Taskに列挙する `test-*.cjs` 新規、`run-classroom-tests.cjs` 変更：既存のローカル検証方式を使う。テストは公開アセットへコピーしない。

Gitは既存の `release_repo` linked worktree、ブランチ `feature/interview-phase1` を再利用する。着手時に差分とHEADを再確認する。開始時HEADは設計書コミット `1196ab9`、公開済みの機能は `1f5b4ab`。未公開の別件差分 `grade34/class-settings.html`、`index.html` のsentence-units参照、`phonics.html`、`sentence-units.js`、phonics内README・generation-logは触らず、今回のコミットに含めない。

ソースはGit checkout外、配信用ビルドだけが既存のGit管理対象という構成を維持する。各Taskのチェックポイントではテスト後に対応ビルドを作り、対象ファイルだけ `git add --sparse -- <paths>` で確認してコミットする。Task間で未完成のHTML参照を公開しない。GitHubへのpushはTask 7の全確認後に1回行う。

## Task 1 配信モデルと圧縮リンク

**Files:** Create `games_site/interview-bingo-delivery.js`, `games_site/interview-bingo-share.js`, `games_site/test-interview-bingo-delivery-fixture.cjs`, `games_site/test-interview-bingo-delivery.cjs`, `games_site/test-interview-bingo-share.cjs`. Read `interview-bingo-model.js`, `../grade34_site/share-codec.js`, `../grade34_site/interview-share.js` without changing the Interview wire format.

**Interfaces:**

- `InterviewBingoDelivery.snapshot({preset, config:{size,candidateIds}, roster, hours=1, now=Date.now(), deliveryId}, validCardIds) -> Delivery`。rosterはClassRosterの変換済み名簿。deliveryId省略時のみ新しいIDを発行する。
- `InterviewBingoDelivery.validate(value, validCardIds=null) -> Delivery`, `isExpired(delivery, now=Date.now()) -> boolean`, `validateConfig(config, availableIds, participantCount) -> {errors,warnings}`。errors/warningsは `{field,message}` の配列。validateConfigは印刷欄を参照しない。snapshotはerrorsがあればthrowする。
- Deliveryの固定形は `{version:1,type:'interview-bingo-delivery',deliveryId,issuedAt,expiresAt,activity:{title,studentInstructions,expressions,cardIds},size,roster:{className,students:[{id,number,name}]}}`。各値は文字列・整数・通常の配列だけ。expressionsは既存のtemplate/slots形式、slots内cardIdsは選択後の候補に限定する。
- 発行時に児童IDを名簿の順に `p1`～`p100` として固定する。受信でもこの形式と一意性を検証する。番号は既存ClassRosterと同じ正の整数文字列、最大12桁、数値として重複不可。表示名最大80文字、クラス名最大80文字。タイトル80文字、説明500文字、表現200文字は既存モデルと同じ。
- `InterviewBingoShare.buildShortUrl(delivery, baseUrl) -> Promise<string>`, `decodeShared(token) -> Promise<Delivery>`。URL hashは `#bingo=b1z.<base64url>`、非圧縮fallbackは `b1j.`。配信情報を小さな配列に詰めてdeflateするが、公式カタログの参照辞書は初版では追加しない。
- wire配列は `[1,deliveryId,issuedAt,expiresAt,[title,studentInstructions,template,slotIdOrNull,cardIds],size,[className,[[id,number,name],...]]]`。slotsは復号時に既存expressions形式へ復元する。各配列長を検査し、同じデータが受信前後で一致することを保証する。
- fixtureの `sample({count=35,numberOnly=false,size=4}={}) -> {preset,roster,config,knownCardIds}` は実在する文房具ID13語と架空名簿を返す。時刻はテスト側が固定する。

- [ ] **Step 1** 新しい2つのテストとfixtureを作る。最低限の断言は以下に加え、1/4/12/24時間、35人・100人、同名と番号のみ、無効な番号・サイズ・候補・複数枠・未知版・期限順序・上限超過を表で検証する。

```js
const f=sample(), now=Date.parse('2026-10-02T10:00:00Z');
const d=D.snapshot({...f,hours:1,now,deliveryId:'delivery-qa'},f.knownCardIds);
assert.equal(d.roster.students[16].id,'p17');
assert.equal(d.size,4);
assert.equal(Date.parse(d.expiresAt)-Date.parse(d.issuedAt),3600000);
assert.ok(!JSON.stringify(d).includes(f.preset.teacherMemo));
assert.ok(!JSON.stringify(d).includes(f.roster.id));
const href=await Share.buildShortUrl(d,'https://example.test/games/interview-bingo-receive.html');
assert.deepEqual(await Share.decodeShared(new URL(href).hash.slice(7)),d);
assert.equal(D.isExpired(d,now+3600000),true);
```

- [ ] **Step 2** `node games_site/test-interview-bingo-delivery.cjs` と `node games_site/test-interview-bingo-share.cjs` を実行し、新モジュール・APIが存在しない理由で失敗することを確認する。
- [ ] **Step 3** 投影と検証を実装する。投影はホワイトリストで、元オブジェクトの展開コピーを避ける。受信は厳密な形を検証し未知フィールドを拒否する。候補の部分選択でslotsも絞り、ID・名前を受信時に生成し直さない。期限間隔は許可された時間のみ、発行・期限はISO日時とする。
- [ ] **Step 4** 固定配列形式のpack/unpackとサイズ制限付き圧縮を実装する。既存ShareCodecだけを再利用し、`interview-share.js` は編集しない。対応していない圧縮ブラウザには案内を出す。受信側の実在カード検証はTask 4で必ずknownCardIdsを渡す。
- [ ] **Step 5** 新規2テストと `node grade34_site/test-interview-share.cjs` を実行し終了0を確認する。通常35人の名前あり・番号のみの完成URL長だけを記録し、URL全文はログに出さない。圧縮処理なしfallback、壊れたUTF-8、過大展開も断言する。
- [ ] **Step 6** `node games_site/build.cjs` 成功後、`release_repo/games/interview-bingo-delivery.js` と `interview-bingo-share.js` のみを検査・コミットする。見出し例 `feat: add versioned Bingo delivery snapshots`。

## Task 2 盤面の検証と本人別保存

**Files:** Modify `games_site/interview-bingo-session.js`. Create `games_site/interview-bingo-progress.js`, `games_site/test-interview-bingo-progress.cjs`. Extend `games_site/test-interview-bingo-session.cjs`.

**Interfaces:**

- Consumes Task 1 `Delivery` and `InterviewBingoDelivery.validate`.
- Adds `InterviewBingoSession.validateState(raw,{size,cardIds,studentIds}) -> cloned State`。stateの形は既存createStateと同じ。対象外IDを落として修復せず不正はthrowする。既存transitionのsetPage契約は変えない。
- `InterviewBingoProgress.create(storage) -> {read,save,remove}`。`read(delivery,selfId) -> {status:'empty'|'saved'|'corrupt'|'unavailable',state?,error?}`、`save(delivery,selfId,state)` と `remove(delivery,selfId) -> {ok:boolean,error?}`。
- キーは `dekiru-interview-bingo-progress-v1:<deliveryId>:<selfId>`。保存値は `{version:1,delivery:JSON.stringify(validatedDelivery),selfId,state}`。studentIdsは本人を除いた配信内ID。selfId不正は保存・復元不可。保存前にも検証する。

- [ ] **Step 1** 状態検証・保存テストを追加する。新旧配信を同じdeliveryIdで意図的に比較するケース、保存例外とJSON破損を分けるケースを含む。

```js
const s=S.createState({size:d.size,cardIds:d.activity.cardIds,studentIds:d.roster.students.filter(p=>p.id!=='p17').map(p=>p.id)});
assert.equal(store.save(d,'p17',s).ok,true);
assert.deepEqual(store.read(d,'p17').state,s);
assert.equal(store.read(d,'p1').status,'empty');
assert.equal(store.read({...d,activity:{...d.activity,title:'別内容'}},'p17').status,'corrupt');
assert.throws(()=>S.validateState({...s,page:'interview'},{size:s.size,cardIds:s.cardIds,studentIds:s.studentIds}));
assert.equal(blockedStore.read(d,'p17').status,'unavailable');
```

- [ ] **Step 2** `node games_site/test-interview-bingo-session.cjs` と `node games_site/test-interview-bingo-progress.cjs` を実行して追加機能についてREDを確認する。
- [ ] **Step 3** validateStateを実装する。正しいcells数、cardIds/studentIdsの完全一致、カード最大2回、相手最大1回、カードなしの相手禁止、selectedIndexの範囲、pageの列挙値、未完成interview禁止を検査する。composeへ戻った完成・未完成盤面に残っている有効な名前は許可する。
- [ ] **Step 4** Progressを実装する。getItem例外はunavailable、取得できた不正JSON・署名不一致はcorruptとして保存データを維持する。removeは本人のキーだけ。暗号署名と誤認させず、delivery文字列は内容一致の確認に使う。
- [ ] **Step 5** 両テストを再実行し終了0を確認する。3×3・4×4・5×5の全ライン数8・10・12、名前解除後の再計算、self混入、重複・不正なID、quota例外、他人の保存維持も断言する。
- [ ] **Step 6** Gamesビルド後、対象2モジュールだけを検査・コミットする。例 `feat: validate and save Bingo pupil progress`。

## Task 3 児童画面へ実名簿と保存口を追加

**Files:** Modify `games_site/interview-bingo-student.js`. Create `games_site/test-interview-bingo-student-delivery.cjs`. Read existing student fixture/config/browser/layout tests; their仮名・非保存の断言を削除しない。

**Interfaces:**

- `InterviewBingoStudent.create({onPageChange=()=>{},mode='preview',people=null,selfId=null,onStateChange=()=>{},canInteract=()=>true}={})`。deliveryのpeopleは `[{id,label}]`。指定された本人IDはpeople中に1件存在する必要がある。
- 既存 `update({activity,cards,config,reset,page})` を維持。deliveryではconfig.sizeとcards、注入されたpeopleからstateを作り、仮名人数を使用しない。modeと本人はインスタンス中に変えない。
- 返り値に `getState() -> cloned State` と `restoreState(value) -> void` を追加。restoreはTask 2で再検証し、syncCandidatesで改変を黙って補正しない。復元自体は保存通知を発火しない。
- 変更を伴う操作の後だけ `onStateChange(clonedState)`。すべてのクリックと状態変更の直前にcanInteractを確認する。falseなら変更しない。deliveryでは未完成interviewへのupdateも拒否する。

- [ ] **Step 1** 新テストに実名簿35人・本人p17・保存通知spyを注入するブラウザfixtureを作る。次の断言と、default createの仮名動作を同時に確認する。

```js
assert.equal(await ui.locator('[data-bingo-person="p17"]').isDisabled(),true);
assert.equal(await ui.locator('[data-bingo-person="p1"]').isDisabled(),false);
assert.doesNotMatch(await ui.innerText(),/仮の名簿|1番として試用/);
assert.equal(await page.evaluate(()=>probe.stateBeforeBlockedAction===JSON.stringify(probe.component.getState())),true);
```

- [ ] **Step 2** `node games_site/test-interview-bingo-student-delivery.cjs` を実行して、注入未対応のために失敗することを確認する。
- [ ] **Step 3** 指定APIを実装する。自己除外を配列先頭判定からID一致に変更し、previewの本人は従来のdemo先頭IDを使う。返すstateと通知はコピーとし、外からstateを変更できないようにする。IDをHTML属性に入れる際もエスケープする。実配信でも既存2ページと外周インジケータを再利用する。
- [ ] **Step 4** 新テストと既存 `student-config`、`student-browser`、`student-layout`、`teacher-trial`、`expressions` の各 `games_site/test-interview-bingo-<name>.cjs` を実行し終了0を確認する。冠詞、名前解除、2回上限、START、操作停止と再復元を確認する。
- [ ] **Step 5** Gamesビルド後、児童部品だけを検査・コミットする。例 `feat: support explicit pupil identity in Bingo board`。

## Task 4 児童受信ページと再開操作

**Files:** Create `games_site/interview-bingo-receive.html/js/css`, `games_site/test-interview-bingo-receive.cjs`, `games_site/test-interview-bingo-receive-safety.cjs`, `games_site/test-interview-bingo-receive-layout.cjs`.

**Interfaces:**

- `InterviewBingoReceive.mount({root,hash=location.hash}) -> {destroy()}`。DOM readyではmainを渡して起動。受信→検証→本人選択→確認→盤面を順に表示する。
- Dependencies: Task 1 Share/Delivery、Task 2 Progress、Task 3 Student、既存 `InterviewBingoCards.available()`、SentenceForms、BingoModel/Session/Expressions。名簿Storeとプリセットcatalogは受信HTMLで読み込まない。
- DOM: `[data-bingo-identity]` 内の `[data-bingo-self="p17"]`、確認ボタン `[data-bingo-enter]`、`[data-bingo-change-self]`、`[data-bingo-restart]`、`[data-bingo-receive-status]`。盤面セレクターは既存を維持する。

- [ ] **Step 1** 新しいブラウザcontextを使う受信テストを作る。教師側localStorageをコピーせず、URLだけで開始する。テスト内の `readCells(page)` はDOM順に全マスの `{cardId: dataset.cardId || null, name: .bingo-cell-nameのtextContent || null}` を返すヘルパーとする。p17でRANDOM→START→相手を記録→reload→p17選択→記録復元、p1へ変更→空の盤面、p17へ再変更→元の盤面を断言する。

```js
assert.equal(await pupil.evaluate(()=>localStorage.getItem('dekiru-class-rosters-v1')),null);
assert.deepEqual(await readCells(pupil),beforeReloadCells);
assert.equal(await pupil.locator('[data-bingo-cell] .bingo-cell-name').count(),1);
assert.equal(await pupil.locator('[data-bingo-person="p17"]').isDisabled(),true);
assert.equal(await pupil.locator('select[aria-label="BINGOサイズ"]').count(),0);
```

- [ ] **Step 2** `node games_site/test-interview-bingo-receive.cjs`、`node games_site/test-interview-bingo-receive-safety.cjs`、`node games_site/test-interview-bingo-receive-layout.cjs` を実行し、新ページがない理由のREDを確認する。
- [ ] **Step 3** mountとHTML依存を実装する。hashは正確な `#bingo=` の1つだけを受け付ける。復号後はknownCardIdsを必ず渡して検証する。自己選択時に配信を再検証しProgress.read、corruptなら再開を止めて確認付きやり直し、unavailableなら案内付きメモリ内動作にする。本人変更は現在のcomponentをdestroyして新しく作る。やり直しキャンセル時は現状を保持する。
- [ ] **Step 4** 読み込み世代番号を用い、hash変更やdestroy後の古い復号結果を捨てる。各操作、focus、pageshow、visibilitychangeと最大60秒間隔のタイマーで期限を検査する。期限切れは拡大dialogも閉じ盤面を隠し、保存を削除しない。canInteractにも同じ検査を渡す。全イベント・timer・componentをdestroyで解放する。
- [ ] **Step 5** safetyテストで壊れた保存、保存拒否・quota、期限到来、復帰直後、復号中に別hash、未知カード・多枠・巨大データを試す。破損のraw保存が確認前後で不変、期限切れ操作でstate不変、旧配信タイトルが後から戻らないことを断言する。
- [ ] **Step 6** CSSを100dvhの画面枠と最小限の見出しで構成し、内部の候補・名簿だけをスクロールさせる。3/4/5と長い名前・表現を1366×768、1280×600で測る。`documentElement.scrollHeight <= innerHeight+1`、全マスの上下端がviewport内、正方形差2px以内を断言し、スクリーンショットを目視確認する。5×5でも本文・名前を隠さない。
- [ ] **Step 7** 受信3テストとTask 3テストを再実行し終了0を確認する。ブラウザで実際の手動配置・戻し・全ライン数・減算を確認する。Gamesビルド後、受信3ファイルだけを検査・コミットする。例 `feat: deliver resumable Bingo pupil activity`。

## Task 5 教師の名簿確認と配信操作

**Files:** Modify `games_site/interview-bingo-roster-preview.js`, `interview-bingo-prepare.js/html/css`. Create `games_site/interview-bingo-distribution.js`, `games_site/test-interview-bingo-distribution.cjs`, `games_site/test-interview-bingo-distribution-safety.cjs`. Existing helpers: `test-interview-bingo-preparation-fixture.cjs` and `../grade34_site/interview-test-helper.cjs`.

**Interfaces:**

- RosterPreview.createのoptionに `context='preview'`, `onSelectionChange=()=>{}` を追加。既存onCountChangeは維持。`getSelection({fresh=false}={}) -> {rosterId,script,scope,roster,signature}` を追加する。rosterはClassRoster変換済み、signatureは元名簿と選択script/scopeの一致確認用文字列。freshは保存領域を再読込し、削除・読込失敗・表記不備ならthrowする。これは読み取り専用。
- `InterviewBingoDistribution.create({getContext,isFresh,receiverUrl}) -> {element,invalidate(),destroy()}`。`getContext() -> {preset,config:{size,candidateIds},selection}`、isFreshは既存準備fresh()。署名はpreset・config・selection.signature・hoursから作り、print設定は含めない。invalidateは再読込・再表示し、署名が変わったときだけ同意と進行中の発行を無効化する。getContextの例外はUI内の案内へ変換する。
- UIは `#bingoDistribution` に実際の人数、候補数、サイズ、名簿表示方法、有効期間、同意チェック `[data-bingo-delivery-consent]`、`[data-bingo-delivery-create]`、案内を表示する。Share.buildShortUrl後、CardShare.openUrlでコピー・QR・試用を開く。

- [ ] **Step 1** ブラウザテストを追加し、未選択・未同意・不正条件で発行不可、35人の表示名あり・番号のみ、名簿人数と試用人数の不一致、printCountが空でも正しい配信は可能であることを断言する。テスト内の `decodeDialogUrl(page)` は共有dialogのtextarea値を読み、Task 1 decodeSharedでhashを復号して返す。実名簿は使わない。

```js
assert.equal(await page.locator('[data-bingo-delivery-create]').isDisabled(),true);
// 正しいクラス・表示・候補・同意を設定してから発行する。
const d=await decodeDialogUrl(page);
assert.equal(d.roster.students.length,35);
assert.equal(d.size,4);
assert.equal(d.activity.cardIds.length,13);
assert.ok(d.roster.students.every(s=>s.name==='')); // 番号のみの場合
assert.ok(!JSON.stringify(d).includes('教師専用メモ'));
```

- [ ] **Step 2** `node games_site/test-interview-bingo-distribution.cjs` と `node games_site/test-interview-bingo-distribution-safety.cjs` でREDを確認する。fixtureだけが壊れた失敗と機能未実装の失敗を区別する。
- [ ] **Step 3** 名簿getterと変更通知を実装する。same-ID編集、未入力表記、旧形式、番号のみ・同名を既存規則どおり検証する。Creatorは今後も確認用と分かる文言、準備画面だけ配信へ用いる文言にする。refreshのたびに同じ内容なら不用意に同意を外さず、署名の変化時には外す。
- [ ] **Step 4** 配信部品を実装して準備に接続する。候補・サイズ・名簿・表記・期限変更で同意と旧発行表示を無効化する。発行直前・圧縮後の両方でisFreshとgetContextを再確認する。発行中の二重クリックを止め、古い非同期結果を無視する。印刷・仮名タブには実名簿を渡さない。
- [ ] **Step 5** HTMLに配信モジュール、ShareCodec、CardShareのCSS/JS、既存 `../grade34_site/assets/ui/qrcode.js` を正しい順で追加する。共有ダイアログへ渡す前にURL長を測り、2,024文字超は確認付き警告を出す。QR失敗は既存fallback、localhost/fileは授業用端末から使えない確認用リンクと明示する。リンク全文をconsoleへ出さない。
- [ ] **Step 6** `#bingoDistribution` で開いた場合、教師タブの配信欄にスクロール・フォーカスする。準備の「児童配信未対応」表示だけを実装に合わせて更新し、Creatorプレビューを実配信と誤認させない。
- [ ] **Step 7** safetyテストで別タブ名簿編集・削除・ストレージ破損、圧縮を一時停止して設定変更、クラス切り替え、発行取消を検証する。誤ったリンクが開かず、再確認が必要で、元の個人保存・名簿を上書きしないことを断言する。新規2テストと既存 `roster-browser`、`preparation-browser`、`preparation-state`、`preparation-safety`、`teacher-flow` を各nodeで実行して終了0を確認する。
- [ ] **Step 8** Gamesビルド後、今回の準備・配信・名簿モジュールと対応HTMLだけを検査・コミットする。例 `feat: enable teacher-confirmed Bingo link sharing`。

## Task 6 公式SVGタイルと練習の入口

**Files:** Create `games_site/assets/ui/interview-bingo-preset.svg`, `games_site/test-interview-bingo-tile-practice.cjs`. Modify `games_site/interview-bingo-links.js/css`, `games_site/test-interview-bingo-official.cjs`, `grade34_site/app.js`. Read `grade34_site/interview-preset-tile.js`, `sentence-player.js`, `sentence-units.js`;文④自体は変更しない。

**Interfaces:**

- 既存 `InterviewBingoLinks.tiles(bookId,unit)` を維持し、現在の公式stationery presetだけSVG構成にする。personal出力・削除処理はそのまま。
- articleの `[data-official-bingo]` は維持。表現ボタンに `data-interview-sentence="question"`、`data-interview-cards`、安定した `data-preset-practice-key` を付ける。単語ボタンは既存 `data-interview-practice` に候補IDを渡す。
- Playリンクの `data-bingo-tile-play` と配信リンクの `data-bingo-tile-share` を分け、同じprepareHrefの後者だけ `#bingoDistribution`。画像URLはlinks.jsのscript URL基準で解決する。

- [ ] **Step 1** tile-practiceテストを追加する。表現・WORDSの正確な文字、candidate16語、question/Yes/No、a/an/pair、閉じると元タイル、Playと配信の別入口を断言する。既存officialテストの「aが1件」「文字タイル形式」の期待だけを新表示に合わせ、公式・個人分離の検証は残す。

```js
assert.equal(await tile.locator('[data-interview-sentence]').innerText(),'Do you have (P)?');
assert.equal(await tile.locator('[data-interview-practice]').innerText(),'文房具');
await tile.locator('[data-interview-practice]').click();
assert.equal(await page.locator('[data-practice-card]').count(),16);
assert.ok((await tile.locator('[data-bingo-tile-share]').getAttribute('href')).endsWith('#bingoDistribution'));
```

- [ ] **Step 2** `node games_site/test-interview-bingo-tile-practice.cjs` を実行して旧タイルに練習入口がないREDを確認する。
- [ ] **Step 3** SVGをXMLとしてレイヤー・外部参照・実行要素を検査し、元を変更せずアセットへ取り込む。既存隠しレイヤーは非表示のまま、または派生コピーから隠し画像と旧ロゴだけを除き、見た目を比較する。viewBox比を維持する。
- [ ] **Step 4** HTMLボタンとリンクを正規化したSVG座標へ重ねる。表現はx226.16/y361.174/w1080.91/h290.657、WORDSカテゴリーはx651.502/y688.353/w612.208/h131.813、Playはx110.355/y861.349/w637.060/h173.001、配信はx785.812/y861.349/w637.058/h173.001。単語のカテゴリーは実データから求める。各領域にaria-label・title・focus-visibleを付ける。
- [ ] **Step 5** app.jsの文練習を開く前にopenerの安定した識別情報を保持し、再render後に同じ公式タイルの表現へフォーカスを戻す。既存Interviewは従来の動作を維持する。戻る・Escape・全画面終了で音声とdialogが残らないことを確認する。
- [ ] **Step 6** `node games_site/test-interview-bingo-tile-practice.cjs`、`node games_site/test-interview-bingo-official.cjs`、`node grade34_site/test-official-interview.cjs`、`node grade34_site/test-official-interview-additions.cjs` を実行して終了0を確認する。1366/768/390px幅のタイル画像を見て文字位置とタップ領域を確認する。LT2 Unit4にタイルが増えず、同一ID個人保存・壊れた個人保存で公式が影響されないことも確認する。
- [ ] **Step 7** Games・Grade34をビルドし、SVG・タイルJS/CSS・app.jsと必要なindex参照だけを検査・コミットする。別件sentence-units差分は含めない。例 `feat: connect official Bingo artwork to practice and sharing`。

## Task 7 統合検証とGitHub公開

**Files:** Modify `run-classroom-tests.cjs` to include the new executable tests, not the fixture. Create `release_repo/docs/superpowers/plans/2026-10-02-interview-bingo-delivery-results.md` to record evidence and unverified real-world checks. Build output only under existing `release_repo/games`, `grade34`, `grade56`.

**Interfaces:** Consumes all delivered APIs and existing `interview-test-helper.cjs` setup; no new production contract. UI tests use isolated contexts with synthetic rosters only.

- [ ] **Step 1** 実行前の差分を記録し、`node run-classroom-tests.cjs` を一度実行してベースラインを確認する。これはTask 1着手前に行う。以後、新機能のRED/GREENを各Taskで記録する。失敗は環境・別件・今回の変更を分けて扱う。
- [ ] **Step 2** 新規テストをrunnerへ登録し、`node run-classroom-tests.cjs` を実行する。終了0、failed配列が空を確認する。対象機能のテスト失敗を単に期待値緩和で消さず原因を修正する。
- [ ] **Step 3** この順で実行し各終了0を確認する：`node games_site/build.cjs`、`node grade34_site/build-preview.cjs`、`node grade56_site/build.cjs`、`node games_site/build.cjs`。既知のjob_000/club_000ヘッダー絵fallbackは今回変更しない。
- [ ] **Step 4** `$env:INTERVIEW_BUILT='1'` で `node run-classroom-tests.cjs` を再実行して終了0を確認し、最後に環境変数を解除する。helperを使用するブラウザテストが配信用サイトを対象としていることも確認する。3サイズ、35人、番号のみ、長い表示、端末再開、印刷9/12枚、SVG練習のスクリーンショットとDOM寸法を確認する。
- [ ] **Step 5** 変更していない人の新しいレビューを受ける。名簿漏えい、保存データ保護、期限・非同期race、既存Interview互換を重点にし、指摘修正後は該当テストと全suiteを再実行する。検証結果・URL長・確認できなかった実機印刷とGoogle Classroom添付を結果文書へ記録する。
- [ ] **Step 6** Git差分・対象パス・HTML依存hash・画像を検査する。`grade34/index.html` のsentence-units参照は公開HEADの値を使うステージ内容を作り、作業ツリーの別件差分は残す。`git hash-object -w --stdin --path=grade34/index.html` と `git update-index --cacheinfo` を使う場合、ステージ版と作業版を両方確認する。他の別件ファイルはstageしない。
- [ ] **Step 7** `git diff --cached --check` と `git diff --cached --name-only` が今回の範囲だけであることを確認し、統合結果をコミットする。最終レビューの対象範囲は公開済み `1f5b4ab` から今回HEADまで。設計・計画と機能コミットをまとめて通常の `git push origin HEAD:main` で公開し、forceは使わない。remote更新競合は勝手に上書きしない。
- [ ] **Step 8** 既存 `node check-pages-deployment.cjs` で対象コミットのPages build完了を確認する。必要時のみ既存の `--request` を使い、認証情報は表示しない。確認間隔を空け、未完了を公開済みと言わない。
- [ ] **Step 9** 公開URLのLT2 Unit5からタイル、文④、WORDS、配信欄を実際に開く。架空名簿から発行して別ブラウザcontextで受信・操作・reload復元を確かめる。公開サイトを開いただけで名簿は共有されないことも確認する。
- [ ] **Step 10** 利用者へ公開URL、配信の手順、既存から再利用したもの・BINGO専用に追加したもの、未確認の実機条件を簡潔に報告する。実児童名簿を使ったGoogle Classroom投稿や紙への確定印刷は行わない。

## 順序と実行方式

Task 7 Step 1のベースライン確認後、1→2→3→4→5→6→7を基本とする。Task 5の名簿と教師UI、Task 6のタイルは責任範囲が独立しているが、共有モジュールの契約が確定してから分担する。build・Git・公開操作の担当は1人に固定する。

推奨は分担実装方式。児童名簿と途中保存を扱うため、各Taskを別の視点で確認してから統合する。もう一つは主担当が順に実装して最後に独立レビューする方式で、引き継ぎは少ないが途中の独立確認は減る。利用者が計画を確認し、方式を選んでから着手する。
