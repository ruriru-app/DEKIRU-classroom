(() => {
  function createSpeechController({ Recognition, onTranscript = () => {}, onState = () => {}, onComplete = () => {}, onError = () => {}, onCaptureState = () => {} } = {}) {
    let active = null;
    let state = 'idle';
    const setState = next => { state = next; onState(next); };
    function release(abort) {
      const previous = active;
      active = null;
      if (!previous) return;
      clearTimeout(previous.timer);
      if (abort && !previous.ended) {
        try { previous.recognition.abort(); } catch { /* Already stopped. */ }
      }
    }
    function fail(session, error) {
      if (session && active !== session) return;
      release(true);
      setState('idle');
      onCaptureState('idle');
      onError(error);
    }
    function complete(session) {
      if (active !== session || !session.done || !session.ended) return;
      if (!session.finalText.trim()) { fail(session, 'no-speech'); return; }
      release(false);
      onCaptureState('idle');
      onTranscript(session.finalText);
      onComplete(session.finalText);
    }
    return {
      state: () => state,
      waitingForStart: () => Boolean(active && !active.started && !active.ended),
      start() {
        release(true);
        if (!Recognition) { fail(null, 'not-supported'); return false; }
        let recognition;
        try { recognition = new Recognition(); } catch { fail(null, 'start-failed'); return false; }
        const session = { recognition, finalText: '', done: false, ended: false, started: false, timer: null };
        active = session;
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.onstart = () => {
          if (active !== session || session.started) return;
          if (!session.done) clearTimeout(session.timer);
          session.started = true; onCaptureState('started');
        };
        recognition.onresult = event => {
          if (active !== session) return;
          const finalParts = [];
          for (let index = 0; index < event.results.length; index++) {
            const result = event.results[index];
            if (result.isFinal) finalParts.push(result[0].transcript);
          }
          session.finalText = finalParts.join(' ');
        };
        recognition.onerror = event => fail(session, event.error || 'recognition-error');
        recognition.onend = () => {
          if (active !== session) return;
          clearTimeout(session.timer);
          session.ended = true;
          onCaptureState('idle');
          complete(session);
        };
        session.timer = setTimeout(() => fail(session, 'start-timeout'), 20000);
        setState('listening');
        onCaptureState('requesting');
        try { recognition.start(); } catch { fail(session, 'start-failed'); return false; }
        return true;
      },
      finish() {
        if (!active || active.done) return;
        const session = active;
        session.done = true;
        setState('review');
        if (session.ended) { complete(session); return; }
        clearTimeout(session.timer);
        session.timer = setTimeout(() => fail(session, 'stop-timeout'), 6000);
        try { session.recognition.stop(); } catch { fail(session, 'stop-failed'); }
      },
      cancel() {
        release(true);
        setState('idle');
        onCaptureState('idle');
      },
    };
  }
  globalThis.RuRiRuSpeech = Object.freeze({ createSpeechController });
})();
