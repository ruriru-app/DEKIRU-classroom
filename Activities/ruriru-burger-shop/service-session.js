(() => {
  const { matchOrder, readSpokenYen } = globalThis.RuRiRuServiceValidation;
  const defaultOrder = [
    { id: 'cheeseburger', quantity: 2 }, { id: 'french-fries', quantity: 2 },
    { id: 'apple-pie', quantity: 2 }, { id: 'cola', quantity: 2 },
  ];
  const counts = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const clone = value => JSON.parse(JSON.stringify(value));
  const normalizedQuestion = text => String(text).normalize('NFKC').toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
  const hasHandoff = text => /\b(?:here|hear)\s+you\s+are\b/i.test(String(text).replace(/[^a-z\s]/gi, ' '));
  function correctPrice(text, total) {
    const value = String(text).normalize('NFKC').replace(/’/g, "'");
    const amount = readSpokenYen(value, { allowOmittedCurrency: true });
    const canonicalPrefix = /\b(?:it's|it\s+is)\s+(?!not\b)/i.test(value);
    // ASR often drops the short /t/ or apostrophe in It's. Keep this tolerance
    // at the price-clause boundary, followed by an amount, rather than any "is".
    const clause = value.trim().replace(/^(?:here|hear)\s+you\s+are\b[\s.,!?;:]*/i, '');
    const asrPrefix = /^(?:its|it\s+s|is)\s+(.+)$/i.exec(clause);
    const amountStart = /^\$?\s*(?:\d|(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\b|a\s+(?:hundred|thousand)\b)/i;
    return (canonicalPrefix || Boolean(asrPrefix && amountStart.test(asrPrefix[1]))) &&
      amount.status === 'valid' && amount.amount === total;
  }
  function orderPhrase(order, products) {
    const named = order.map(({ id, quantity }) => {
      const product = products.find(item => item.id === id);
      const serving = {
        'french-fries': ['fries', 'fries'],
        'chicken-nuggets': ['box of nuggets', 'boxes of nuggets'],
        'onion-rings': ['order of onion rings', 'orders of onion rings'],
        'water': ['cup of water', 'cups of water'],
      }[id];
      const singular = serving ? serving[0] : product.name.toLowerCase();
      const plural = serving ? serving[1] : /s$/.test(singular) ? singular : `${singular}s`;
      return `${counts[quantity] || quantity} ${quantity === 1 ? singular : plural}`;
    });
    return named.length === 1 ? named[0] : named.length === 2 ? named.join(' and ') : `${named.slice(0, -1).join(', ')}, and ${named.at(-1)}`;
  }

  function createServiceSession({ level = 4, products, customers, order = defaultOrder, now = Date.now, greeting = 'Hello!' } = {}) {
    const rules = globalThis.RuRiRuLevels ? globalThis.RuRiRuLevels.getLevelRules(level) : level === 4 ?
      { typeMin: 3, typeMax: 5, totalMin: 6, totalMax: 12, perTypeMax: 5 } : null;
    if (!rules) throw new RangeError('LEVEL must be an integer from 1 to 4; load level-config.js for all levels');
    if (!Array.isArray(products) || !products.length || products.some(product =>
      typeof product?.id !== 'string' || !product.id.trim() || typeof product.name !== 'string' || !product.name.trim() ||
      !Number.isSafeInteger(product.price) || product.price < 0) || new Set(products.map(product => product.id)).size !== products.length) {
      throw new TypeError('A valid product catalog is required');
    }
    function prepareCustomer(customer, explicit) {
      if (!customer || typeof customer.customerId !== 'string' || !customer.customerId.trim()) throw new TypeError('Customer id is required');
      matchOrder(customer.order, []);
      if (customer.order.some(line => !products.some(product => product.id === line.id))) throw new TypeError('Unknown ordered product');
      const totalQuantity = customer.order.reduce((sum, line) => sum + line.quantity, 0);
      if (customer.order.length < rules.typeMin || customer.order.length > rules.typeMax || totalQuantity < rules.totalMin || totalQuantity > rules.totalMax ||
        customer.order.some(line => line.quantity > rules.perTypeMax) || new Set(customer.order.map(line => line.id)).size !== customer.order.length) {
        throw new TypeError(`Customer order must use ${rules.typeMin}–${rules.typeMax} products, ${rules.totalMin}–${rules.totalMax} items and at most ${rules.perTypeMax} of each product`);
      }
      const expectedTotal = customer.order.reduce((sum, line) => sum + products.find(item => item.id === line.id).price * line.quantity, 0);
      if (!Number.isSafeInteger(expectedTotal)) throw new TypeError('Ordered product total is unsafe');
      if (explicit && (!['Hello!', 'Hi!'].includes(customer.greeting) ||
        typeof customer.orderText !== 'string' || customer.orderText.length > 2000 ||
        !(level < 4 ? /^I'd like .+, please\.$/ : /^(?:I'd like .+, please\.|Can I have .+, please\?)$/).test(customer.orderText) ||
        typeof customer.correctiveText !== 'string' || customer.correctiveText.length > 2000 || !/^I ordered .+\.$/.test(customer.correctiveText))) {
        throw new TypeError('Customer greeting and order text must use approved phrases');
      }
      const phrase = explicit ? null : orderPhrase(customer.order, products);
      return { customerId: customer.customerId, order: clone(customer.order), expectedTotal,
        greeting: customer.greeting === 'Hi!' ? 'Hi!' : 'Hello!',
        orderText: explicit ? customer.orderText : `I'd like ${phrase}, please.`,
        correctiveText: explicit ? customer.correctiveText : `I ordered ${phrase}.` };
    }
    if (customers !== undefined && (!Array.isArray(customers) || !customers.length)) throw new TypeError('Customer plan is required');
    const customerPlan = customers === undefined ? [prepareCustomer({ customerId: 'sunhat-woman', order, greeting }, false)] :
      customers.map(customer => prepareCustomer(customer, true));
    if (new Set(customerPlan.map(customer => customer.customerId)).size !== customerPlan.length) throw new TypeError('Customer ids must be distinct');
    let effects = [], nextAudioId = 0, elapsed = 0, lastTime = now();
    let phase, expression, requestMode, audio, retryPending, remaining, stats;
    let handedOver, cachedPrice, submittedItems, orderIssued, lastOrderText, correctionCleared, attempt, suspended, operation, holdAfter;
    let customerIndex, completedCustomers, customerReplayCount, fixedOrder, expectedTotal, orderText, correctiveText, currentGreeting, customerId;
    let hintUsed, hintVisible, errorReaction;

    function initializeCustomer(index) {
      customerIndex = index;
      ({ order: fixedOrder, expectedTotal, orderText, correctiveText, greeting: currentGreeting, customerId } = customerPlan[index]);
      phase = 'idle'; expression = 'neutral'; requestMode = 'question'; audio = null;
      retryPending = false; remaining = { question: 2, checkout: 2 };
      customerReplayCount = 0;
      hintUsed = false; hintVisible = false; errorReaction = '';
      handedOver = false; cachedPrice = false; submittedItems = []; orderIssued = false;
      lastOrderText = orderText; correctionCleared = false; attempt = 'idle'; suspended = null; operation = null;
      holdAfter = null;
    }
    function initialize() {
      stats = { questionMistakes: 0, productMistakes: 0, checkoutMistakes: 0, rescueUses: 0, replayCount: 0, hintUses: 0, penalty: 0 };
      completedCustomers = 0; initializeCustomer(0);
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
      errorReaction = kind === 'question' ? 'Pardon?' : kind === 'handoff' ? "Where's my order?" : 'Really?';
      speak(errorReaction, `${kind}-error`, kind);
    }
    function success() {
      hintVisible = false; errorReaction = '';
      phase = 'hold'; expression = 'neutral'; audio = null; attempt = 'idle';
      holdAfter = 'thanks';
      emit('hold', 1200);
    }
    function judgeItems() {
      if (!matchOrder(fixedOrder, submittedItems).matches) {
        stats.productMistakes++; stats.penalty += 200;
        phase = 'product-feedback'; expression = 'angry';
        hintVisible = false; errorReaction = '';
        cachedPrice = false; correctionCleared = false; lastOrderText = correctiveText;
        speak('This is not what I ordered.', 'product-complaint', 'product-complaint');
      } else if (!cachedPrice) mistake('price');
      else success();
    }
    function suspend(target, source) {
      if (['idle', 'complete', 'paused', 'technical'].includes(phase)) return;
      suspended = { phase, audio: audio ? { ...audio } : null, operation: operation ? { ...operation } : null };
      hintVisible = false;
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
        customerReplayCount++;
        if (customerReplayCount > 1) stats.penalty += 5;
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
    function canHint() {
      return level <= 2 && orderIssued && attempt === 'idle' &&
        (phase === 'checkout' || phase === 'order' || (phase === 'product-feedback' && correctionCleared));
    }
    function reactionText() {
      if (level === 4 || attempt !== 'idle' || ['paused', 'technical'].includes(phase)) return '';
      if (errorReaction && (['question', 'checkout'].includes(phase) || /^(question|handoff|price)-feedback$/.test(phase))) return errorReaction;
      if (level <= 2 && ['greeting', 'thanking'].includes(phase)) return audio?.text || '';
      return '';
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
          phase = 'greeting'; speak(currentGreeting, 'greeting', 'greeting'); break;
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
          if (['question', 'checkout'].includes(phase) && !audio && !retryPending && attempt === 'idle') { attempt = 'recording'; hintVisible = false; }
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
              errorReaction = '';
              phase = 'hold'; holdAfter = 'order'; expression = 'neutral';
              emit('hold', 1200);
            }
          } else if (requestMode === 'price') {
            if (correctPrice(text, expectedTotal)) { cachedPrice = true; success(); }
            else mistake('price');
          } else {
            if (requestMode === 'checkout') cachedPrice = correctPrice(text, expectedTotal);
            if (!hasHandoff(text)) { mistake('handoff'); break; }
            errorReaction = ''; hintVisible = false;
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
          completedCustomers++;
          if (customerIndex + 1 < customerPlan.length) {
            initializeCustomer(customerIndex + 1);
            effects.push({ type: 'clear-products', reason: 'departure', duration: 0 });
            phase = 'arriving'; emit('arrive', 400);
          } else { phase = 'complete'; operation = null; effects.push({ type: 'complete' }); }
          break;
        case 'replay': replay(event.technical === true); break;
        case 'hint-start':
          if (!canHint()) break;
          hintVisible = true;
          if (!hintUsed) { hintUsed = true; stats.hintUses++; stats.penalty += 50; }
          break;
        case 'hint-end': hintVisible = false; break;
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
        level, customerId, customerIndex, customerNumber: customerIndex + 1, customerCount: customerPlan.length, completedCustomers,
        phase, expression, requestMode, requestPhase: suspended?.phase || phase,
        canRecord: ['question', 'checkout'].includes(phase) && !audio && !retryPending && attempt === 'idle',
        canEdit: attempt === 'idle' && (phase === 'checkout' || phase === 'order' || (phase === 'product-feedback' && correctionCleared)),
        canReplay: canReplay(), retryPending, remaining: { ...remaining },
        canHint: canHint(), hintUsed, hintVisible: hintVisible && canHint(), reactionText: reactionText(),
        audio: audio ? { id: audio.id, text: audio.text, kind: audio.kind } : null,
        handedOver, order: clone(fixedOrder), expectedTotal, orderText: lastOrderText, initialOrderText: orderText, correctiveText,
        stats: { ...stats }, elapsedMs, timerRunning: timed(), complete: phase === 'complete',
        score: Math.max(0, 1000 - stats.penalty - Math.min(200, Math.round(elapsedMs / 1000 / customerPlan.length))),
        stars: mistakes === 0 && stats.hintUses === 0 ? 3 : mistakes <= customerPlan.length ? 2 : 1,
      };
    }
    return { dispatch, view, takeEffects() { const result = effects; effects = []; return result; } };
  }
  globalThis.RuRiRuServiceSession = Object.freeze({ createServiceSession });
})();
