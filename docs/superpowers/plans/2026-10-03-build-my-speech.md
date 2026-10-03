# BUILD MY SPEECH Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** NHE6 Unit5の児童が専用URLから作文・保存・スピーチ練習でき、次のUnitをプリセット追加で対応できるBUILD MY SPEECHを実装する。

**Architecture:** 既存の文カード・音声・短縮形の処理を小さく共通化し、従来のSentencePlayerの外部APIと教材を維持する。新しい児童ページは共通モデル、保存、Slot入力、まとめ表示を組み合わせ、NHE6 Unit5の文・候補はプリセットに分離する。端末内保存のみを使う。

**Tech Stack:** 既存の静的HTML / CSS / JavaScript、localStorage、Speech Synthesis、Node.js assert/vm、既存Playwright・Chrome。新しいnpm依存・フレームワークを追加しない。

**Spec:** [承認済み設計書](../specs/2026-10-03-build-my-speech-design.md)

**Status:** 設計書は2026-10-03に承認済み。本計画のレビューと実行方法の選択を待つ。下記のコード・テストはまだ実装していない。

## Global Constraints

- 児童ページ：grade56/build-my-speech.html?book=nh6&unit=5。
- ヘッダー：NHE6 Unit 5 / Where is it from? / BUILD MY SPEECH。戻る・ホームボタンは付けない。
- 教師用Creator、AI添削・翻訳・文法推論、Supabase、クラウド同期、他Unitの教材本文は実装しない。
- SentencePlayerのmarkup / attach / settings / stop / openForCardsを維持する。
- 役割色・カード比率は既存sentence-player.cssを利用。新規の役割色を追加しない。
- 短縮形長押し550ms、復帰3000ms。既存の展開語や色を変更しない。
- 読み上げ速度0.55 / 0.85 / 1.20、区切り読みの間隔360msを既存から再利用する。
- 基準サイズ1366×768、1280×720。1280×600でも確認する。
- MY WORDSは200文字上限、空白だけの入力は不可。IME確定中のEnterで登録しない。
- 保存キーdekiru:build-my-speech:v1:nh6:5。既存の語彙・Interview等のキーと混ぜない。
- データ・処理・画像は同梱資産。外部API・新規フォント取得なし。
- sources配下は読み取り専用。既存の未公開変更を混ぜず、GitHubへは今回は送信しない。
- 承認済み画像はそのまま使用し、作り直し・シルエット制作は行わない。
- プリセットの文中表記はinsertTextで指定。国名の冠詞・名詞の単複・前置詞をエンジンで推論しない。

## Review Focus

- 編集途中で再読み込み・IME確定・キャンセル：入力中の文字を消さず、未確定文を作文へ混ぜない。Task 4・5で検証する。
- 複数文variantと任意項目のOFF/ON：隠れた文の位置・入力を保ち、再採用で二重登録しない。Task 2・6で検証する。
- 長い国名・200文字のMY WORDS・代替画像：小さい画面で操作領域を押し出さず、文字を欠落させない。Task 5・7で検証する。
- 古い・壊れた保存内容、保存容量不足：元データを失わず、保存成功を偽表示しない。Task 4で検証する。
- 連続Step切替・音声中の再描画・長押し中の離脱：古い音声、タイマー、ハイライト、イベントを残さない。Task 1・5・6で検証する。

---

## 作業場所と変更ファイル

作業ディレクトリはプロジェクト直下のinterview_work。以下のソース・試験パスはすべてそこからの相対パス。Gitのルートはrelease_repoで、公開用ビルド成果物と設計・計画文書を管理している。

既にfeature/interview-phase1のリンク済み作業ツリーを使用中。実行開始時にusing-git-worktreesの手順で確認し、新規作成はしない。ベースには設計書コミット17b61afがある。

| ファイル | 責務 |
| --- | --- |
| grade34_site/sentence-cards.js（新規） | 既存由来の文カード・文行HTML、長押しのイベント、文字フィット |
| grade34_site/sentence-audio.js（新規） | 既存由来の音声・速度・区切り読み・停止 |
| grade34_site/sentence-player.js、index.html | 共通部品を呼ぶ薄いアダプターと読み込み順のみ変更 |
| grade56_site/speech-model.js（新規） | プリセット検証、状態更新、文の解決、リセット、文順 |
| grade56_site/speech-catalog.js（新規） | 既存カード・画像・国名検索へのアダプター |
| grade56_site/speech-presets.js（新規） | NHE6 Unit5の明示的な教材データと登録表 |
| grade56_site/speech-store.js（新規） | localStorageの読み込み・検証・退避・保存 |
| grade56_site/speech-inputs.js（新規） | Slot別のカード・リスト・国名・MY WORDS入力 |
| grade56_site/speech-summary.js（新規） | 一つの文順によるまとめ・４線・並べ替え・音声 |
| grade56_site/build-my-speech.js、html、css（新規） | 専用ページ、状態接続、左メニュー、文表示、全画面 |
| grade56_site/assets/build-my-speech/*.png（新規４枚） | design / size / texture / material |
| grade56_site/app.js、index.html | 当該UnitのMake Sentencesに入口とプリセット登録表の読み込みを追加 |
| grade34_site/test-speech-*.cjs、speech-test-support.cjs、fixtures/speech-fixture.cjs（新規） | 既存試験ランナーが収集する単体・ブラウザ試験 |
| docs/superpowers/plans/2026-10-03-build-my-speech-results.md（新規） | 実施結果、画像確認、未確認事項の記録 |

build.cjs、build-preview.cjsは既存のコピー・参照変換で新規ファイルを扱える。変更が必要なのは実際のビルド検証で不足が見つかった場合だけとする。

### 検証と保存の共通手順

- 単体試験はNodeのassertを使い、IIFEをvmのwindow内へ読み込む既存方式。DOM不要のモデル・プリセット・保存は純粋関数で試せるようにする。
- ブラウザ試験はgrade34_site/interview-test-helper.cjsのsetup()を使用する。base / grade / senior / gamesは返却値を使う。
- 各Taskで失敗する新テストを実行し、失敗理由が意図どおりであることを記録してから実装する。
- 各Task検証後に該当ビルドを行い、release_repo内の当該ファイルのみをコミットする。テスト・作業用ソースは既存方式に合わせ作業フォルダに保持する。
- grade34/index.htmlには既存の別変更がある。新規script読み込みと今回変更した依存のハッシュだけを非対話のindexパッチで選択的に記録し、既存のsentence-unitsハッシュ等を巻き込まない。
- 実行前後のgit diffを確認する。広範なgit addやcheckout/resetはしない。共有変更を分離できない場合は先に報告する。

PowerShellでの新機能の全試験コマンド（interview_workで実行、いずれか非ゼロ終了なら停止）：

```powershell
$env:PLAYWRIGHT_PATH = 'C:/Users/withc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
Get-ChildItem -LiteralPath grade34_site -Filter 'test-speech-*.cjs' | ForEach-Object {
    & node $_.FullName
    if ($LASTEXITCODE -ne 0) { throw "Test failed: $($_.Name)" }
}
```

## 共通データ契約

- Choice：id、label、insertText、category、任意のimageUrl/cardRef/speechText/audioUrl。
- Selection：kind（choice / custom / detached）、id、label、insertText、任意のimageUrl/speechText。custom削除時はdetachedへ変え、作文中のテキストを保持する。
- Preset：schemaVersion:1、unitId、book、unit、title、steps、slots、choiceSets、contractions。stepsは表示順の配列とする。
- Step：id、label、required、sentences配列。必要ならvariants配列とdefaultVariantIdを持つ。
- Slot：id、ownerStepId、inputType、defaultValue（Selection）、choiceSetId、myWordsGroupId、allowMyWords、hint。inputTypeはpicture-card / country-search / list / my-words。参照専用はTokenのeditable:falseで表し、別の保存Slotを作らない。
- Sentence：id、tokens配列、punctuation。variant内で同じ文の位置を示すidは維持できる。
- Token：roleと、固定word/cardRef、またはslotId/editableを持つ。全Tokenを解決してから表示・読み上げへ渡す。
- State：schemaVersion:1、unitId、slotValues、stepVariants、optionalEnabled、sentenceOrder、myWords、drafts、ui。
- Result：更新成功は{ok:true,state}、拒否は{ok:false,state,error}。入力エラーを黙って初期値に変えない。
- ResolvedSentence：id、stepId、tokens、text、parts。３つのまとめモードは同じ配列を受け取る。
- ResolvedToken：word、role、speech、任意のcardId/imageUrl/symbol、編集可能時だけselectionKey=slotId。wordはinsertText、speechはspeechTextまたはinsertText。共通描画部品への入力は既存Tokenと同じ形に揃える。
- ui：stepId、slotId、filters、rate、sound、clearSpeech、zoomPercent（nullは自動フィット）、summaryWriting、summaryAudio、summaryReordering、inputOpen。全画面状態は保存せず同一セッションのみ保持し、再起動時には通常表示から開始する。

## Task 1 文カードと音声を既存挙動のまま共通化

**Files:** Create grade34_site/sentence-cards.js、sentence-audio.js、test-speech-common.cjs、speech-test-support.cjs。Modify grade34_site/sentence-player.js、index.html。

**Interfaces:**
- SentenceAudio.create({root,getRate,getEnabled,resolveAudio,onError}) → {speak(text,element),sentence(text,parts,element,segmented),sequence(items),stop(),dispose()}。itemsは{text,parts,element,segmented}の配列。
- resolveAudio(text)は同梱録音URLまたはnullを返す。指定のない語・文はSpeech Synthesisへ回す。画像用語の録音URLはカタログ側で解決し、音声部品にUnit固有データを入れない。
- SentenceCards.create({root,resolveImage,iconUrl,audio,contractions,onSelect}) → {card(token),row(tokens,punctuation,extraClass,spacerPositions),bind(stage),fit(stage,zoomPercent=null),dispose()}。resolveImage(token)は検証済みimageUrlまたはcardIdから画像を解決。fitはnullなら自動、数値なら既存playerと同じ拡大率と範囲を使用する。
- SentenceCards.TIMING={hold:550,restore:3000}。既存selectionKey/data-talk属性を維持し、onSelect(selectionKey,role)で選択を通知。
- speech-test-support.cjs：loadScripts(paths,globals) → window相当、withPage(testBody) → Promise。withPageはsetup()とfinallyのclose()を包む。

- [ ] **Step 1 テスト追加**：既存画面の代表カードHTML・role・data-talk属性を保存して比較。新共通部品に対し次をassertする。新ファイルがないため最初は読み込みに失敗する。
  `assert.deepEqual(api.TIMING,{hold:550,restore:3000})`
  `assert.equal(escaped.includes('<img src=x onerror='),false)`
  `assert.equal(spoken[0].rate,0.85)`
  `assert.deepEqual(segmented,['I',"don't",'like','red.'])`
  `assert.equal(activeHighlightsAfterDispose,0)`
  パーツ展開・pointercancel・短時間タップ・dispose後のタイマー不実行も検証する。
- [ ] **Step 2 RED**：node grade34_site/test-speech-common.cjs。新APIがないことによる失敗を確認。
- [ ] **Step 3 実装**：既存のtalkCardMarkup / talkRowMarkup / 音声 / 短縮形処理を移す。旧playerは既存選択状態・教材・公開APIを維持し、新APIへ委譲。画像・アイコンURLを引数化し、音声・イベントはrootとインスタンスに閉じる。
- [ ] **Step 4 GREEN**：新試験とnode grade34_site/test-sentences-browser.cjs、test-unit5-sentences.cjs、test-possession-browser.cjs、test-interview-sentences-browser.cjsを実行。PLAYWRIGHT_PATHは既存ランナーと同じ同梱パスを環境変数で指定する。全てexit 0、旧英文・選択・戻る・全画面が不変。
- [ ] **Step 5 チェックポイント**：grade34_site/build-preview.cjsを実行し、grade34/sentence-cards.js、sentence-audio.js、sentence-player.jsとindex.htmlの今回分だけを記録。commit: refactor: share sentence cards and audio without changing lessons。

## Task 2 汎用の作文モデル

**Files:** Create grade56_site/speech-model.js、grade34_site/fixtures/speech-fixture.cjs、test-speech-model.cjs。

**Interfaces:**
- SpeechModel.validatePreset(preset) → string[]、initialState(preset) → State。
- SpeechModel.reduce(preset,state,action) → Result。
- SpeechModel.stepSentences(preset,state,stepId) → ResolvedSentence[]、summary(preset,state) → ResolvedSentence[]。
- SpeechModel.editableSlots(preset,state,stepId) → Slot[]、reconcile(preset,saved) → {state,warnings:string[]}。
- Action.type：select / variant / optional / reset-step / move-sentence / add-word / delete-word / draft / ui。データはそれぞれslotId+selection、stepId+variantId、stepId+enabled、stepId、sentenceId+targetIndex、slotId+text+id、groupId+id、slotId+field+text、patchを持つ。move-sentenceのindexは現在採用中の文列基準。

- [ ] **Step 1 テスト追加**：fixtureは必須２Step＋任意２Step、共有国名、２文variantを含める。次をassertする。
  `assert.equal(after.slotValues.nearbyCountry.insertText,before.slotValues.nearbyCountry.insertText)`
  `assert.equal(summaryAfterToggleOffAndOn.map(s=>s.id).join(','),originalOrder.join(','))`
  `assert.equal(afterDelete.slotValues.target.insertText,'koalas')`
  必須項目のOFF拒否、referenceへの直接select拒否、他Stepを変えないreset、variant往復の入力保持、二重ID検出、複数文順序、新Step追加、200/201文字境界を固定する。
- [ ] **Step 2 RED**：node grade34_site/test-speech-model.cjs。新モデル未存在による失敗を確認。
- [ ] **Step 3 実装**：全処理はプリセットと状態だけを参照。selectは入力型・候補所属を検証し、Slot参照を解決。optionalの初採用は末尾へ追加、OFFでは順序IDを削除しない。moveは採用中のIDだけを並べ替え、非採用IDを保つ。resetはownerStepIdで対象を決める。
- [ ] **Step 4 GREEN**：モデル試験exit 0。同じ処理が異なるunitIdと複数文fixtureで動き、nh6やP番号による条件分岐がないことを確認。
- [ ] **Step 5 チェックポイント**：grade56_site/build.cjs、grade56/speech-model.jsのみ記録。commit: feat: add reusable speech composition model。

## Task 3 NHE6 Unit5プリセットと承認画像

**Files:** Create grade56_site/speech-catalog.js、speech-presets.js、assets/build-my-speech/{design,size,texture,material}.png、grade34_site/test-speech-preset.cjs。

**Interfaces:**
- SpeechCatalog.create({data,source,countries,search,sourceBase,assetBase}) → {card(id,overrides),findCountries(query),country(id),imageUrl(ref)}。
- SpeechPresets.get(book,unit,catalog) → Preset|null、list() → {book,unit,title}[]。
- 登録表はfactory関数とメタデータを保持する。読み込み時およびlist()ではcatalogやModelを呼ばず、get()で初めて教材を組み立てる。Unit一覧側も同じlist()を使い、対応表を二重管理しない。
- card(id,overrides)は存在しない画像参照を明示的に検出。imageUrlは既存CardSet.sourceの相対パスをsourceBase基準で正規化し、新規４枚はassetBase基準にする。
- 国名Choiceのidは既存データのid。searchはWorldSearch.find。地域Choiceはasia / europe / africa / north-america / south-america / oceania / antarctica。

- [ ] **Step 1 テスト追加**：８Step・４必須・３variant、初期文、６種類favorite、参照と独立Slot、全文テンプレートをassertする。
  `assert.equal(SpeechPresets.get('nh6',8,catalog),null)`
  `assert.equal(preset.title,'Where is it from?')`
  `assert.deepEqual(preset.choiceSets.favoriteAspect.map(c=>c.id),['color','shape','design','size','texture','material'])`
  `assert.equal(catalog.findCountries('べとなむ')[0].insertText,'Vietnam')`
  日本/にほん/ニホン、あめりか、英語、未知検索も確認。shoes/scissorsのinsertText、４画像の元ファイルとのSHA256一致を確認する。
- [ ] **Step 2 RED**：node grade34_site/test-speech-preset.cjs。新プリセット未存在で失敗することを確認。
- [ ] **Step 3 実装**：設計書６節をそのままデータ化。Step idはbelonging/origin/region/nearby/acquisition/favorite/visit-origin/do-there、sentence idは各stepId+'.main'。モデルは変更せず、category/role/insertTextをデータに置く。
  カード：T-shirt=clothes_002、color=color_000、shape=shape_000、mother=family_005、father=family_004、brother=family_009、sister=family_011、friend=person_013、see=action5_018、eat=action5_021、buy=action5_022、visit=action6_012、mall=town_037。
  belongingはclothes_001～020、stationery_001～016、item_001～061を画像確認済みの明示的な候補表にする。clothes_006/007/010/011/012/018/019、stationery_009、item_005は個別にpair ofのinsertTextを指定。画像なしは候補から外し、カテゴリ見出しカードとyenは入れない。
  国名の冠詞は明示的対応表とする。７地域と各ヒント、初期値は設計書どおり。
- [ ] **Step 4 画像配置**：image_output/build_my_speechのdesign-overlap.png、size-sml-overlap.png、texture-simple.png、material-four-panels.pngを公開用ファイル名へコピー。既存の拒否されたtexture.pngを使わない。
- [ ] **Step 5 GREENと記録**：プリセット試験exit 0、全候補の画像存在・正しい英文を確認。grade56ビルド後、catalog、presets、４画像のみ記録。commit: feat: add NHE6 Unit5 speech preset and approved artwork。

## Task 4 端末保存と復元

**Files:** Create grade56_site/speech-store.js、grade34_site/test-speech-store.cjs。

**Interfaces:**
- SpeechStore.create({storage,now}) → {key(book,unit),load(preset),save(preset,state)}。
- load → {state,status:'new'|'saved'|'recovered'|'blocked',message}。save → {ok,message}。
- loadはModel.reconcileを利用。破損原文の退避キーは本キー+':backup:'+now()。退避失敗・storage拒否時には本キーへ書き込まない。

- [ ] **Step 1 テスト追加**：Map実装のstorageと例外を投げるstorageで次を固定する。
  `assert.equal(store.key('nh6',5),'dekiru:build-my-speech:v1:nh6:5')`
  `assert.deepEqual(store.load(preset).state.drafts,saved.drafts)`
  `assert.equal(blockedStore.save(preset,state).ok,false)`
  国名・MY WORDS・順序・variant・uiが戻ること、Unit混在拒否、変更したラベルでは値が消えないことを確認。壊れたJSON・新しすぎるschemaは原文退避後のみ新規保存。退避の容量不足時も元文字列が残ることをassertする。
- [ ] **Step 2 RED**：node grade34_site/test-speech-store.cjs。新ストア未存在の失敗を確認。
- [ ] **Step 3 実装**：保存をUIから分離。storage取得自体の例外も扱い、失敗時はメモリ内Stateを維持。旧語彙・Interviewキーに触れない。load失敗直後にUI初期化処理で元データを上書きさせない。
- [ ] **Step 4 GREEN**：保存試験exit 0、他機能のstorage値が完全一致することを確認。
- [ ] **Step 5 チェックポイント**：grade56ビルド後、grade56/speech-store.jsのみ記録。commit: feat: persist unit speech drafts safely。

## Task 5 専用児童ページとSlot入力

**Files:** Create grade56_site/build-my-speech.html、build-my-speech.js、build-my-speech.css、speech-inputs.js、grade34_site/test-speech-editor.cjs、test-speech-inputs.cjs、test-speech-lifecycle.cjs。

**Interfaces:**
- SpeechInputs.mount(root,{preset,getState,catalog,dispatch}) → {render(slotId),dispose()}。
- dispatch(action) → Result。成功時にStore.saveを呼び、表示・保存ステータスを更新する。
- SpeechEditor.mount(root,{preset,catalog,store}) → {getState(),dispatch(action),dispose()}。入口JSはURLを厳格に解決してmountする。
- rootのdata属性：data-speech-step、data-speech-optional、data-speech-slot、data-speech-choice、data-speech-inputs、data-speech-status、data-speech-stage、data-speech-fullscreen。値にはstable idを使用する。

- [ ] **Step 1 テスト追加**：setup()からsenior/build-my-speech.html?book=nh6&unit=5を開く。８項目、必須番号４つ、戻るボタンなし、公式タイトル、role色、Slot初期選択をassertする。カード選択・regionリスト・３variant・国名検索と連動・nearby独立をUIから操作する。
- [ ] **Step 2 RED**：node grade34_site/test-speech-editor.cjs。ページ未存在による失敗を確認。
- [ ] **Step 3 ページ実装**：ヘッダー＋左右領域＋既存talk-*の文表示。依存順はdata/app-data→必要な既存画像リンク→card-set→countries/search→sentence-audio/cards→model/catalog/presets/store→inputs→summary（Task 6で追加）→入口JS。既存ページ全体のイベントを持つsentence-player.jsは新ページに読み込まない。
- [ ] **Step 4 入力テスト追加とRED**：test-speech-inputs.cjsで、固定左端の追加ボタン、横スクロール、６画像候補、語群別MY WORDS、IME Enter、200文字入力、201文字拒否、cancel後のdraft復元、検索ゼロ件、MY WORDS削除確認を操作。初期未実装の動作で失敗を確認。
- [ ] **Step 5 入力実装**：input型で描画を切替。選択値と検索/draftを分離し、毎input保存。テキストはtextContentまたはescapeして表示。追加・削除はModelのactionを通す。imageBaseは固定同梱URLのみとする。
- [ ] **Step 6 ライフサイクルテスト追加とRED**：test-speech-lifecycle.cjsで長押し後すぐStep変更、音声中のカード再選択、再読み込み、全画面解除を行い、古い表示・音声が戻らないことをassert。保存拒否時の文維持と失敗ステータス、全画面API拒否時のアプリ内拡大、拡大率変更、参照だけのStepのリセット無効化も含める。
- [ ] **Step 7 レイアウトと破棄処理実装**：最上位は100dvh、左内部スクロール、右はauto/minmax(0,1fr)/auto。全文字が収まるフィットと必要な内部スクロールを設け、長文を黙って省略しない。fullscreenchange/Escape/resizeで状態維持。再描画前に音声・文カードbindingsを破棄する。
- [ ] **Step 8 GREENと記録**：３試験全てexit 0。指定３viewportでスクリーンショットと要素境界を確認。grade56ビルド後、今回のhtml/js/css/inputだけ記録。commit: feat: add pupil speech editor and slot inputs。

## Task 6 まとめ 文順 ４線 発音

**Files:** Create grade56_site/speech-summary.js、grade34_site/test-speech-summary.cjs。Modify build-my-speech.js、html、css。

**Interfaces:**
- SpeechSummary.mount(root,{preset,getState,dispatch,audio}) → {render(),dispose()}。
- 読み上げ・通常・４線はすべてSpeechModel.summaryの同じ結果を使う。文ブロックにdata-speech-sentence=sentenceIdを付ける。
- 順序移動はModelのmove-sentence、モード切替はui action、任意項目はoptional actionで保存する。

- [ ] **Step 1 テスト追加とRED**：node grade34_site/test-speech-summary.cjs。任意２文を追加し、↑↓とdragで移動後のID列を保存する。通常→４線→音声→再読み込みで同じID列とtextになることをassert。OFF→ONで同じ位置に戻り、文内容は消えないことを確認。未実装のまとめで失敗を確認する。
- [ ] **Step 2 まとめ実装**：英文テキスト、３モードボタン、並べ替えと完了。隠れた文はレンダリングから除外するだけ。音声sequenceへ同一ResolvedSentence列を渡し、並べ替え中は不要な音声操作を隠す。
- [ ] **Step 3 ４線実装**：同梱assets/Andika-Regular.ttfを使用。--writing-fontと４線の位置変数を定義し、基線のピンクと他３線の水色を指定。200文字文の折り返しを含めて行ごとに４線を表示し、フォント差替え点をCSSに注記する。
- [ ] **Step 4 音声試験と実装**：テストではOS音声境界だけを観測し、全文順・１文・速度・停止・モード切替時のcancelをassert。実音声を確認できるブラウザでも再生を確認し、不可能ならその範囲を記録。音声非対応・onerrorでは案内を表示する。
- [ ] **Step 5 GREENと記録**：summary試験とmodel/store試験がexit 0。４線と発音同時ON、並べ替え中の非表示、最後の行までの内部スクロールを確認。grade56ビルド後、summaryと接続ファイルのみ記録。commit: feat: add saved speech summary writing and rehearsal。

## Task 7 Unit入口 公開用ビルド 回帰確認

**Files:** Modify grade56_site/app.js、index.html。Create grade34_site/test-speech-links.cjs、test-speech-layout.cjs、release_repo/docs/superpowers/plans/2026-10-03-build-my-speech-results.md。

**Interfaces:** index.htmlでspeech-presets.jsをapp.jsより前に読み込み、Make SentencesはSpeechPresets.list()の対応Unit表から入口を出す。Task 3の遅延factoryによりUnitメニューでは教材生成や専用ページ用の依存読み込みをしない。他メニューのbodyや語彙選択状態を置き換えない。

- [ ] **Step 1 テスト追加とRED**：links試験でNHE6 Unit5から専用ページへ移動、未対応Unitの入口非表示、戻るなし、Grade5&6の発音練習・保存セット・既存Activities維持を確認。layout試験では３viewport、最長候補、200文字MY WORDS、全画面、summary全任意ONを確認。入口未実装で失敗することを確認。
- [ ] **Step 2 入口実装**：app.jsのrenderUnitのMake Sentences本文にリンクを追加。hrefはソース用grade56_site内の専用ページ相対URLとし、ビルド後も同じ階層で解決する。
- [ ] **Step 3 ソース検証**：node grade34_site/test-speech-links.cjs、test-speech-layout.cjsと共通手順の全試験コマンドを実行。console/pageerrorなし、画像naturalWidth>0、ボタン境界とページ縦スクロールをassert。Tab・Enter・Spaceで項目移動・採否・カード選択ができ、フォーカスが見えることも確認。スクリーンショットをqa/build-my-speechへ保存して実見する。
- [ ] **Step 4 ビルド**：node grade34_site/build-preview.cjs、node grade56_site/build.cjsの順で実行。新共通JSが書き出されてからgrade56の依存ハッシュを生成する。既存gamesの国名データは変更しない。
- [ ] **Step 5 公開形検証**：PowerShellで$env:INTERVIEW_BUILT='1'を設定して全test-speech-*.cjsを再実行後、Remove-Item Env:INTERVIEW_BUILT。source側パスが残っていない、全新JS/CSS/PNG/fontが404にならない、iframeではない直接URLで動くことを確認。
- [ ] **Step 6 回帰**：node run-classroom-tests.cjsを実行。新試験はgrade34_site/test*.cjsから自動収集される。全体結果のfailed:[]を確認。失敗があれば原因を切り分け、今回の変更で起きたものを修正し、再実行する。既存の既知不安定試験を無断で緩めない。
- [ ] **Step 7 記録とレビュー**：結果文書に実際のコマンド・件数・スクリーンショット・実音声確認範囲・未解決点を書く。実行方法に対応したコードレビューを行う。公開形diffを見直し、画像・本文・依存ハッシュが今回の範囲内であることを確認。
- [ ] **Step 8 最終チェックポイント**：検証済みの入口・ビルド成果物・結果文書のみ記録。commit: feat: connect and verify BUILD MY SPEECH for NHE6 Unit5。ローカル確認URLを案内し、GitHubへのpush・公開は別途依頼を受けてから行う。

## 計画の自己確認

- 設計書1～4節：Task 1・5・7で既存再利用、専用URL、入口、責務分離。
- 5～7節：Task 2・3で汎用データ、全Step・variant、６候補と４画像。
- 8～10節：Task 4・5で編集・各入力型・MY WORDS・国名・保存・リセット。
- 11節：Task 2・6で一つの文順、採否復帰、４線、並べ替え、発音。
- 12～13節：Task 1・5・7でレイアウト、アクセシビリティ、破棄処理、ビルド・回帰。
- Review Focusの５項目には、それぞれ上記Taskの失敗条件を固定するテストを割り当てた。
- 新規API名はこの計画内で統一。選択はChoiceからSelectionへ変換し、保存・画面・まとめで同じModelを使用する。

## 実行方法の選択

推奨は、このセッションの担当がTask 1から順に実装する方式（Native）。共通部品・モデル・画面の依存が強く、同じ担当が接続を確認しながら進めやすい。最後に独立したレビューを行う。

別案はTaskごとに担当とレビューを分ける方式（Subagent-driven）。途中ごとの独立確認が増える一方、各担当への引き継ぎとレビュー回数が増える。

ユーザーに本計画の確認と実行方法を選んでもらってから、対応する実行スキルへ進む。
