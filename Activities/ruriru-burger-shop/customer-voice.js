(() => {
  function createCustomerVoice({
    synthesis = globalThis.speechSynthesis,
    Utterance = globalThis.SpeechSynthesisUtterance,
    onState = () => {},
    onError = () => {},
    onStart = () => {},
    onVoicesChanged = () => {},
    level = 4,
    rate,
    voiceIndex,
    voiceWaitMs = 1000,
    setTimer = (callback, delay) => globalThis.setTimeout(callback, delay),
    clearTimer = id => globalThis.clearTimeout(id),
    timeoutMs = 20000,
  } = {}) {
    let active = null, preferredVoice = '', listeningForVoices = false, initialVoiceWaitComplete = false;
    let customerProfile = null;
    const americanOnly = [1, 2, 3].includes(level);
    const defaultRate = level === 1 ? .8 : level === 2 ? .9 : 1;
    const productGap = level === 1 ? 600 : level === 2 ? 300 : 0;
    const quantity = '(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|an?|\\d+)\\b';
    const productBoundary = new RegExp(`(?<=,)\\s+(?=(?:and\\s+)?${quantity})|\\s+(?=and\\s+${quantity})`, 'i');
    const speechParts = (text, kind) => productGap && ['order', 'replay', 'corrective'].includes(kind)
      ? text.split(productBoundary) : [text];
    const available = () => typeof synthesis?.speak === 'function'
      && typeof synthesis?.cancel === 'function' && typeof Utterance === 'function';

    const identifier = voice => String(voice?.voiceURI || voice?.name || '');
    // SpeechSynthesisVoice exposes no gender field. Prefer identifiable names;
    // the sound check can override this choice for the actual device.
    const feminine = voice => /(?:\bfemale\b|\b(?:zira|aria|jenny|sonia|hazel|samantha|victoria|susan|karen|moira|tessa|serena)\b|^google us english$)/i.test(voice.name || '');
    const masculine = voice => /(?:\bmale\b|\b(?:david|mark|guy|james|george|daniel|alex|fred|tom|oliver|christopher|ryan|roger|eric|andrew|brian|steffan)\b)/i.test(voice.name || '');
    function readVoices() {
      try {
        if (typeof synthesis?.getVoices !== 'function') return null;
        return Array.from(synthesis.getVoices() || []).filter(voice => americanOnly
          ? String(voice?.lang || '').replace(/_/g, '-').toLowerCase() === 'en-us'
          : /^en(?:[-_]|$)/i.test(voice?.lang));
      } catch { return null; }
    }
    const describe = voices => voices.map(voice => ({ name: String(voice.name || ''), lang: String(voice.lang || ''), voiceURI: identifier(voice) }));
    const hasExplicitIndex = () => Number.isInteger(voiceIndex) && voiceIndex >= 0;
    const preferred = voices => preferredVoice ? voices.find(voice => identifier(voice) === preferredVoice || voice.name === preferredVoice) : null;
    const matchesProfile = voice => customerProfile?.gender === 'masculine' ? masculine(voice) : feminine(voice);
    function choose(voices) {
      if (!voices?.length) return null;
      const matching = voices.filter(matchesProfile);
      const automatic = customerProfile ? matching[customerProfile.voiceIndex % matching.length]
        : hasExplicitIndex() ? voices[voiceIndex % voices.length] : matching[0];
      return preferred(voices) || automatic || voices[0];
    }
    function desiredVoiceReady(voices) {
      if (!voices?.length) return false;
      if (preferredVoice && (!americanOnly || preferred(voices))) return Boolean(preferred(voices));
      return (!customerProfile && hasExplicitIndex()) || voices.some(matchesProfile);
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
    function setCustomerProfile(value = {}) {
      const next = {
        gender: value.gender === 'masculine' ? 'masculine' : 'feminine',
        voiceIndex: Number.isInteger(value.voiceIndex) && value.voiceIndex >= 0 ? value.voiceIndex : 0,
        pitch: Number.isFinite(value.pitch) ? Math.min(2, Math.max(.5, value.pitch)) : 1,
      };
      if (!customerProfile || Object.keys(next).some(key => next[key] !== customerProfile[key])) {
        cancel();
        customerProfile = next;
        initialVoiceWaitComplete = false;
      }
      return selectedVoice();
    }

    function complete(session, success, error, stop = false) {
      if (active !== session) return;
      active = null;
      if (session.timer !== null) clearTimer(session.timer);
      if (session.waitTimer !== null) clearTimer(session.waitTimer);
      if (session.gapTimer !== null) clearTimer(session.gapTimer);
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

    function playPart(session, index = 0) {
      if (active !== session) return;
      let utterance = session.utterance;
      if (index > 0) {
        try { utterance = new Utterance(session.parts[index]); }
        catch { complete(session, false, 'start-failed', true); return; }
      }
      session.partIndex = index;
      session.utterance = utterance;
      const current = () => active === session && session.utterance === utterance;
      utterance.lang = americanOnly ? 'en-US' : session.voice?.lang || 'en-US';
      if (session.voice) utterance.voice = session.voice;
      utterance.rate = Number.isFinite(rate) && rate > 0 ? rate : defaultRate;
      utterance.pitch = customerProfile?.pitch || 1;
      utterance.onstart = () => {
        if (!current() || session.started) return;
        session.started = true;
        onStart(session.text);
      };
      utterance.onend = () => {
        if (!current()) return;
        // Invalidate this segment before the gap so repeated end/error events
        // cannot finish the order or skip its next product.
        session.utterance = null;
        if (session.timer !== null) { clearTimer(session.timer); session.timer = null; }
        if (index === session.parts.length - 1) { complete(session, true); return; }
        session.gapTimer = setTimer(() => {
          if (active !== session || session.partIndex !== index || session.utterance !== null) return;
          clearTimer(session.gapTimer); session.gapTimer = null;
          playPart(session, index + 1);
        }, productGap);
      };
      utterance.onerror = event => {
        if (current()) complete(session, false, event?.error || 'synthesis-error');
      };
      const delay = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 20000;
      session.timer = setTimer(() => {
        if (current()) complete(session, false, 'playback-timeout', true);
      }, delay);
      try { synthesis.speak(utterance); }
      catch { if (current()) complete(session, false, 'start-failed', true); }
    }

    function beginPlayback(session) {
      if (active !== session || session.playbackRequested) return;
      session.playbackRequested = true;
      session.waiting = false;
      initialVoiceWaitComplete = true;
      if (session.waitTimer !== null) { clearTimer(session.waitTimer); session.waitTimer = null; }
      session.voice = choose(readVoices());
      if (americanOnly && !session.voice) { complete(session, false, 'american-voice-unavailable'); return; }
      playPart(session);
    }

    function speak(text, { kind } = {}) {
      cancel();
      return new Promise(resolve => {
        const value = typeof text === 'string' ? text.trim() : '';
        if (!value) { resolve(false); onError('empty-text'); return; }
        if (!available()) { resolve(false); onError('not-supported'); return; }
        const parts = speechParts(value, kind);
        let utterance;
        try { utterance = new Utterance(parts[0]); }
        catch { resolve(false); onError('start-failed'); return; }
        const session = { utterance, text: value, parts, partIndex: 0, voice: null, resolve,
          timer: null, waitTimer: null, gapTimer: null, started: false, waiting: false, playbackRequested: false };
        active = session;
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
    return { speak, cancel, busy: () => Boolean(active), available, getVoices, setPreferredVoice, setCustomerProfile, selectedVoice };
  }

  globalThis.RuRiRuCustomerVoice = Object.freeze({ createCustomerVoice });
})();
