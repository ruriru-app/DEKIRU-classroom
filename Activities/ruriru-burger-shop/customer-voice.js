(() => {
  function createCustomerVoice({
    synthesis = globalThis.speechSynthesis,
    Utterance = globalThis.SpeechSynthesisUtterance,
    onState = () => {},
    onError = () => {},
    onStart = () => {},
    onVoicesChanged = () => {},
    rate = 1,
    voiceIndex,
    voiceWaitMs = 1000,
    setTimer = (callback, delay) => globalThis.setTimeout(callback, delay),
    clearTimer = id => globalThis.clearTimeout(id),
    timeoutMs = 20000,
  } = {}) {
    let active = null, preferredVoice = '', listeningForVoices = false, initialVoiceWaitComplete = false;
    const available = () => typeof synthesis?.speak === 'function'
      && typeof synthesis?.cancel === 'function' && typeof Utterance === 'function';

    const identifier = voice => String(voice?.voiceURI || voice?.name || '');
    // SpeechSynthesisVoice exposes no gender field. Prefer identifiable names;
    // the sound check can override this choice for the actual device.
    const feminine = voice => /(?:\bfemale\b|\b(?:zira|aria|jenny|sonia|hazel|samantha|victoria|susan|karen|moira|tessa|serena)\b|^google us english$)/i.test(voice.name || '');
    function readVoices() {
      try {
        if (typeof synthesis?.getVoices !== 'function') return null;
        return Array.from(synthesis.getVoices() || []).filter(voice => /^en(?:[-_]|$)/i.test(voice?.lang));
      } catch { return null; }
    }
    const describe = voices => voices.map(voice => ({ name: String(voice.name || ''), lang: String(voice.lang || ''), voiceURI: identifier(voice) }));
    const hasExplicitIndex = () => Number.isInteger(voiceIndex) && voiceIndex >= 0;
    const preferred = voices => preferredVoice ? voices.find(voice => identifier(voice) === preferredVoice || voice.name === preferredVoice) : null;
    function choose(voices) {
      if (!voices?.length) return null;
      return preferred(voices) || (hasExplicitIndex() ? voices[voiceIndex % voices.length] : voices.find(feminine)) || voices[0];
    }
    function desiredVoiceReady(voices) {
      if (!voices?.length) return false;
      if (preferredVoice) return Boolean(preferred(voices));
      return hasExplicitIndex() || voices.some(feminine);
    }
    function voicesChanged() {
      const voices = readVoices() || [];
      if (active?.waiting && desiredVoiceReady(voices)) beginPlayback(active);
      onVoicesChanged(describe(voices));
    }
    function listenForVoices() {
      if (listeningForVoices || typeof synthesis?.addEventListener !== 'function') return;
      try { synthesis.addEventListener('voiceschanged', voicesChanged); listeningForVoices = true; } catch { /* Enumeration still works synchronously. */ }
    }
    function getVoices() { listenForVoices(); return describe(readVoices() || []); }
    function selectedVoice() { listenForVoices(); return identifier(choose(readVoices())); }
    function setPreferredVoice(value) {
      preferredVoice = typeof value === 'string' ? value.trim() : '';
      return selectedVoice();
    }

    function complete(session, success, error, stop = false) {
      if (active !== session) return;
      active = null;
      if (session.timer !== null) clearTimer(session.timer);
      if (session.waitTimer !== null) clearTimer(session.waitTimer);
      // Invalidate first: cancel() may dispatch end/error synchronously.
      if (stop) {
        try { synthesis.cancel(); } catch { /* Playback is already invalidated. */ }
      }
      session.resolve(success);
      onState('idle');
      if (error) onError(error);
    }

    function cancel() {
      if (active) complete(active, false, null, true);
    }

    function beginPlayback(session) {
      if (active !== session || session.playbackRequested) return;
      session.playbackRequested = true;
      session.waiting = false;
      initialVoiceWaitComplete = true;
      if (session.waitTimer !== null) { clearTimer(session.waitTimer); session.waitTimer = null; }
      const voice = choose(readVoices());
      if (voice) { session.utterance.voice = voice; session.utterance.lang = voice.lang; }
      const delay = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 20000;
      session.timer = setTimer(() => complete(session, false, 'playback-timeout', true), delay);
      try { synthesis.speak(session.utterance); }
      catch { complete(session, false, 'start-failed', true); }
    }

    function speak(text) {
      cancel();
      return new Promise(resolve => {
        const value = typeof text === 'string' ? text.trim() : '';
        if (!value) { resolve(false); onError('empty-text'); return; }
        if (!available()) { resolve(false); onError('not-supported'); return; }
        let utterance;
        try { utterance = new Utterance(value); }
        catch { resolve(false); onError('start-failed'); return; }
        const session = { utterance, resolve, timer: null, waitTimer: null, started: false, waiting: false, playbackRequested: false };
        active = session;
        utterance.lang = 'en-US';
        utterance.rate = Number.isFinite(rate) && rate > 0 ? rate : 1;
        utterance.onstart = () => {
          if (active !== session || session.started) return;
          session.started = true;
          onStart(value);
        };
        utterance.onend = () => complete(session, true);
        utterance.onerror = event => complete(session, false, event?.error || 'synthesis-error');
        onState('speaking');
        listenForVoices();
        const voices = readVoices();
        if (!initialVoiceWaitComplete && voices !== null && listeningForVoices && !desiredVoiceReady(voices)) {
          session.waiting = true;
          const delay = Number.isFinite(voiceWaitMs) && voiceWaitMs >= 0 ? voiceWaitMs : 1000;
          session.waitTimer = setTimer(() => beginPlayback(session), delay);
        } else beginPlayback(session);
      });
    }

    listenForVoices();
    return { speak, cancel, busy: () => Boolean(active), available, getVoices, setPreferredVoice, selectedVoice };
  }

  globalThis.RuRiRuCustomerVoice = Object.freeze({ createCustomerVoice });
})();
