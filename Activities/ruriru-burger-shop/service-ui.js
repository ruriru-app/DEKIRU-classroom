(() => {
  const voiceChoiceKey = 'ruriru-customer-voice-v1';

  function createServiceUI({ products, counter, selectedItems, clearItems, onRender, setExpression, setMicState,
    setCustomer = () => {}, customers, random = Math.random, level = 4 }) {
    const el = id => document.getElementById(id);
    const customer = el('customer-layer'), transcript = el('transcript'), mic = el('mic-action');
    const action = el('service-action'), status = el('service-status');
    const remaining = el('retry-remaining'), trouble = el('service-trouble'), pauseDialog = el('service-pause');
    const result = el('service-result'), servedItems = el('served-items');
    const hint = el('order-hint'), hintText = el('order-hint-text'), bubble = el('reaction-bubble'), pattern = el('service-pattern');
    const profiles = globalThis.RuRiRuCustomers.getCustomers?.(level) || globalThis.RuRiRuCustomers.CUSTOMERS;
    const clone = value => JSON.parse(JSON.stringify(value));
    const freshPlan = () => customers ? clone(customers) : (globalThis.RuRiRuServicePlan.createNormalPlan || globalThis.RuRiRuServicePlan.createLevel4Plan)({
      level, products, customerIds: profiles.map(profile => profile.id), random,
    });
    // A visit always opens a new game. Only finished results and voice choices
    // persist; old in-progress games must not create a hidden resume step.
    clearLegacyGames();
    let customerPlan = freshPlan(), renderedCustomerId = '';
    const now = () => Date.now();
    const canRetry = view => view.retryPending && ['question', 'checkout'].includes(view.phase) && !view.audio;
    const makeSession = () => globalThis.RuRiRuServiceSession.createServiceSession({ level, products, customers: customerPlan, now });
    let session = makeSession(), runner, speech, stopped = false, suspendedByFullscreen = false;
    let permissionSuspended = false, deferredMicrophoneError = null;
    let previousTranscript = transcript.textContent, attemptItems = [], lastSpeechError = '';
    let lastVoiceError = '';
    let greetingText = '', greetingTimer = null, previousBubblePhase = '', hintHeld = false;
    const voiceErrorMessage = () => lastVoiceError === 'american-voice-unavailable'
      ? 'この端末でアメリカ英語の音声を利用できません。端末やブラウザーの音声設定でアメリカ英語を追加して、もう一度試してください。' : '';

    function clearLegacyGames() {
      try {
        // Known revisions are also removed when an isolated storage adapter
        // intentionally exposes only get/set/remove (as the local QA does).
        for (let oldLevel = 1; oldLevel <= 4; oldLevel++) for (let revision = 1; revision <= 6; revision++) {
          localStorage.removeItem(`ruriru-level${oldLevel}-service-v${revision}`);
          localStorage.removeItem(`ruriru-level${oldLevel}-fixed-service-v${revision}`);
        }
      } catch { /* A fresh game also works when browser storage is unavailable. */ }
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
      session.dispatch(event);
      render();
      for (const effect of session.takeEffects()) runner.run(effect);
      if (previous !== 'technical' && session.view().phase === 'technical') {
        stopPlatform();
        el('trouble-message').textContent = lastSpeechError || voiceErrorMessage() || '音声を再生できませんでした。端末の音量や音声設定を確認してください。';
        el('sound-recovered').textContent = lastSpeechError || voiceErrorMessage() ? 'もう一度試す' : '聞こえた！';
        if (!trouble.open) trouble.showModal();
      }
    }
    function render() {
      const view = session.view();
      document.body.dataset.servicePhase = view.phase;
      document.body.dataset.requestMode = view.requestMode;
      document.body.dataset.timerRunning = String(view.timerRunning);
      const customerId = view.customerId || customerPlan[0].customerId;
      customer.dataset.customerId = customerId;
      if (customerId !== renderedCustomerId) {
        renderedCustomerId = customerId;
        const profile = profiles.find(profile => profile.id === customerId) || profiles[0];
        voice?.setCustomerProfile(profile.voice);
        setCustomer(profile);
        refreshVoiceChoices();
      }
      el('customer-progress').textContent = `${view.customerNumber || 1}/${view.customerCount || customerPlan.length}人`;
      setExpression(view.expression);
      customer.hidden = stopped || ['idle', 'complete'].includes(view.phase);
      const microphoneState = speech?.state() || 'idle';
      renderEnglishAids(view, microphoneState);
      const retrySuggested = view.retryPending || (view.expression === 'troubled' && ['question', 'checkout'].includes(view.phase));
      setMicState(microphoneState, retrySuggested);
      mic.disabled = stopped || (microphoneState === 'idle' ? !(view.canRecord || canRetry(view)) : false);
      const labels = {
        idle: '', arriving: 'お客さんが来たよ', greeting: 'あいさつを聞こう',
        question: '英語で質問しよう', order: '注文を聞こう', handoff: '受け渡しています', inspection: '商品を確認中',
        'product-feedback': '注文を聞いて作り直そう', 'question-feedback': 'もう一度質問しよう',
        'handoff-feedback': '受け渡しをもう一度', 'price-feedback': '金額をもう一度',
        hold: '伝わったよ！', thanking: 'ありがとう！', departing: 'また来てね', complete: '接客できました',
        paused: '一時停止中', technical: '音声を確認中',
      };
      status.textContent = stopped ? '' : view.retryPending ? '発話をやり直そう' : view.phase === 'checkout'
        ? view.requestMode === 'price' ? '金額をもう一度' : view.requestMode === 'handoff' ? '受け渡しをもう一度' : '準備して英語で会計'
        : labels[view.phase] || '英語で接客しよう';
      if (action) {
        action.textContent = view.phase === 'idle' ? '接客スタート' : 'もう一度聞く';
        action.disabled = stopped || (view.phase !== 'idle' && !view.canReplay);
      }
      remaining.hidden = ['idle', 'complete'].includes(view.phase);
      remaining.textContent = `やり直し あと${view.remaining[view.requestMode === 'question' ? 'question' : 'checkout']}回`;
      if (el('pause-action')) el('pause-action').disabled = stopped || ['idle', 'complete', 'paused', 'technical'].includes(view.phase);
      onRender();
    }
    function renderEnglishAids(view, microphoneState) {
      if (view.phase === 'greeting' && level <= 2) {
        greetingText = view.reactionText || '';
        if (greetingTimer !== null) clearTimeout(greetingTimer);
        greetingTimer = null;
      } else if (previousBubblePhase === 'greeting' && view.phase === 'question' && greetingText) {
        greetingTimer = setTimeout(() => { greetingText = ''; greetingTimer = null; render(); }, 1000);
      } else if (view.phase !== 'question' || view.reactionText || microphoneState !== 'idle' || !view.canRecord) {
        greetingText = '';
        if (greetingTimer !== null) clearTimeout(greetingTimer);
        greetingTimer = null;
      }
      previousBubblePhase = view.phase;
      if (bubble) {
        const text = view.reactionText || (view.phase === 'question' ? greetingText : '');
        bubble.textContent = text;
        bubble.hidden = stopped || !text || microphoneState !== 'idle';
      }
      if (pattern) {
        const text = view.requestMode === 'question' ? 'What would you like?' : view.requestMode === 'handoff' ? 'Here you are.' :
          view.requestMode === 'price' ? "It's ～ yen." : "Here you are. It's ～ yen.";
        pattern.textContent = text;
        pattern.hidden = stopped || level > 2 || microphoneState !== 'idle' || !(view.canRecord || canRetry(view));
      }
      if (hint) { hint.hidden = level > 2; hint.disabled = stopped || !view.canHint; }
      if (hintText) { hintText.textContent = view.hintVisible ? view.orderText : ''; hintText.hidden = stopped || !view.hintVisible; }
    }
    function fadeOldProducts(effect) {
      const original = el('served-items');
      if (effect.reason !== 'departure' && effect.duration > 0 && original.children.length) {
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
      el('result-rating').textContent = '★'.repeat(view.stars);
      el('result-points').textContent = `${view.score} 点`;
      const s = view.stats;
      el('result-details').textContent = `接客 ${Math.round(view.elapsedMs / 1000)}秒 ／ 質問ミス ${s.questionMistakes}・商品ミス ${s.productMistakes}・会計ミス ${s.checkoutMistakes}回`;
      if (el('result-context')) el('result-context').textContent = `LEVEL ${level} · ${view.customerCount}人`;
      if (el('next-level')) el('next-level').hidden = view.stars !== 3 || level >= 4;
      globalThis.RuRiRuProgress?.recordResult(level, { stars: view.stars, score: view.score, elapsedMs: view.elapsedMs, stats: view.stats });
      if (!result.open) result.showModal();
    }
    let voice, requestedVoice = '';
    function refreshVoiceChoices() {
      if (!voice) return;
      const select = el('customer-voice-choice'), current = requestedVoice;
      const voices = voice.getVoices();
      select.replaceChildren(new Option([1, 2, 3].includes(level) ? '自動（アメリカ英語）' : '自動（お客さんに合わせる）', ''));
      for (const item of voices) select.add(new Option(`${item.name} (${item.lang})`, item.voiceURI));
      if (voices.some(item => item.voiceURI === current)) select.value = current;
      const chosen = voices.find(item => item.voiceURI === voice.selectedVoice());
      el('voice-status').textContent = chosen ? `現在の声：${chosen.name}` : '英語の音声候補を読み込んでいます。';
    }
    voice = globalThis.RuRiRuCustomerVoice.createCustomerVoice({
      level,
      onStart: () => { lastVoiceError = ''; runner?.audioStarted(); },
      onError: error => { lastVoiceError = error; },
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
        transcript.textContent = ''; previousTranscript = ''; attemptItems = [];
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
      const messages = {
        'no-speech': '音声が確認できませんでした。マイクを確認し、「もう一度試す」の後にスタートを押してください。',
        'not-allowed': 'マイクが許可されていません。ブラウザーのマイク設定を確認してください。',
        'not-supported': 'このブラウザーでは音声認識を利用できません。対応ブラウザーで開いてください。',
        network: '音声認識サービスとの通信が途切れました。インターネット接続を確認し、「もう一度試す」を押してください。',
        'audio-capture': 'マイクから音声を受け取れませんでした。マイクの接続や、ほかのアプリで使用中でないかを確認してください。',
        aborted: '音声入力が途中で停止しました。「もう一度試す」を押してから、マイクスタートで話し直してください。',
        'start-failed': '音声入力を開始できませんでした。マイクの接続や使用許可を確認して、もう一度試してください。',
        'stop-failed': '音声入力の終了処理に失敗しました。「もう一度試す」を押してから、マイクスタートで話し直してください。',
        'service-not-allowed': 'このブラウザーの音声認識サービスを利用できません。ブラウザーや端末の音声入力の設定を確認してください。',
        'language-not-supported': '英語の音声入力を利用できません。ブラウザーや端末の音声入力の設定を確認してください。',
      };
      const code = Object.hasOwn(messages, error) ? error : 'recognition-error';
      lastSpeechError = messages[code] || '音声入力を完了できませんでした。マイクの接続や通信状態を確認して、もう一度試してください。';
      runner.cancel();
      send({ type: 'technical-error', source: 'recognition', code });
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
    function startHint(event) {
      if (!hint || hint.disabled || hint.hidden || !session.view().canHint) return;
      event.preventDefault();
      if (hintHeld) return;
      hintHeld = true;
      if (event.pointerId !== undefined) hint.setPointerCapture?.(event.pointerId);
      send({ type: 'hint-start' });
    }
    function endHint() {
      if (!hintHeld && !session.view().hintVisible) return;
      hintHeld = false; send({ type: 'hint-end' });
    }
    hint?.addEventListener('pointerdown', startHint);
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture', 'blur']) hint?.addEventListener(type, endHint);
    hint?.addEventListener('keydown', event => { if ([' ', 'Enter'].includes(event.key)) startHint(event); });
    hint?.addEventListener('keyup', event => { if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); endHint(); } });
    document.addEventListener('pointerup', endHint);
    document.addEventListener('pointercancel', endHint);
    window.addEventListener?.('blur', endHint);
    document.addEventListener('visibilitychange', () => { if (document.hidden) endHint(); });
    action?.addEventListener('click', () => {
      if (session.view().phase === 'idle') send({ type: 'start' });
      else { runner.cancel(); send({ type: 'replay' }); }
    });
    el('pause-action')?.addEventListener('click', () => {
      stopPlatform(); send({ type: 'attempt-cancel' }); send({ type: 'pause' }); pauseDialog.showModal();
    });
    el('resume-action').addEventListener('click', () => { pauseDialog.close(); send({ type: 'resume' }); });
    el('sound-action')?.addEventListener('click', () => {
      refreshVoiceChoices();
      stopPlatform(); send({ type: 'attempt-cancel' }); lastSpeechError = '';
      send({ type: 'technical-error', source: 'audio' });
      if (!trouble.open) trouble.showModal();
    });
    el('sound-test').addEventListener('click', async () => {
      el('sound-test').disabled = true;
      lastVoiceError = '';
      const ok = await voice.speak('Hello!');
      el('sound-test').disabled = false;
      el('trouble-message').textContent = ok ? '聞こえたら「聞こえた！」を押してください。'
        : voiceErrorMessage() || '端末の音量・出力先・英語音声の設定を確認し、もう一度試してください。';
    });
    el('sound-recovered').addEventListener('click', () => {
      const microphoneFailure = Boolean(lastSpeechError);
      voice.cancel(); trouble.close();
      lastSpeechError = ''; lastVoiceError = '';
      send({ type: 'recover' });
      if (!microphoneFailure && !session.view().audio && session.view().canReplay) send({ type: 'replay', technical: true });
    });
    el('exit-action')?.addEventListener('click', () => {
      stopPlatform(); endHint(); stopped = true; closeDialogs();
      clearItems(); render(); window.location.assign('./index.html');
    });
    el('play-again').addEventListener('click', () => {
      stopPlatform(); closeDialogs(); clearItems(); stopped = false;
      servedItems.classList.remove('is-departing');
      customerPlan = freshPlan(); renderedCustomerId = '';
      session = makeSession();
      transcript.textContent = 'マイクを押して、お客さんに英語で接客してみよう！';
      send({ type: 'start' });
    });
    el('next-level')?.addEventListener('click', () => {
      if (session.view().complete && session.view().stars === 3 && level < 4) window.location.assign(`./play.html?level=${level + 1}`);
    });
    el('choose-level')?.addEventListener('click', () => window.location.assign('./index.html'));
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
      } else if (event.detail.playing && session.view().phase === 'idle') {
        send({ type: 'start' });
      }
    });
    for (const dialog of [trouble, pauseDialog, result]) dialog.addEventListener('cancel', event => event.preventDefault());
    render();
    return { canEdit: () => !stopped && session.view().canEdit, itemsChanged: () => send({ type: 'items-changed' }) };
  }
  globalThis.RuRiRuServiceUI = Object.freeze({ createServiceUI });
})();
