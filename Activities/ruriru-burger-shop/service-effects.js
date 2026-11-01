(() => {
  function createServiceEffects({
    voice,
    send = () => {},
    setTimer = (callback, delay) => globalThis.setTimeout(callback, delay),
    clearTimer = id => globalThis.clearTimeout(id),
    onArrive = () => {},
    onPresent = () => {},
    onClearProducts = () => {},
    onDepart = () => {},
    onComplete = () => {},
  } = {}) {
    let generation = 0, current = null;
    const timers = new Set();
    const timing = {
      arrive: { delay: 400, event: 'arrived', hook: onArrive },
      hold: { delay: 1200, event: 'hold-finished' },
      present: { delay: 550, event: 'handoff-finished', hook: onPresent },
      inspect: { delay: 500, event: 'inspection-finished' },
      depart: { delay: 350, event: 'departure-finished', hook: onDepart },
    };

    function cancel() {
      generation++;
      current = null;
      for (const timer of timers) clearTimer(timer);
      timers.clear();
      try { voice?.cancel(); } catch { /* A failed stop must not reactivate old work. */ }
    }

    const isCurrent = request => current === request && request.generation === generation;

    function run(effect) {
      if (!effect) return;
      if (effect.type === 'clear-products') {
        onClearProducts(effect);
        return;
      }
      if (effect.type !== 'speak' && effect.type !== 'complete' && !timing[effect.type]) return;
      cancel();
      if (effect.type === 'complete') { onComplete(effect); return; }
      const request = { effect, generation, started: false, attempts: 0 };
      current = request;
      if (effect.type === 'speak') {
        const play = () => {
          if (!isCurrent(request)) return;
          request.attempts++;
          let playback;
          try { playback = voice.speak(effect.text); }
          catch { playback = false; }
          const finished = ok => {
            if (!isCurrent(request)) return;
            if (ok !== true && request.attempts < 2) { play(); return; }
            current = null;
            send({ type: 'audio-ended', id: effect.id, ok: ok === true });
          };
          Promise.resolve(playback).then(finished, () => finished(false));
        };
        play();
        return;
      }
      const step = timing[effect.type];
      step.hook?.(effect);
      if (!isCurrent(request)) return;
      const duration = Number.isFinite(effect.duration) && effect.duration >= 0 ? effect.duration : step.delay;
      const timer = setTimer(() => {
        if (!isCurrent(request)) return;
        timers.delete(timer);
        clearTimer(timer);
        current = null;
        send({ type: step.event });
      }, duration);
      timers.add(timer);
    }

    function audioStarted() {
      if (!current || current.effect.type !== 'speak' || current.started) return;
      current.started = true;
      send({ type: 'audio-started', id: current.effect.id });
    }

    return { run, cancel, audioStarted };
  }

  globalThis.RuRiRuServiceEffects = Object.freeze({ createServiceEffects });
})();
