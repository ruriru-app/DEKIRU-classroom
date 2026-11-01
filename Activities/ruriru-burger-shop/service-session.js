(() => {
  const { matchOrder, readSpokenYen } = globalThis.RuRiRuServiceValidation;
  const defaultOrder = [
    { id: 'cheeseburger', quantity: 2 }, { id: 'french-fries', quantity: 2 },
    { id: 'apple-pie', quantity: 2 }, { id: 'cola', quantity: 2 },
  ];
  const counts = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const clone = value => JSON.parse(JSON.stringify(value));
  const normalizedQuestion = text => String(text).normalize('NFKC').toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
  const hasHandoff = text => /\bhere\s+you\s+are\b/i.test(String(text).replace(/[^a-z\s]/gi, ' '));
  function correctPrice(text, total) {
    const value = String(text).normalize('NFKC').replace(/’/g, "'");
    const amount = readSpokenYen(value);
    return /\b(?:it's|it\s+is)\s+(?!not\b)/i.test(value) && amount.status === 'valid' && amount.amount === total;
  }
  function orderPhrase(order, products) {
    const named = order.map(({ id, quantity }) => {
      const product = products.find(item => item.id === id);
      const singular = id === 'french-fries' ? 'fries' : product.name.toLowerCase();
      const plural = id === 'french-fries' || /s$/.test(singular) ? singular : `${singular}s`;
      return `${counts[quantity] || quantity} ${quantity === 1 ? singular : plural}`;
    });
    return named.length === 1 ? named[0] : named.length === 2 ? named.join(' and ') : `${named.slice(0, -1).join(', ')}, and ${named.at(-1)}`;
  }

  function createServiceSession({ products, order = defaultOrder, now = Date.now, greeting = 'Hello!' } = {}) {
    if (!Array.isArray(products) || !products.length) throw new TypeError('Product catalog is required');
    matchOrder(order, []);
    if (order.some(line => !products.some(product => product.id === line.id))) throw new TypeError('Unknown ordered product');
    const fixedOrder = clone(order);
    const expectedTotal = fixedOrder.reduce((sum, line) => sum + products.find(item => item.id === line.id).price * line.quantity, 0);
    const phrase = orderPhrase(fixedOrder, products);
    const orderText = `I'd like ${phrase}, please.`;
    const correctiveText = `I ordered ${phrase}.`;
    let effects = [], nextAudioId = 0, elapsed = 0, lastTime = now();
    let phase, expression, requestMode, audio, retryPending, remaining, stats;
    let handedOver, cachedPrice, submittedItems, orderIssued, lastOrderText, correctionCleared, attempt, suspended, operation, holdAfter;

    function initialize() {
      phase = 'idle'; expression = 'neutral'; requestMode = 'question'; audio = null;
      retryPending = false; remaining = { question: 2, checkout: 2 };
      stats = { questionMistakes: 0, productMistakes: 0, checkoutMistakes: 0, rescueUses: 0, replayCount: 0, penalty: 0 };
      handedOver = false; cachedPrice = false; submittedItems = []; orderIssued = false;
      lastOrderText = orderText; correctionCleared = false; attempt = 'idle'; suspended = null; operation = null;
      holdAfter = null;
      elapsed = 0; lastTime = now(); effects = [];
    }
    initialize();
    const timed = () => attempt !== 'processing' && (['question', 'checkout', 'order'].includes(phase) ||
      (phase === 'product-feedback' && correctionCleared));
    function settleTime() {
      const time = now();
      if (timed()) elapsed += Math.max(0, time - lastTime);
      lastTime = time;
    }
    function emit(type, duration) {
      operation = { type, duration };
      effects.push({ ...operation });
    }
    function speak(text, kind, after) {
      audio = { id: ++nextAudioId, text, kind, after, started: false };
      operation = null;
      effects.push({ type: 'speak', id: audio.id, text, kind });
    }
    function ready(mode = requestMode) {
      phase = mode === 'question' ? 'question' : 'checkout';
      requestMode = mode; attempt = 'idle'; audio = null; operation = null;
    }
    function mistake(kind) {
      const bucket = kind === 'question' ? 'question' : 'checkout';
      if (remaining[bucket] > 0) {
        remaining[bucket]--;
        retryPending = true;
      } else {
        if (kind === 'question') stats.questionMistakes++;
        else stats.checkoutMistakes++;
        stats.penalty += 120;
      }
      requestMode = kind === 'question' ? 'question' : kind === 'handoff' ? 'handoff' : 'price';
      expression = 'troubled';
      phase = `${kind}-feedback`;
      speak(kind === 'question' ? 'Pardon?' : kind === 'handoff' ? "Where's my order?" : 'Really?', `${kind}-error`, kind);
    }
    function success() {
      phase = 'hold'; expression = 'neutral'; audio = null; attempt = 'idle';
      holdAfter = 'thanks';
      emit('hold', 1200);
    }
    function judgeItems() {
      if (!matchOrder(fixedOrder, submittedItems).matches) {
        stats.productMistakes++; stats.penalty += 200;
        phase = 'product-feedback'; expression = 'angry';
        cachedPrice = false; correctionCleared = false; lastOrderText = correctiveText;
        speak('This is not what I ordered.', 'product-complaint', 'product-complaint');
      } else if (!cachedPrice) mistake('price');
      else success();
    }
    function suspend(target, source) {
      if (['idle', 'complete', 'paused', 'technical'].includes(phase)) return;
      suspended = { phase, audio: audio ? { ...audio } : null, operation: operation ? { ...operation } : null };
      phase = target; audio = null; operation = null; attempt = 'idle';
      if (source) suspended.source = source;
    }
    function restore() {
      if (!suspended) return;
      const previous = suspended; suspended = null; phase = previous.phase;
      if (previous.audio) speak(previous.audio.text, previous.audio.kind, previous.audio.after);
      else if (previous.operation) emit(previous.operation.type, previous.operation.duration);
    }
    function replay(technical) {
      if (!canReplay()) return;
      if (!technical) {
        stats.replayCount++;
        if (stats.replayCount > 1) stats.penalty += 5;
      }
      const after = audio?.kind === 'replay' ? audio.after : {
        replay: true,
        mode: phase === 'order' || phase === 'product-feedback' ? 'checkout' : requestMode,
        expression: phase === 'product-feedback' ? 'troubled' : expression,
      };
      phase = 'order'; attempt = 'idle';
      speak(lastOrderText, 'replay', after);
    }
    function canReplay() {
      return orderIssued && attempt === 'idle' &&
        (phase === 'checkout' || phase === 'order' ||
          (phase === 'product-feedback' && audio?.kind === 'corrective' && audio.started));
    }
    function dispatch(event = {}) {
      settleTime();
      switch (event.type) {
        case 'reset': initialize(); break;
        case 'start':
          if (phase !== 'idle') break;
          phase = 'arriving'; emit('arrive', 400); break;
        case 'arrived':
          if (phase !== 'arriving') break;
          phase = 'greeting'; speak(greeting === 'Hi!' ? greeting : 'Hello!', 'greeting', 'greeting'); break;
        case 'audio-started':
          if (!audio || audio.id !== event.id || audio.started) break;
          audio.started = true;
          break;
        case 'audio-ended': {
          if (!audio || audio.id !== event.id) break;
          if (event.ok === false) { suspend('technical', 'audio'); break; }
          const after = audio.after; audio = null;
          if (after?.replay) { expression = after.expression; ready(after.mode); }
          else if (after === 'greeting' || after === 'question') ready('question');
          else if (after === 'order') ready('checkout');
          else if (after === 'product-complaint') {
            correctionCleared = true; handedOver = false;
            effects.push({ type: 'clear-products', duration: 300 });
            emit('correction-wait', 2300);
          }
          else if (after === 'corrective') { expression = 'troubled'; ready('checkout'); cachedPrice = false; }
          else if (after === 'handoff') ready('handoff');
          else if (after === 'price') ready('price');
          else if (after === 'thanks') { phase = 'departing'; emit('depart', 350); }
          break;
        }
        case 'attempt-start':
          if (['question', 'checkout'].includes(phase) && !audio && !retryPending && attempt === 'idle') attempt = 'recording';
          break;
        case 'attempt-finish': if (attempt === 'recording') attempt = 'processing'; break;
        case 'attempt-cancel': if (['question', 'checkout'].includes(phase)) attempt = 'idle'; break;
        case 'submit': {
          if (!['question', 'checkout'].includes(phase) || audio || retryPending || attempt === 'recording') break;
          attempt = 'idle';
          const text = typeof event.text === 'string' ? event.text.trim() : '';
          if (!text) { suspend('technical', 'recognition'); break; }
          if (phase === 'question') {
            if (normalizedQuestion(text) !== 'what would you like') mistake('question');
            else {
              phase = 'hold'; holdAfter = 'order'; expression = 'neutral';
              emit('hold', 1200);
            }
          } else if (requestMode === 'price') {
            if (correctPrice(text, expectedTotal)) { cachedPrice = true; success(); }
            else mistake('price');
          } else {
            if (requestMode === 'checkout') cachedPrice = correctPrice(text, expectedTotal);
            if (!hasHandoff(text)) { mistake('handoff'); break; }
            submittedItems = clone(Array.isArray(event.items) ? event.items : []);
            handedOver = true; phase = 'handoff'; expression = 'neutral'; emit('present', 550);
          }
          break;
        }
        case 'retry':
          if (!retryPending || !['question', 'checkout'].includes(phase)) break;
          retryPending = false; stats.rescueUses++; stats.penalty += 5; attempt = 'idle'; break;
        case 'handoff-finished':
          if (phase !== 'handoff') break;
          phase = 'inspection'; emit('inspect', 500); break;
        case 'inspection-finished':
          if (phase !== 'inspection') break;
          operation = null; judgeItems(); break;
        case 'correction-wait-finished':
          if (phase !== 'product-feedback' || operation?.type !== 'correction-wait' || !correctionCleared || audio) break;
          operation = null; speak(correctiveText, 'corrective', 'corrective'); break;
        case 'hold-finished':
          if (phase !== 'hold') break;
          if (holdAfter === 'order') {
            phase = 'order'; orderIssued = true; lastOrderText = orderText;
            speak(orderText, 'order', 'order');
          } else { phase = 'thanking'; expression = 'smile'; speak('Thank you!', 'thanks', 'thanks'); }
          holdAfter = null; break;
        case 'departure-finished':
          if (phase !== 'departing') break;
          phase = 'complete'; operation = null; effects.push({ type: 'complete' }); break;
        case 'replay': replay(event.technical === true); break;
        case 'pause': suspend('paused'); break;
        case 'resume': if (phase === 'paused') restore(); break;
        case 'technical-error': suspend('technical', event.source || 'unknown'); break;
        case 'recover': if (phase === 'technical') restore(); break;
        case 'items-changed':
          if (['checkout', 'order'].includes(phase) && attempt === 'idle' && handedOver) {
            handedOver = false; cachedPrice = false; requestMode = 'checkout';
            if (audio?.after?.replay) audio.after.mode = 'checkout';
          }
          break;
      }
      return view();
    }
    function view() {
      const elapsedMs = elapsed + (timed() ? Math.max(0, now() - lastTime) : 0);
      const mistakes = stats.questionMistakes + stats.productMistakes + stats.checkoutMistakes;
      return {
        phase, expression, requestMode, requestPhase: suspended?.phase || phase,
        canRecord: ['question', 'checkout'].includes(phase) && !audio && !retryPending && attempt === 'idle',
        canEdit: attempt === 'idle' && (phase === 'checkout' || phase === 'order' || (phase === 'product-feedback' && correctionCleared)),
        canReplay: canReplay(), retryPending, remaining: { ...remaining },
        audio: audio ? { id: audio.id, text: audio.text, kind: audio.kind } : null,
        handedOver, order: clone(fixedOrder), expectedTotal, orderText, correctiveText,
        stats: { ...stats }, elapsedMs, timerRunning: timed(), complete: phase === 'complete',
        score: Math.max(0, 1000 - stats.penalty - Math.min(200, Math.round(elapsedMs / 1000))),
        stars: mistakes === 0 ? 3 : mistakes <= 1 ? 2 : 1,
      };
    }
    return { dispatch, view, takeEffects() { const result = effects; effects = []; return result; } };
  }
  globalThis.RuRiRuServiceSession = Object.freeze({ createServiceSession });
})();
