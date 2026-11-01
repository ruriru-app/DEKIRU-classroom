(() => {
  // Preserve older trial saves without replaying them under different judgement rules.
  const storageKey = 'ruriru-level4-fixed-service-v4';
  const voiceChoiceKey = 'ruriru-customer-voice-v1';
  const eventTypes = new Set(['start', 'arrived', 'audio-started', 'audio-ended', 'attempt-start', 'attempt-finish',
    'attempt-cancel', 'submit', 'retry', 'handoff-finished', 'inspection-finished', 'hold-finished', 'correction-wait-finished',
    'departure-finished', 'replay', 'pause', 'resume', 'technical-error', 'recover', 'items-changed', 'reset']);

  function createServiceUI({ products, counter, selectedItems, clearItems, onRender, setExpression, setMicState }) {
    const el = id => document.getElementById(id);
    const customer = el('customer-layer'), transcript = el('transcript'), mic = el('mic-action');
    const action = el('service-action'), status = el('service-status');
    const remaining = el('retry-remaining'), trouble = el('service-trouble'), pauseDialog = el('service-pause');
    const result = el('service-result'), servedItems = el('served-items');
    let greeting = Math.random() < .5 ? 'Hello!' : 'Hi!';
    let history = [], clockOffset = 0, replayClock = null;
    const now = () => replayClock === null ? Date.now() - clockOffset : replayClock;
    const canRetry = view => view.retryPending && ['question', 'checkout'].includes(view.phase) && !view.audio;
    const makeSession = () => globalThis.RuRiRuServiceSession.createServiceSession({ products, greeting, now });
    let session = makeSession(), runner, speech, stopped = false, suspendedByFullscreen = false;
    let permissionSuspended = false, deferredMicrophoneError = null;
    let previousTranscript = transcript.textContent, attemptItems = [], lastSpeechError = '';
    let saved = readSaved();

    function readSaved() {
      try {
        const value = JSON.parse(localStorage.getItem(storageKey) || 'null');
        if (!value || value.version !== 4 || !Array.isArray(value.events) || value.events.length > 5000 ||
            !Number.isFinite(value.at) || !Array.isArray(value.items)) return null;
        let previous = -Infinity;
        for (const entry of value.events) {
          if (!Number.isFinite(entry.at) || entry.at < previous || !eventTypes.has(entry.event?.type)) return null;
          previous = entry.at;
        }
        if (value.at < previous || value.items.some(line => !products.some(p => p.id === line.id) ||
          !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 12) ||
          value.items.reduce((n, line) => n + line.quantity, 0) > 12) return null;
        return value;
      } catch { return null; }
    }
    function closeDialogs() {
      for (const dialog of [trouble, pauseDialog, result]) if (dialog.open) dialog.close();
    }
    function stopPlatform() {
      if (speech && speech.state() !== 'idle') transcript.textContent = previousTranscript;
      runner?.cancel(); speech?.cancel();
    }
    function send(event) {
      const previous = session.view().phase;
      history.push({ at: now(), event: JSON.parse(JSON.stringify(event)) });
      session.dispatch(event);
      render();
      for (const effect of session.takeEffects()) runner.run(effect);
      if (previous !== 'technical' && session.view().phase === 'technical') {
        stopPlatform();
        el('trouble-message').textContent = lastSpeechError || '音声を再生できませんでした。端末の音量や音声設定を確認してください。';
        el('sound-recovered').textContent = lastSpeechError ? 'もう一度試す' : '聞こえた！';
        if (!trouble.open) trouble.showModal();
      }
    }
    function render() {
      const view = session.view();
      document.body.dataset.servicePhase = view.phase;
      document.body.dataset.requestMode = view.requestMode;
      document.body.dataset.timerRunning = String(view.timerRunning);
      setExpression(view.expression);
      customer.hidden = stopped || ['idle', 'complete'].includes(view.phase);
      const microphoneState = speech?.state() || 'idle';
      const retrySuggested = view.retryPending || (view.expression === 'troubled' && ['question', 'checkout'].includes(view.phase));
      setMicState(microphoneState, retrySuggested);
      mic.disabled = stopped || (microphoneState === 'idle' ? !(view.canRecord || canRetry(view)) : false);
      const labels = {
        idle: '接客チャレンジ', arriving: 'お客さんが来たよ', greeting: 'あいさつを聞こう',
        question: '英語で質問しよう', order: '注文を聞こう', handoff: '受け渡しています', inspection: '商品を確認中',
        'product-feedback': '注文を聞いて作り直そう', 'question-feedback': 'もう一度質問しよう',
        'handoff-feedback': '受け渡しをもう一度', 'price-feedback': '金額をもう一度',
        hold: '伝わったよ！', thanking: 'ありがとう！', departing: 'また来てね', complete: '接客できました',
        paused: '一時停止中', technical: '音声を確認中',
      };
      status.textContent = stopped ? '保存しました' : view.retryPending ? '発話をやり直そう' : view.phase === 'checkout'
        ? view.requestMode === 'price' ? '金額をもう一度' : view.requestMode === 'handoff' ? '受け渡しをもう一度' : '準備して英語で会計'
        : labels[view.phase] || '英語で接客しよう';
      action.textContent = stopped || (saved && view.phase === 'idle') ? '保存した接客を再開' : view.phase === 'idle' ? '接客スタート' : 'もう一度聞く';
      action.disabled = !stopped && !(saved && view.phase === 'idle') && view.phase !== 'idle' && !view.canReplay;
      remaining.hidden = ['idle', 'complete'].includes(view.phase);
      remaining.textContent = `やり直し あと${view.remaining[view.requestMode === 'question' ? 'question' : 'checkout']}回`;
      el('pause-action').disabled = stopped || ['idle', 'complete', 'paused', 'technical'].includes(view.phase);
      onRender();
    }
    function fadeOldProducts(effect) {
      const original = el('served-items');
      if (original.children.length) {
        const rect = original.getBoundingClientRect(), ghost = original.cloneNode(true);
        ghost.removeAttribute('id');
        ghost.classList.remove('is-presented');
        ghost.classList.add('correction-fade');
        ghost.setAttribute('aria-hidden', 'true');
        Object.assign(ghost.style, { position: 'fixed', inset: 'auto', left: `${rect.left}px`, top: `${rect.top}px`,
          width: `${rect.width}px`, height: `${rect.height}px`, zIndex: '7', animation: `clear-order ${effect.duration}ms ease forwards` });
        document.body.append(ghost);
        setTimeout(() => ghost.remove(), effect.duration + 50);
      }
      clearItems();
      onRender();
    }
    function showResult() {
      const view = session.view();
      clearItems();
      servedItems.classList.remove('is-departing');
      onRender();
      try { localStorage.removeItem(storageKey); } catch { /* Local persistence is optional on this browser. */ }
      saved = null;
      el('result-rating').textContent = '★'.repeat(view.stars);
      el('result-points').textContent = `${view.score} 点`;
      const s = view.stats;
      el('result-details').textContent = `接客 ${Math.round(view.elapsedMs / 1000)}秒 ／ 質問ミス ${s.questionMistakes}・商品ミス ${s.productMistakes}・会計ミス ${s.checkoutMistakes}回`;
      if (!result.open) result.showModal();
    }
    let voice, requestedVoice = '';
    function refreshVoiceChoices() {
      if (!voice) return;
      const select = el('customer-voice-choice'), current = requestedVoice;
      const voices = voice.getVoices();
      select.replaceChildren(new Option('自動（女性の英語音声を優先）', ''));
      for (const item of voices) select.add(new Option(`${item.name} (${item.lang})`, item.voiceURI));
      if (voices.some(item => item.voiceURI === current)) select.value = current;
      const chosen = voices.find(item => item.voiceURI === voice.selectedVoice());
      el('voice-status').textContent = chosen ? `現在の声：${chosen.name}` : '英語の音声候補を読み込んでいます。';
    }
    voice = globalThis.RuRiRuCustomerVoice.createCustomerVoice({
      rate: 1,
      onStart: () => runner?.audioStarted(),
      onVoicesChanged: refreshVoiceChoices,
    });
    try {
      const preferred = localStorage.getItem(voiceChoiceKey) || '';
      requestedVoice = preferred;
      voice.setPreferredVoice(preferred);
      refreshVoiceChoices();
      if (voice.getVoices().some(item => item.voiceURI === preferred)) el('customer-voice-choice').value = preferred;
    } catch { refreshVoiceChoices(); }
    el('customer-voice-choice').addEventListener('change', event => {
      requestedVoice = event.target.value;
      voice.cancel(); voice.setPreferredVoice(event.target.value);
      try { localStorage.setItem(voiceChoiceKey, event.target.value); } catch { /* Voice choice still applies during this session. */ }
      refreshVoiceChoices();
    });
    runner = globalThis.RuRiRuServiceEffects.createServiceEffects({
      voice, send,
      onArrive: () => {
        customer.hidden = false;
        customer.classList.remove('from-left', 'from-right', 'is-departing');
        servedItems.classList.remove('is-departing');
        void customer.offsetWidth;
        customer.classList.add(Math.random() < .5 ? 'from-left' : 'from-right');
      },
      onPresent: () => { servedItems.classList.remove('is-departing'); counter.present('Here you are.'); onRender(); },
      onClearProducts: fadeOldProducts,
      onDepart: () => {
        customer.classList.remove('from-left', 'from-right'); customer.classList.add('is-departing');
        servedItems.classList.add('is-departing');
      },
      onComplete: showResult,
    });
    function handleSpeechError(error) {
      if (session.view().phase === 'paused' && suspendedByFullscreen) { deferredMicrophoneError = error; return; }
      send({ type: 'attempt-cancel' });
      transcript.textContent = previousTranscript;
      lastSpeechError = error === 'no-speech' ? '音声が確認できませんでした。マイクを確認し、「もう一度試す」の後にスタートを押してください。'
        : error === 'not-allowed' ? 'マイクが許可されていません。ブラウザーのマイク設定を確認してください。'
        : error === 'not-supported' ? 'このブラウザーでは音声認識を利用できません。対応ブラウザーで開いてください。'
        : 'マイクを確認しています。接続や設定を確認して、もう一度試してください。';
      runner.cancel();
      send({ type: 'technical-error', source: 'recognition' });
    }
    speech = globalThis.RuRiRuSpeech.createSpeechController({
      Recognition: window.SpeechRecognition || window.webkitSpeechRecognition,
      onState: () => render(),
      onTranscript: heard => { transcript.textContent = heard; },
      onComplete: text => { speech.cancel(); send({ type: 'submit', text, items: attemptItems }); },
      onError: handleSpeechError,
      onCaptureState: state => {
        if (state !== 'requesting' && permissionSuspended) {
          permissionSuspended = false;
          speech.cancel(); transcript.textContent = previousTranscript;
        }
        document.dispatchEvent(new CustomEvent('ruriru-capture', { detail: { pending: state === 'requesting', state } }));
      },
    });
    function cancelAttempt() {
      speech.cancel();
      transcript.textContent = previousTranscript;
      send({ type: 'attempt-cancel' });
    }
    mic.addEventListener('click', () => {
      if (speech.state() === 'idle') {
        if (stopped) return;
        if (canRetry(session.view())) send({ type: 'retry' });
        if (!session.view().canRecord || stopped) return;
        previousTranscript = transcript.textContent;
        attemptItems = selectedItems();
        lastSpeechError = '';
        send({ type: 'attempt-start' });
        transcript.textContent = '聞いています… できたら「できた！」を押してね。（Escでキャンセル）';
        speech.start();
      } else if (speech.state() === 'listening') {
        send({ type: 'attempt-finish' });
        speech.finish();
      } else cancelAttempt();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && speech.state() !== 'idle') { event.preventDefault(); cancelAttempt(); }
    });
    action.addEventListener('click', () => {
      if (saved && (stopped || session.view().phase === 'idle')) restoreSaved();
      else if (session.view().phase === 'idle') send({ type: 'start' });
      else { runner.cancel(); send({ type: 'replay' }); }
    });
    el('pause-action').addEventListener('click', () => {
      stopPlatform(); send({ type: 'attempt-cancel' }); send({ type: 'pause' }); pauseDialog.showModal();
    });
    el('resume-action').addEventListener('click', () => { pauseDialog.close(); send({ type: 'resume' }); });
    el('sound-action').addEventListener('click', () => {
      refreshVoiceChoices();
      stopPlatform(); send({ type: 'attempt-cancel' }); lastSpeechError = '';
      send({ type: 'technical-error', source: 'audio' });
      if (!trouble.open) trouble.showModal();
    });
    el('sound-test').addEventListener('click', async () => {
      el('sound-test').disabled = true;
      const ok = await voice.speak('Hello!');
      el('sound-test').disabled = false;
      el('trouble-message').textContent = ok ? '聞こえたら「聞こえた！」を押してください。' : '端末の音量・出力先・英語音声の設定を確認し、もう一度試してください。';
    });
    el('sound-recovered').addEventListener('click', () => {
      voice.cancel(); trouble.close();
      lastSpeechError = '';
      send({ type: 'recover' });
      if (!session.view().audio && session.view().canReplay) send({ type: 'replay', technical: true });
    });
    function saveAndExit() {
      stopPlatform();
      const payload = { version: 4, greeting, at: now(), events: history, items: selectedItems(),
        presented: counter.view().phase === 'presented', transcript: transcript.textContent };
      try {
        localStorage.setItem(storageKey, JSON.stringify(payload));
        saved = payload; stopped = true; closeDialogs(); render();
      } catch { el('trouble-message').textContent = 'このブラウザーでは保存できません。接客を再開するか、この画面を開いたままにしてください。'; }
    }
    el('save-exit').addEventListener('click', saveAndExit);
    el('pause-save').addEventListener('click', saveAndExit);
    function restoreSaved() {
      if (!saved) return;
      stopPlatform(); closeDialogs(); clearItems();
      greeting = saved.greeting === 'Hi!' ? 'Hi!' : 'Hello!';
      replayClock = saved.events[0]?.at || saved.at;
      session = makeSession();
      for (const entry of saved.events) { replayClock = entry.at; session.dispatch(entry.event); session.takeEffects(); }
      clockOffset = Date.now() - saved.at; replayClock = null;
      history = [...saved.events];
      for (const { id, quantity } of saved.items) for (let n = 0; n < quantity; n++) counter.add(id);
      if (saved.presented) counter.present('Here you are.');
      transcript.textContent = saved.transcript || '';
      stopped = false;
      customer.classList.remove('from-left', 'from-right', 'is-departing');
      servedItems.classList.remove('is-departing');
      const phase = session.view().phase;
      if (phase === 'technical') send({ type: 'recover' });
      else if (phase === 'paused') send({ type: 'resume' });
      else render();
    }
    el('play-again').addEventListener('click', () => {
      stopPlatform(); closeDialogs(); clearItems(); saved = null; stopped = false;
      servedItems.classList.remove('is-departing');
      greeting = Math.random() < .5 ? 'Hello!' : 'Hi!';
      clockOffset = 0; history = []; session = makeSession();
      transcript.textContent = 'マイクを押して、お客さんに英語で接客してみよう！';
      send({ type: 'start' });
    });
    document.addEventListener('ruriru-fullscreen', event => {
      if (!event.detail.playing && event.detail.microphonePending && speech.waitingForStart()) {
        if (!suspendedByFullscreen) {
          runner.cancel(); send({ type: 'pause' }); suspendedByFullscreen = true; permissionSuspended = true;
        }
      } else if (!event.detail.playing && !['idle', 'complete', 'paused', 'technical'].includes(session.view().phase)) {
        stopPlatform(); send({ type: 'attempt-cancel' }); send({ type: 'pause' }); suspendedByFullscreen = true;
      } else if (event.detail.playing && suspendedByFullscreen) {
        suspendedByFullscreen = false; send({ type: 'resume' });
        if (deferredMicrophoneError) { const error = deferredMicrophoneError; deferredMicrophoneError = null; handleSpeechError(error); }
      } else if (event.detail.playing && session.view().phase === 'idle' && !saved) {
        send({ type: 'start' });
      }
    });
    for (const dialog of [trouble, pauseDialog, result]) dialog.addEventListener('cancel', event => event.preventDefault());
    render();
    return { canEdit: () => !stopped && session.view().canEdit, itemsChanged: () => send({ type: 'items-changed' }) };
  }
  globalThis.RuRiRuServiceUI = Object.freeze({ createServiceUI });
})();
