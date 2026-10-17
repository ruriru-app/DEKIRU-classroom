(function () {
  'use strict';

  const Core = window.MemorizeCore;
  const root = document.querySelector('#memorize-app');
  if (!root) return;

  const elements = {
    form: document.querySelector('#manuscript-form'),
    input: document.querySelector('#manuscript-input'),
    importButton: document.querySelector('#manuscript-import'),
    toggle: document.querySelector('#manuscript-toggle'),
    summary: document.querySelector('#manuscript-summary'),
    difficulty: document.querySelector('#difficulty-picker'),
    status: document.querySelector('#app-status'),
    progress: document.querySelector('#stage-progress'),
    repractice: document.querySelector('#repractice-button'),
    scroller: document.querySelector('#practice-scroller'),
    empty: document.querySelector('#practice-empty'),
    range: document.querySelector('#practice-range'),
    grid: document.querySelector('#sentence-grid'),
    resultText: document.querySelector('#recognition-text'),
    resultMessage: document.querySelector('#recognition-message'),
    action: document.querySelector('#practice-action-button'),
    hint: document.querySelector('#hint-button'),
  };

  if (!Core || Object.values(elements).some((element) => !element)) {
    root.textContent = '教材を読み込めませんでした。必要なファイルを確認してください。';
    return;
  }

  const STORAGE_KEY = 'dekiru:memorize-my-speech:v1';
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const DIFFICULTY_LABELS = Object.freeze({ beginner: '初級', intermediate: '中級', advanced: '上級' });
  const SPEAKER_ICON = '../grade34/assets/ui/originals/読み上げボタン.svg';
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');

  let state = null;
  let statusMessage = '英文を貼り付けてください。';
  let resultFeedback = '';
  let storageAvailable = true;
  let recognizer = null;
  let stopRequested = false;
  let recognitionError = '';
  let finalResults = new Map();
  let lastStageKey = '';
  let resizeFrame = 0;

  function currentStages() {
    return state?.stagesByDifficulty[state.selectedDifficulty] || [];
  }

  function currentStage() {
    return currentStages().find(({ id }) => id === state?.selectedStageId) || null;
  }

  function isRecognitionBusy() {
    return state?.recognitionState === 'listening' || state?.recognitionState === 'stopping';
  }

  function progressValue() {
    return {
      schemaVersion: 1,
      fingerprint: state.fingerprint,
      completed: {
        beginner: [...state.completed.beginner],
        intermediate: [...state.completed.intermediate],
        advanced: [...state.completed.advanced],
      },
    };
  }

  function readStoredProgress() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === null) return { value: undefined, damaged: false };
      try {
        return { value: JSON.parse(raw), damaged: false };
      } catch (_) {
        return { value: {}, damaged: true };
      }
    } catch (_) {
      storageAvailable = false;
      return { value: undefined, damaged: false };
    }
  }

  function saveProgress() {
    if (!state || !storageAvailable) return false;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progressValue()));
      return true;
    } catch (_) {
      storageAvailable = false;
      statusMessage = 'この端末にはクリア記録を保存できません。この画面では続けられます。';
      return false;
    }
  }

  function cancelSpeech() {
    try { window.speechSynthesis?.cancel(); } catch (_) { /* Continue without speech controls. */ }
  }

  function applyLayout() {
    if (!state || elements.range.hidden) return;
    const availableWidth = Math.max(0, elements.scroller.clientWidth - 40);
    const layout = Core.layoutFor(state.sentences.length, availableWidth);
    elements.grid.style.setProperty('--columns', String(layout.columns));
    elements.grid.style.setProperty('--rows', String(layout.rows));
    elements.range.dataset.columns = String(layout.columns);
    elements.range.dataset.writingLines = String(layout.writingLines);
  }

  function scrollCurrentRange() {
    const behavior = reducedMotion?.matches ? 'auto' : 'smooth';
    const target = elements.grid.querySelector('.sentence-card[data-active="true"]');
    if (!target) return;
    const scrollerRect = elements.scroller.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const top = Math.max(0, elements.scroller.scrollTop + targetRect.top - scrollerRect.top - 10);
    try { elements.scroller.scrollTo({ top, left: 0, behavior }); }
    catch (_) { elements.scroller.scrollTop = top; }
  }

  function renderDifficulty() {
    const busy = isRecognitionBusy();
    elements.difficulty.querySelectorAll('[data-difficulty]').forEach((button) => {
      const selected = button.dataset.difficulty === state?.selectedDifficulty;
      button.setAttribute('aria-pressed', String(selected));
      button.disabled = !state || busy;
    });
  }

  function renderProgress() {
    elements.progress.replaceChildren();
    if (!state) {
      elements.repractice.hidden = true;
      return;
    }
    const busy = isRecognitionBusy();
    const cleared = new Set(state.completed[state.selectedDifficulty]);
    const stages = currentStages();
    const progress = Core.progressSegments(stages);
    const segmentById = new Map(progress.segments.map((segment) => [segment.id, segment]));
    elements.progress.style.setProperty('--progress-units', String(Math.max(1, progress.totalUnits)));
    for (const stage of stages) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.stageId = stage.id;
      button.dataset.cleared = String(cleared.has(stage.id));
      button.style.setProperty('--stage-units', String(segmentById.get(stage.id)?.units || 1));
      button.setAttribute('aria-current', stage.id === state.selectedStageId ? 'step' : 'false');
      button.setAttribute('aria-label', `${stage.label}${stage.id === state.selectedStageId ? '、取り組み中' : ''}${cleared.has(stage.id) ? '、クリア済み' : ''}`);
      button.title = stage.label;
      button.disabled = busy;
      const marker = document.createElement('span');
      marker.className = 'stage-marker';
      marker.setAttribute('aria-hidden', 'true');
      marker.textContent = cleared.has(stage.id) ? '✓' : '';
      button.append(marker);
      elements.progress.append(button);
    }
    elements.repractice.hidden = !state.difficultyComplete;
    elements.repractice.disabled = busy;
  }

  function renderPractice() {
    const stage = currentStage();
    elements.grid.replaceChildren();
    elements.empty.hidden = Boolean(stage);
    elements.range.hidden = !stage;
    if (!stage) return;

    const revealActive = state.attemptState === 'hint-open';
    const speakerEnabled = revealActive && state.recognitionState === 'idle' && Boolean(window.speechSynthesis);
    const presentation = Core.sentencePresentation(
      state.sentences,
      currentStages(),
      state.completed[state.selectedDifficulty],
      state.selectedStageId,
    );
    const attemptMatches = new Set(state.lastSentenceMatches || []);
    presentation.forEach(({ sentence, index: sourceIndex, active, cleared }) => {
      const attemptMatched = active && attemptMatches.has(sentence.id);
      const cardView = Core.sentenceCardView({
        index: sourceIndex,
        active,
        cleared,
        attemptMatched,
      }, revealActive);
      const card = document.createElement('article');
      card.className = 'sentence-card';
      card.dataset.sentenceId = sentence.id;
      card.dataset.active = String(active);
      card.dataset.cleared = String(cleared);
      card.setAttribute('aria-current', active ? 'step' : 'false');

      const meta = document.createElement('div');
      meta.className = 'sentence-meta';

      const number = document.createElement('span');
      number.className = 'sentence-number';
      number.textContent = cardView.numberLabel;

      const check = document.createElement('span');
      check.className = 'sentence-check';
      check.dataset.checked = String(cardView.checked);
      check.setAttribute('role', 'img');
      check.setAttribute('aria-label', cleared ? 'クリア済み' : attemptMatched ? '今回言えた文' : '未クリア');
      check.textContent = cardView.checked ? '✓' : '';
      meta.append(number, check);

      const speaker = document.createElement('button');
      speaker.type = 'button';
      speaker.className = 'sentence-speaker';
      speaker.dataset.sentenceId = sentence.id;
      const speakerIcon = document.createElement('img');
      speakerIcon.src = SPEAKER_ICON;
      speakerIcon.alt = '';
      speaker.append(speakerIcon);
      speaker.disabled = !speakerEnabled || !active;
      speaker.setAttribute('aria-label', revealActive && active ? `${sourceIndex + 1}文目を読む` : `${sourceIndex + 1}文目の音声（英文を確認すると使えます）`);

      const text = document.createElement('p');
      text.className = 'sentence-text';
      text.lang = 'en';
      text.textContent = sentence.text;
      text.hidden = !cardView.revealed;

      card.append(meta, speaker, text);
      elements.grid.append(card);
    });

    applyLayout();
    const stageKey = `${state.selectedDifficulty}:${state.selectedStageId}`;
    if (stageKey !== lastStageKey) {
      lastStageKey = stageKey;
      window.requestAnimationFrame(scrollCurrentRange);
    }
  }

  function renderResult() {
    elements.resultMessage.dataset.kind = '';
    if (!state) {
      elements.resultText.lang = 'ja';
      elements.resultText.textContent = 'まだ記録はありません。';
      elements.resultMessage.textContent = '';
      return;
    }
    if (state.recognitionState === 'listening') {
      elements.resultText.lang = 'ja';
      elements.resultText.textContent = '認識中の文字は表示しません。';
      elements.resultMessage.textContent = '聞いています。話し終わったら「できた！」を押してください。';
      return;
    }
    if (state.recognitionState === 'stopping') {
      elements.resultText.lang = 'ja';
      elements.resultText.textContent = '認識結果をまとめています。';
      elements.resultMessage.textContent = '少し待ってください。';
      return;
    }

    elements.resultText.lang = state.lastTranscript ? 'en' : 'ja';
    elements.resultText.textContent = state.lastTranscript || 'まだ記録はありません。';
    if (state.lastResult === 'correct') {
      elements.resultMessage.dataset.kind = 'correct';
      elements.resultMessage.textContent = state.difficultyComplete ? 'クリア！ この難易度をすべて達成しました。' : 'クリア！ 次のステージへ進みます。';
    } else if (state.lastResult === 'incorrect') {
      elements.resultMessage.dataset.kind = 'incorrect';
      const total = currentStage()?.sentences.length || 0;
      const matched = state.lastSentenceMatches?.length || 0;
      elements.resultMessage.textContent = total > 1
        ? `${total}文中${matched}文を言えました。チェックを確認して、もう一度挑戦しましょう。`
        : 'もう一度挑戦しましょう。英文も確認できます。';
    } else if (state.lastResult === 'error') {
      elements.resultMessage.dataset.kind = 'error';
      elements.resultMessage.textContent = resultFeedback || '音声を認識できませんでした。もう一度試してください。';
    } else {
      elements.resultMessage.textContent = '';
    }
  }

  function renderControls() {
    const busy = isRecognitionBusy();
    const idle = state?.recognitionState === 'idle';
    const action = Core.practiceActionFor(state);
    elements.action.textContent = action.label;
    elements.action.dataset.mode = action.mode;
    elements.action.disabled = action.disabled;
    elements.hint.disabled = !state || !idle || !['hint-available', 'hint-open'].includes(state.attemptState);
    elements.hint.textContent = Core.manuscriptConfirmationFor(state).label;
    elements.input.disabled = busy;
    elements.importButton.disabled = busy;
    elements.toggle.disabled = busy;
  }

  function render() {
    root.dataset.recognition = state?.recognitionState || 'empty';
    elements.status.textContent = statusMessage;
    renderDifficulty();
    renderProgress();
    renderPractice();
    renderResult();
    renderControls();
  }

  function importManuscript(event) {
    event.preventDefault();
    const sentences = Core.parseSpeech(elements.input.value);
    if (!sentences.length) {
      statusMessage = '英文が見つかりませんでした。英文を入力してください。';
      render();
      elements.input.focus();
      return;
    }

    cancelSpeech();
    const fingerprint = Core.speechFingerprint(sentences);
    const validIds = Core.stageIdsByDifficulty(sentences);
    let stored;
    let damaged = false;
    if (state?.fingerprint === fingerprint) {
      stored = progressValue();
    } else {
      const loaded = readStoredProgress();
      stored = loaded.value;
      damaged = loaded.damaged;
    }
    const reconciled = Core.reconcileProgress(stored, fingerprint, validIds);
    state = Core.createSession(sentences, reconciled.progress, Boolean(Recognition));
    lastStageKey = '';
    resultFeedback = '';
    elements.form.dataset.collapsed = 'true';
    elements.toggle.hidden = false;
    elements.summary.hidden = false;
    elements.summary.textContent = `${sentences.length}文`;

    if (!Recognition) {
      statusMessage = '英文を取り込みました。音声認識にはChromeを使用してください。';
    } else if (!storageAvailable) {
      statusMessage = '英文を取り込みました。この端末にはクリア記録を保存できません。';
    } else if (damaged) {
      statusMessage = '以前の保存内容を読み直せなかったため、新しいクリア記録で始めます。';
    } else if (reconciled.status === 'same') {
      statusMessage = '同じ原稿のクリア記録を復元しました。';
    } else if (reconciled.status === 'reset') {
      statusMessage = '原稿が変わったため、クリア記録をリセットしました。';
    } else {
      statusMessage = '英文を取り込みました。初級から始めましょう。';
    }
    saveProgress();
    render();
    elements.action.focus({ preventScroll: true });
  }

  function openManuscriptEditor() {
    if (isRecognitionBusy()) return;
    elements.form.dataset.collapsed = 'false';
    elements.input.focus();
  }

  function selectDifficulty(event) {
    const button = event.target.closest('[data-difficulty]');
    if (!button || !state) return;
    cancelSpeech();
    resultFeedback = '';
    state = Core.transition(state, { type: 'select-difficulty', difficulty: button.dataset.difficulty });
    statusMessage = `${DIFFICULTY_LABELS[state.selectedDifficulty]}を練習します。`;
    render();
  }

  function selectStage(event) {
    const button = event.target.closest('[data-stage-id]');
    if (!button || !state) return;
    cancelSpeech();
    resultFeedback = '';
    state = Core.transition(state, { type: 'select-stage', stageId: button.dataset.stageId });
    statusMessage = 'このステージを練習します。英文と音声はもう一度ロックしました。';
    render();
  }

  function repractice() {
    if (!state || isRecognitionBusy()) return;
    cancelSpeech();
    const first = currentStages()[0];
    state = Core.transition(state, { type: 'select-stage', stageId: first?.id });
    statusMessage = 'クリア記録を残したまま、もう一度練習できます。';
    resultFeedback = '';
    render();
  }

  function toggleHint() {
    if (!state) return;
    if (state.attemptState === 'hint-open') {
      cancelSpeech();
      state = Core.transition(state, { type: 'close-hint' });
      statusMessage = '英文を閉じました。もう一度挑戦しましょう。';
    } else {
      state = Core.transition(state, { type: 'open-hint' });
      if (state.attemptState === 'hint-open') statusMessage = '今の練習範囲だけを表示しています。';
    }
    render();
  }

  function recognitionErrorMessage(code) {
    const messages = {
      'not-allowed': 'マイクの使用が許可されていません。Chromeのマイク設定を確認してください。',
      'service-not-allowed': '音声認識を利用できません。Chromeの設定を確認してください。',
      'audio-capture': 'マイクを利用できません。接続や入力設定を確認してください。',
      'no-speech': '声を認識できませんでした。もう一度、はっきり話してみましょう。',
      network: '音声認識の通信に失敗しました。接続を確認してもう一度試してください。',
      aborted: '音声認識を中断しました。もう一度スタートしてください。',
    };
    return messages[code] || '音声認識を完了できませんでした。もう一度試してください。';
  }

  function finishRecognition(instance) {
    if (recognizer !== instance || !state) return;
    recognizer = null;
    const transcript = [...finalResults.entries()]
      .sort(([left], [right]) => left - right)
      .map(([, text]) => text.trim())
      .filter(Boolean)
      .join(' ')
      .trim();

    if (stopRequested && !recognitionError && transcript) {
      const stage = currentStage();
      const match = Core.matchTranscript(stage?.sentences || [], transcript);
      state = Core.transition(state, {
        type: 'attempt-result',
        matched: match.matched,
        transcript,
        sentenceMatches: match.sentenceMatches,
      });
      if (match.matched) {
        saveProgress();
        statusMessage = state.difficultyComplete ? `${DIFFICULTY_LABELS[state.selectedDifficulty]}をすべてクリアしました。` : 'ステージをクリアしました。次の範囲へ進みます。';
      } else {
        statusMessage = '登録した英文と一致しませんでした。英文を確認できるようになりました。';
      }
      resultFeedback = '';
    } else {
      state = Core.transition(state, { type: 'recognition-error' });
      resultFeedback = recognitionError
        ? recognitionErrorMessage(recognitionError)
        : stopRequested
          ? recognitionErrorMessage('no-speech')
          : '「できた！」を押す前に音声認識が終了しました。もう一度スタートしてください。';
      statusMessage = resultFeedback;
    }
    stopRequested = false;
    recognitionError = '';
    finalResults = new Map();
    render();
  }

  function startRecognition() {
    if (!state || !Recognition) return;
    cancelSpeech();
    const next = Core.transition(state, { type: 'start-listening' });
    if (next === state) return;
    state = next;
    stopRequested = false;
    recognitionError = '';
    finalResults = new Map();
    resultFeedback = '';
    statusMessage = 'マイクで聞いています。話し終わったら「できた！」を押してください。';

    const instance = new Recognition();
    recognizer = instance;
    instance.lang = 'en-US';
    instance.continuous = true;
    instance.interimResults = true;
    instance.maxAlternatives = 1;
    instance.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal && result[0]?.transcript) finalResults.set(index, result[0].transcript);
      }
    };
    instance.onerror = (event) => { recognitionError = event.error || 'unknown'; };
    instance.onend = () => finishRecognition(instance);

    render();
    try {
      instance.start();
    } catch (_) {
      recognitionError = 'audio-capture';
      state = Core.transition(state, { type: 'recognition-error' });
      recognizer = null;
      resultFeedback = recognitionErrorMessage(recognitionError);
      statusMessage = resultFeedback;
      render();
    }
  }

  function stopRecognition() {
    if (!state || !recognizer) return;
    const next = Core.transition(state, { type: 'request-stop' });
    if (next === state) return;
    state = next;
    stopRequested = true;
    statusMessage = '認識結果をまとめています。';
    render();
    try { recognizer.stop(); }
    catch (_) {
      recognitionError = 'aborted';
      state = Core.transition(state, { type: 'recognition-error' });
      recognizer = null;
      resultFeedback = recognitionErrorMessage(recognitionError);
      statusMessage = resultFeedback;
      render();
    }
  }

  function togglePracticeAction() {
    if (state?.recognitionState === 'listening') stopRecognition();
    else if (state?.recognitionState === 'idle') startRecognition();
  }

  function speakSentence(event) {
    const button = event.target.closest('.sentence-speaker');
    if (!button || button.disabled || state?.attemptState !== 'hint-open' || state.recognitionState !== 'idle') return;
    const sentence = currentStage()?.sentences.find(({ id }) => id === button.dataset.sentenceId);
    if (!sentence || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    cancelSpeech();
    const utterance = new window.SpeechSynthesisUtterance(sentence.text);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }

  function pauseMedia() {
    cancelSpeech();
    if (recognizer) {
      stopRequested = false;
      try { recognizer.abort(); } catch (_) { /* Browser is already closing the recognizer. */ }
    }
  }

  elements.form.addEventListener('submit', importManuscript);
  elements.toggle.addEventListener('click', openManuscriptEditor);
  elements.difficulty.addEventListener('click', selectDifficulty);
  elements.progress.addEventListener('click', selectStage);
  elements.repractice.addEventListener('click', repractice);
  elements.hint.addEventListener('click', toggleHint);
  elements.action.addEventListener('click', togglePracticeAction);
  elements.grid.addEventListener('click', speakSentence);
  window.addEventListener('resize', () => {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(applyLayout);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseMedia(); });
  window.addEventListener('pagehide', pauseMedia);

  render();
})();
