(() => {
  function createMicrophoneSetup({ Recognition, onState = () => {}, onError = () => {} } = {}) {
    let state = 'unchecked', active = null;
    const update = next => { state = next; onState(next); };
    function release() {
      const previous = active;
      active = null;
      if (previous) clearTimeout(previous.timer);
      return previous;
    }
    function abort(session) {
      try { session?.recognition.abort(); } catch { /* The check may already be closed. */ }
    }
    function fail(session, error) {
      if (session && active !== session) return;
      abort(release());
      update('error'); onError(error);
    }
    return {
      state: () => state,
      check() {
        if (state === 'checking') return;
        if (!Recognition) { fail(null, 'not-supported'); return; }
        let recognition;
        try { recognition = new Recognition(); } catch { fail(null, 'start-failed'); return; }
        const session = { recognition, started: false, captured: false, releasing: false, timer: null };
        active = session;
        recognition.lang = 'en-US'; recognition.continuous = false;
        function finishCheck() {
          if (active !== session || !session.started || !session.captured || session.releasing) return;
          session.releasing = true;
          clearTimeout(session.timer);
          session.timer = setTimeout(() => fail(session, 'stop-timeout'), 6000);
          abort(session);
        }
        recognition.onstart = () => {
          session.started = true;
          finishCheck();
        };
        recognition.onaudiostart = () => {
          session.captured = true;
          finishCheck();
        };
        recognition.onerror = event => {
          if (session.releasing && event.error === 'aborted') return;
          fail(session, event.error || 'recognition-error');
        };
        recognition.onend = () => {
          if (active !== session) return;
          release();
          if (session.releasing) update('ready');
          else fail(null, 'ended-before-start');
        };
        session.timer = setTimeout(() => fail(session, 'start-timeout'), 20000);
        update('checking');
        try { recognition.start(); } catch { fail(session, 'start-failed'); }
      },
      cancel() {
        if (!active) return;
        abort(release());
        update('unchecked');
      },
    };
  }
  globalThis.RuRiRuMicrophoneSetup = Object.freeze({ createMicrophoneSetup });
})();
