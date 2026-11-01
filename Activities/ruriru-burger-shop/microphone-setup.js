(() => {
  function createMicrophoneSetup({ Recognition, onState = () => {}, onError = () => {} } = {}) {
    let state = 'unchecked', active = null;
    const update = next => { state = next; onState(next); };
    function fail(session, error) {
      if (session && active !== session) return;
      active = null; update('error'); onError(error);
    }
    return {
      state: () => state,
      check() {
        if (state === 'checking') return;
        if (!Recognition) { fail(null, 'not-supported'); return; }
        let recognition;
        try { recognition = new Recognition(); } catch { fail(null, 'start-failed'); return; }
        const session = { recognition }; active = session;
        recognition.lang = 'en-US'; recognition.continuous = false;
        recognition.onstart = () => {
          if (active !== session) return;
          active = null;
          try { recognition.abort(); } catch { /* The short permission check is already finished. */ }
          update('ready');
        };
        recognition.onerror = event => fail(session, event.error || 'recognition-error');
        recognition.onend = () => fail(session, 'ended-before-start');
        update('checking');
        try { recognition.start(); } catch { fail(session, 'start-failed'); }
      },
    };
  }
  globalThis.RuRiRuMicrophoneSetup = Object.freeze({ createMicrophoneSetup });
})();
