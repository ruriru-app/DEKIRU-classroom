(() => {
  function createFullscreenController({ isFullscreen, requestFullscreen, onState, isPrepared = () => true }) {
    let phase = 'ready';
    let started = false;
    let windowed = false;
    let pending = false;
    let microphonePending = false;

    function show(next) {
      phase = next;
      onState({ phase, resuming: started });
    }

    function sync() {
      if (isFullscreen() || windowed) {
        if (!isPrepared()) { show('setup'); return; }
        started = true;
        show('playing');
      } else if (!pending) {
        show(microphonePending ? 'microphone' : 'ready');
      }
    }

    return {
      sync,
      setMicrophonePending(value) {
        microphonePending = Boolean(value);
        if (!isFullscreen() && !windowed) sync();
      },
      async start() {
        if (pending || microphonePending) return;
        if (!isPrepared()) { show('setup'); return; }
        if (isFullscreen()) {
          sync();
          return;
        }
        pending = true;
        show('requesting');
        try {
          await requestFullscreen();
          pending = false;
          if (isFullscreen()) sync();
          else show('error');
        } catch {
          pending = false;
          if (isFullscreen()) sync();
          else show('error');
        }
      },
      continueWindowed() {
        if (phase !== 'error') return;
        windowed = true;
        sync();
      },
    };
  }

  globalThis.RuRiRuFullscreen = Object.freeze({ createFullscreenController });
  if (typeof document === 'undefined') return;

  const gate = document.querySelector('#fullscreen-gate');
  if (!gate) return;
  const title = document.querySelector('#fullscreen-title');
  const message = document.querySelector('#fullscreen-message');
  const start = document.querySelector('#fullscreen-start');
  const fallback = document.querySelector('#fullscreen-fallback');
  const microphoneButton = document.querySelector('#microphone-check');
  const microphoneStatus = document.querySelector('#microphone-status');
  const fullscreenMedia = window.matchMedia('(display-mode: fullscreen)');
  let gameFocus = null;
  let microphoneReady = false;

  const microphoneSetup = globalThis.RuRiRuMicrophoneSetup.createMicrophoneSetup({
    Recognition: window.SpeechRecognition || window.webkitSpeechRecognition,
    onState(state) {
      microphoneReady = state === 'ready';
      microphoneButton.disabled = state === 'checking' || microphoneReady;
      microphoneButton.textContent = microphoneReady ? 'マイク確認済み' : state === 'checking' ? 'マイクを確認中…' : 'マイクを確認する';
      microphoneStatus.textContent = microphoneReady ? 'マイクを確認できました。「全画面で始める」を押してください。'
        : state === 'checking' ? '許可を求められたら「許可」を選んでください。マイクの確認が終わるまでお待ちください。'
        : '最初に通常画面でマイクを確認してから、全画面で始めます。';
      start.disabled = !microphoneReady;
    },
    onError(error) {
      const messages = {
        'not-allowed': 'アドレス欄の設定でマイクを許可し、もう一度試してください。',
        'not-supported': 'このブラウザーでは音声認識を利用できません。Chromeで開いてください。',
        'service-not-allowed': 'ブラウザーの音声認識サービスを利用できません。学校の端末では管理者に設定を確認してください。',
        'audio-capture': 'マイクから音声を受け取れません。マイクの接続と入力先を確認してください。',
        network: '音声認識サービスと通信できませんでした。インターネット接続を確認して、もう一度試してください。',
      };
      microphoneStatus.textContent = Object.hasOwn(messages, error) ? messages[error]
        : 'マイクの確認が完了しませんでした。もう一度「マイクを確認する」を押してください。';
    },
  });

  const controller = createFullscreenController({
    isPrepared: () => microphoneReady,
    isFullscreen: () => Boolean(document.fullscreenElement || fullscreenMedia.matches),
    requestFullscreen: () => {
      if (!document.documentElement.requestFullscreen || document.fullscreenEnabled === false) {
        throw new Error('Fullscreen is unavailable');
      }
      return document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    },
    onState({ phase, resuming }) {
      if (phase === 'playing') {
        if (gate.open) {
          gate.close();
          (gameFocus?.isConnected ? gameFocus : document.querySelector('.product-add'))?.focus();
        }
        document.dispatchEvent(new CustomEvent('ruriru-fullscreen', { detail: { playing: true } }));
        return;
      }

      document.dispatchEvent(new CustomEvent('ruriru-fullscreen', { detail: { playing: false, microphonePending: phase === 'microphone' } }));

      title.textContent = resuming ? '接客を再開しましょう' : 'お店を開きましょう';
      message.textContent = phase === 'microphone' ? 'ブラウザーのマイク許可が終わるまでお待ちください。許可後は全画面に戻り、スタートを押してください。' : phase === 'error'
        ? '全画面に切り替えられませんでした。もう一度試すか、この画面のまま続けてください。'
        : resuming
          ? '準備した商品はそのままです。全画面に戻って続きをどうぞ。'
          : '商品やお客さんが見やすい全画面で遊びましょう。';
      start.textContent = phase === 'microphone' ? 'マイクの許可を待っています…' : phase === 'requesting'
        ? '切り替えています…'
        : resuming ? '全画面に戻る' : '全画面で始める';
      start.disabled = phase === 'requesting' || phase === 'microphone' || !microphoneReady;
      microphoneButton.hidden = resuming;
      microphoneStatus.hidden = resuming;
      fallback.hidden = phase !== 'error';
      if (!gate.open) {
        gameFocus = document.activeElement;
        gate.showModal();
      }
    },
  });

  microphoneButton.addEventListener('click', () => microphoneSetup.check());
  window.addEventListener('pagehide', () => microphoneSetup.cancel());
  start.addEventListener('click', () => { if (microphoneReady) void controller.start(); });
  fallback.addEventListener('click', () => controller.continueWindowed());
  gate.addEventListener('cancel', (event) => event.preventDefault());
  document.addEventListener('fullscreenchange', controller.sync);
  document.addEventListener('ruriru-capture', event => controller.setMicrophonePending(event.detail.pending));
  fullscreenMedia.addEventListener('change', controller.sync);
  controller.sync();
})();
