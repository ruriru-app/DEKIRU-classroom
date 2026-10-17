(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MemorizeCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const CONTRACTIONS = Object.freeze({
    "i'm": 'i am',
    "you're": 'you are',
    "we're": 'we are',
    "they're": 'they are',
    "it's": 'it is',
    "that's": 'that is',
    "don't": 'do not',
    "doesn't": 'does not',
    "didn't": 'did not',
    "can't": 'can not',
    cannot: 'can not',
    "won't": 'will not',
    "isn't": 'is not',
    "aren't": 'are not',
    "wasn't": 'was not',
    "weren't": 'were not',
    "i've": 'i have',
    "we've": 'we have',
    "i'll": 'i will',
    "we'll": 'we will',
    "let's": 'let us',
    "he's": 'he is',
    "she's": 'she is',
    "there's": 'there is',
    "what's": 'what is',
    "who's": 'who is',
    "where's": 'where is',
    "how's": 'how is',
    "you've": 'you have',
    "they've": 'they have',
    "you'll": 'you will',
    "he'll": 'he will',
    "she'll": 'she will',
    "they'll": 'they will',
    "it'll": 'it will',
    "couldn't": 'could not',
    "shouldn't": 'should not',
    "wouldn't": 'would not',
    "haven't": 'have not',
    "hasn't": 'has not',
    "hadn't": 'had not',
    "mustn't": 'must not',
    "needn't": 'need not',
  });
  const CONNECTORS = Object.freeze([
    ['after', 'that'],
    ['first'],
    ['next'],
    ['then'],
    ['and'],
    ['but'],
    ['so'],
    ['also'],
    ['finally'],
    ['because'],
  ]);
  const JAPANESE_RUN_PATTERN = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}々〆ヶー・]+/gu;
  const MARKED_NAME_PATTERN = /\[\[([^\]\r\n]*?)\]\]/g;

  const contractionPattern = new RegExp(
    `\\b(?:${Object.keys(CONTRACTIONS)
      .sort((a, b) => b.length - a.length)
      .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|')})\\b`,
    'g',
  );

  function normalizeTokens(value) {
    let normalized = String(value ?? '')
      .normalize('NFKC')
      .replace(/[‘’]/g, "'")
      .toLowerCase();
    normalized = normalized.replace(contractionPattern, (word) => CONTRACTIONS[word]);
    normalized = normalized.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    return normalized ? normalized.split(/\s+/) : [];
  }

  function appendExactPart(parts, value) {
    const tokens = normalizeTokens(value);
    if (!tokens.length) return;
    const previous = parts[parts.length - 1];
    if (previous?.type === 'exact') previous.tokens.push(...tokens);
    else parts.push({ type: 'exact', tokens });
  }

  function appendNamePart(parts, label) {
    const trimmed = String(label ?? '').trim();
    if (!trimmed) return;
    const previous = parts[parts.length - 1];
    if (previous?.type === 'name') previous.label = `${previous.label} ${trimmed}`;
    else parts.push({ type: 'name', label: trimmed });
  }

  function appendAutomaticParts(parts, value) {
    let cursor = 0;
    for (const match of String(value ?? '').matchAll(JAPANESE_RUN_PATTERN)) {
      appendExactPart(parts, value.slice(cursor, match.index));
      appendNamePart(parts, match[0]);
      cursor = match.index + match[0].length;
    }
    appendExactPart(parts, value.slice(cursor));
  }

  function parseSentence(text) {
    const parts = [];
    let displayText = '';
    let cursor = 0;
    for (const match of text.matchAll(MARKED_NAME_PATTERN)) {
      const before = text.slice(cursor, match.index);
      displayText += before;
      appendAutomaticParts(parts, before);

      const label = match[1].trim();
      if (label) {
        displayText += label;
        appendNamePart(parts, label);
      } else {
        displayText += match[0];
        appendAutomaticParts(parts, match[0]);
      }
      cursor = match.index + match[0].length;
    }
    const after = text.slice(cursor);
    displayText += after;
    appendAutomaticParts(parts, after);

    const sentence = { text: displayText, tokens: normalizeTokens(displayText) };
    if (parts.some(({ type }) => type === 'name')) sentence.matchParts = parts;
    return sentence;
  }

  function splitSingleLine(line) {
    const chunks = [];
    const closers = new Set(['"', "'", '”', '’', ')', ']', '}']);
    let start = 0;
    let index = 0;
    while (index < line.length) {
      if (!'.!?'.includes(line[index])) {
        index += 1;
        continue;
      }
      let end = index + 1;
      while (end < line.length && '.!?'.includes(line[end])) end += 1;
      while (end < line.length && closers.has(line[end])) end += 1;
      const chunk = line.slice(start, end).trim();
      if (chunk) chunks.push(chunk);
      while (end < line.length && /\s/.test(line[end])) end += 1;
      start = end;
      index = end;
    }
    const tail = line.slice(start).trim();
    if (tail) chunks.push(tail);
    return chunks;
  }

  function parseSpeech(value) {
    const normalizedLines = String(value ?? '').replace(/\r\n?/g, '\n');
    const nonEmptyLines = normalizedLines
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (!nonEmptyLines.length) return [];

    const chunks = nonEmptyLines.length > 1
      ? nonEmptyLines
      : splitSingleLine(nonEmptyLines[0]);

    return chunks
      .map(parseSentence)
      .filter((sentence) => sentence.tokens.length)
      .map((sentence, index) => ({ id: `sentence-${index}`, ...sentence }));
  }

  function speechFingerprint(sentences) {
    const source = (Array.isArray(sentences) ? sentences : [])
      .map((sentence) => {
        if (Array.isArray(sentence?.matchParts)) {
          return sentence.matchParts.map((part) => {
            if (part?.type === 'name') return `name:${normalizeTokens(part.label).join('\u001d')}`;
            return `exact:${Array.isArray(part?.tokens) ? part.tokens.join('\u001d') : ''}`;
          }).join('\u001c');
        }
        return Array.isArray(sentence?.tokens) ? sentence.tokens.join('\u001f') : '';
      })
      .join('\u001e');
    let hash = 0x811c9dc5;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return `v1-${hash.toString(16).padStart(8, '0')}`;
  }

  function stage(id, label, sentenceIndexes, sentences) {
    return {
      id,
      label,
      sentenceIndexes,
      sentences: sentenceIndexes.map((index) => sentences[index]),
    };
  }

  function buildStages(sentences, difficulty) {
    const source = Array.isArray(sentences) ? sentences : [];
    if (!source.length) return [];
    if (difficulty === 'beginner') {
      return source.map((_, index) => stage(`sentence-${index}`, `${index + 1}文目`, [index], source));
    }
    if (difficulty === 'intermediate') {
      const split = Math.ceil(source.length / 2);
      const first = Array.from({ length: split }, (_, index) => index);
      const second = Array.from({ length: source.length - split }, (_, index) => split + index);
      const stages = [stage('half-0', source.length === 1 ? '全文' : '前半', first, source)];
      if (second.length) stages.push(stage('half-1', '後半', second, source));
      return stages;
    }
    if (difficulty === 'advanced') {
      const indexes = Array.from({ length: source.length }, (_, index) => index);
      return [stage('full', '全文', indexes, source)];
    }
    return [];
  }

  function progressSegments(stages) {
    const segments = (Array.isArray(stages) ? stages : []).map((item) => ({
      id: String(item?.id ?? ''),
      units: Math.max(1, Array.isArray(item?.sentenceIndexes)
        ? item.sentenceIndexes.length
        : Array.isArray(item?.sentences) ? item.sentences.length : 1),
    }));
    return {
      totalUnits: segments.reduce((total, { units }) => total + units, 0),
      segments,
    };
  }

  function stageIdsByDifficulty(sentences) {
    return {
      beginner: buildStages(sentences, 'beginner').map(({ id }) => id),
      intermediate: buildStages(sentences, 'intermediate').map(({ id }) => id),
      advanced: buildStages(sentences, 'advanced').map(({ id }) => id),
    };
  }

  function layoutFor(sentenceCount, availableWidth) {
    const count = Math.max(0, Number(sentenceCount) || 0);
    const width = Math.max(0, Number(availableWidth) || 0);
    let columns = 1;
    if (count > 7 && width >= 760) columns = count <= 10 || width < 1100 ? 2 : 3;
    return {
      columns,
      rows: count ? Math.ceil(count / columns) : 0,
      writingLines: columns === 1,
    };
  }

  function sentencePresentation(sentences, stages, completedStageIds, selectedStageId) {
    const source = Array.isArray(sentences) ? sentences : [];
    const stageList = Array.isArray(stages) ? stages : [];
    const completed = new Set(Array.isArray(completedStageIds) ? completedStageIds : []);
    const active = new Set(
      stageList.find(({ id }) => id === selectedStageId)?.sentenceIndexes || [],
    );
    const cleared = new Set();
    for (const stageItem of stageList) {
      if (!completed.has(stageItem.id)) continue;
      for (const index of stageItem.sentenceIndexes) cleared.add(index);
    }
    return source.map((sentence, index) => ({
      sentence,
      index,
      active: active.has(index),
      cleared: cleared.has(index),
    }));
  }

  function sentenceCardView(item, hintOpen) {
    const index = Math.max(0, Number(item?.index) || 0);
    return {
      numberLabel: `${index + 1}.`,
      checked: Boolean(item?.cleared || item?.attemptMatched),
      revealed: Boolean(hintOpen && item?.active),
    };
  }

  function practiceActionFor(state) {
    if (state?.recognitionState === 'listening') {
      return { label: 'できた！', mode: 'stop', disabled: false };
    }
    if (state?.recognitionState === 'stopping') {
      return { label: '判定中…', mode: 'stopping', disabled: true };
    }
    const disabled = !state
      || state.recognitionState !== 'idle'
      || state.attemptState === 'hint-open';
    return { label: 'スタート', mode: 'start', disabled };
  }

  function manuscriptConfirmationFor(state) {
    const open = state?.attemptState === 'hint-open';
    return { label: open ? '英文を閉じる' : '英文を確認する', open };
  }

  function emptyProgress(fingerprint) {
    return {
      schemaVersion: 1,
      fingerprint,
      completed: { beginner: [], intermediate: [], advanced: [] },
    };
  }

  function reconcileProgress(value, fingerprint, validIds) {
    const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
    const compatible = isObject && value.schemaVersion === 1 && value.fingerprint === fingerprint;
    const status = !isObject ? 'new' : compatible ? 'same' : 'reset';
    const progress = emptyProgress(fingerprint);
    if (!compatible) return { status, progress };

    for (const difficulty of ['beginner', 'intermediate', 'advanced']) {
      const allowed = new Set(Array.isArray(validIds?.[difficulty]) ? validIds[difficulty] : []);
      const stored = Array.isArray(value.completed?.[difficulty]) ? value.completed[difficulty] : [];
      progress.completed[difficulty] = [...new Set(stored.filter((id) => typeof id === 'string' && allowed.has(id)))];
    }
    return { status, progress };
  }

  function matchTranscript(sentences, transcript) {
    const actualTokens = normalizeTokens(transcript);
    const source = (Array.isArray(sentences) ? sentences : [])
      .map((sentence) => {
        if (Array.isArray(sentence?.matchParts)) return sentence.matchParts;
        const tokens = Array.isArray(sentence?.tokens) ? sentence.tokens : [];
        return tokens.length ? [{ type: 'exact', tokens }] : [];
      })
      .filter((parts) => parts.length);
    const sentenceMemo = new Map();
    const partMemo = new Map();

    function tokensMatch(expected, cursor) {
      return cursor + expected.length <= actualTokens.length
        && expected.every((token, offset) => token === actualTokens[cursor + offset]);
    }

    function visit(sentenceIndex, cursor) {
      const key = `${sentenceIndex}:${cursor}`;
      if (sentenceMemo.has(key)) return sentenceMemo.get(key);
      if (sentenceIndex === source.length) return cursor === actualTokens.length;

      const starts = [cursor];
      for (const connector of CONNECTORS) {
        if (tokensMatch(connector, cursor)) starts.push(cursor + connector.length);
      }
      const matched = starts.some((start) => visitPart(sentenceIndex, 0, start));
      sentenceMemo.set(key, matched);
      return matched;
    }

    function visitPart(sentenceIndex, partIndex, cursor) {
      const key = `${sentenceIndex}:${partIndex}:${cursor}`;
      if (partMemo.has(key)) return partMemo.get(key);
      const parts = source[sentenceIndex];
      if (partIndex === parts.length) return visit(sentenceIndex + 1, cursor);

      const part = parts[partIndex];
      let matched = false;
      if (part.type === 'name') {
        for (let end = cursor + 1; end <= actualTokens.length && !matched; end += 1) {
          matched = visitPart(sentenceIndex, partIndex + 1, end);
        }
      } else if (tokensMatch(part.tokens, cursor)) {
        matched = visitPart(sentenceIndex, partIndex + 1, cursor + part.tokens.length);
      }
      partMemo.set(key, matched);
      return matched;
    }

    function diagnosticSentenceMatches() {
      const endsMemo = new Map();
      const bestMemo = new Map();

      function matchingEnds(sentenceIndex, partIndex, cursor) {
        const key = `${sentenceIndex}:${partIndex}:${cursor}`;
        if (endsMemo.has(key)) return endsMemo.get(key);
        const parts = source[sentenceIndex];
        if (partIndex === parts.length) return [cursor];

        const part = parts[partIndex];
        const ends = [];
        if (part.type === 'name') {
          for (let end = cursor + 1; end <= actualTokens.length; end += 1) {
            ends.push(...matchingEnds(sentenceIndex, partIndex + 1, end));
          }
        } else if (tokensMatch(part.tokens, cursor)) {
          ends.push(...matchingEnds(sentenceIndex, partIndex + 1, cursor + part.tokens.length));
        }
        const unique = [...new Set(ends)];
        endsMemo.set(key, unique);
        return unique;
      }

      function isBetter(candidate, current) {
        if (!current || candidate.score !== current.score) return !current || candidate.score > current.score;
        for (let index = 0; index < candidate.matches.length; index += 1) {
          if (candidate.matches[index] !== current.matches[index]) return candidate.matches[index];
        }
        return false;
      }

      function best(sentenceIndex, cursor) {
        const key = `${sentenceIndex}:${cursor}`;
        if (bestMemo.has(key)) return bestMemo.get(key);
        if (sentenceIndex === source.length) return { score: 0, matches: [] };

        let result = null;
        for (const end of matchingEnds(sentenceIndex, 0, cursor)) {
          const tail = best(sentenceIndex + 1, end);
          const candidate = { score: tail.score + 1, matches: [true, ...tail.matches] };
          if (isBetter(candidate, result)) result = candidate;
        }

        const missedTail = best(sentenceIndex + 1, cursor);
        const missed = { score: missedTail.score, matches: [false, ...missedTail.matches] };
        if (isBetter(missed, result)) result = missed;

        if (cursor < actualTokens.length) {
          const skipped = best(sentenceIndex, cursor + 1);
          if (isBetter(skipped, result)) result = skipped;
        }
        bestMemo.set(key, result);
        return result;
      }

      return source.length ? best(0, 0).matches : [];
    }

    const matched = source.length > 0 && visit(0, 0);
    const sentenceMatches = matched ? source.map(() => true) : diagnosticSentenceMatches();
    return { matched, actualTokens, sentenceMatches };
  }

  function cloneCompleted(completed) {
    return {
      beginner: [...(completed?.beginner || [])],
      intermediate: [...(completed?.intermediate || [])],
      advanced: [...(completed?.advanced || [])],
    };
  }

  function isDifficultyComplete(state, difficulty = state.selectedDifficulty, completed = state.completed) {
    const ids = (state.stagesByDifficulty[difficulty] || []).map(({ id }) => id);
    const cleared = new Set(completed[difficulty] || []);
    return ids.length > 0 && ids.every((id) => cleared.has(id));
  }

  function createSession(sentences, progress, recognitionSupported) {
    const source = Array.isArray(sentences) ? sentences : [];
    const stagesByDifficulty = {
      beginner: buildStages(source, 'beginner'),
      intermediate: buildStages(source, 'intermediate'),
      advanced: buildStages(source, 'advanced'),
    };
    const state = {
      sentences: source,
      fingerprint: progress?.fingerprint || speechFingerprint(source),
      stagesByDifficulty,
      selectedDifficulty: 'beginner',
      selectedStageId: stagesByDifficulty.beginner[0]?.id || null,
      recognitionState: recognitionSupported ? 'idle' : 'unsupported',
      attemptState: 'locked',
      lastTranscript: '',
      lastResult: null,
      lastSentenceMatches: [],
      completed: cloneCompleted(progress?.completed),
      difficultyComplete: false,
    };
    state.difficultyComplete = isDifficultyComplete(state);
    return state;
  }

  function resetForStage(state, patch = {}) {
    const next = {
      ...state,
      ...patch,
      recognitionState: state.recognitionState === 'unsupported' ? 'unsupported' : 'idle',
      attemptState: 'locked',
      lastTranscript: '',
      lastResult: null,
      lastSentenceMatches: [],
      completed: cloneCompleted(state.completed),
    };
    next.difficultyComplete = isDifficultyComplete(next);
    return next;
  }

  function transition(state, event) {
    if (!state || !event || typeof event.type !== 'string') return state;
    const active = state.recognitionState === 'listening' || state.recognitionState === 'stopping';

    if (event.type === 'select-difficulty') {
      if (active || !['beginner', 'intermediate', 'advanced'].includes(event.difficulty)) return state;
      const stages = state.stagesByDifficulty[event.difficulty] || [];
      const cleared = new Set(state.completed[event.difficulty] || []);
      const selected = stages.find(({ id }) => !cleared.has(id)) || stages[0];
      return resetForStage(state, {
        selectedDifficulty: event.difficulty,
        selectedStageId: selected?.id || null,
      });
    }

    if (event.type === 'select-stage') {
      if (active || !(state.stagesByDifficulty[state.selectedDifficulty] || []).some(({ id }) => id === event.stageId)) return state;
      return resetForStage(state, { selectedStageId: event.stageId });
    }

    if (event.type === 'restart-stage') {
      if (active) return state;
      return resetForStage(state);
    }

    if (event.type === 'start-listening') {
      if (state.recognitionState !== 'idle' || state.attemptState === 'hint-open') return state;
      return {
        ...state,
        recognitionState: 'listening',
        lastTranscript: '',
        lastResult: null,
        lastSentenceMatches: [],
        completed: cloneCompleted(state.completed),
      };
    }

    if (event.type === 'request-stop') {
      if (state.recognitionState !== 'listening') return state;
      return { ...state, recognitionState: 'stopping', completed: cloneCompleted(state.completed) };
    }

    if (event.type === 'recognition-error') {
      if (!active) return state;
      return {
        ...state,
        recognitionState: 'idle',
        lastTranscript: '',
        lastResult: 'error',
        lastSentenceMatches: [],
        completed: cloneCompleted(state.completed),
      };
    }

    if (event.type === 'open-hint') {
      if (state.recognitionState !== 'idle' || state.attemptState !== 'hint-available') return state;
      return { ...state, attemptState: 'hint-open', completed: cloneCompleted(state.completed) };
    }

    if (event.type === 'close-hint') {
      if (state.attemptState !== 'hint-open') return state;
      return { ...state, attemptState: 'hint-available', completed: cloneCompleted(state.completed) };
    }

    if (event.type === 'attempt-result') {
      if (state.recognitionState !== 'stopping') return state;
      if (!event.matched) {
        const stage = (state.stagesByDifficulty[state.selectedDifficulty] || [])
          .find(({ id }) => id === state.selectedStageId);
        const flags = Array.isArray(event.sentenceMatches) ? event.sentenceMatches : [];
        return {
          ...state,
          recognitionState: 'idle',
          attemptState: 'hint-available',
          lastTranscript: String(event.transcript ?? ''),
          lastResult: 'incorrect',
          lastSentenceMatches: (stage?.sentences || [])
            .filter((_, index) => Boolean(flags[index]))
            .map(({ id }) => id),
          completed: cloneCompleted(state.completed),
        };
      }

      const completed = cloneCompleted(state.completed);
      if (state.selectedStageId && !completed[state.selectedDifficulty].includes(state.selectedStageId)) {
        completed[state.selectedDifficulty].push(state.selectedStageId);
      }
      const stages = state.stagesByDifficulty[state.selectedDifficulty] || [];
      const cleared = new Set(completed[state.selectedDifficulty]);
      const currentIndex = Math.max(0, stages.findIndex(({ id }) => id === state.selectedStageId));
      const ordered = stages.slice(currentIndex + 1).concat(stages.slice(0, currentIndex));
      const nextStage = ordered.find(({ id }) => !cleared.has(id));
      const next = {
        ...state,
        selectedStageId: nextStage?.id || state.selectedStageId,
        recognitionState: 'idle',
        attemptState: 'locked',
        lastTranscript: String(event.transcript ?? ''),
        lastResult: 'correct',
        lastSentenceMatches: [],
        completed,
      };
      next.difficultyComplete = isDifficultyComplete(next);
      return next;
    }

    return state;
  }

  return Object.freeze({
    normalizeTokens,
    parseSpeech,
    speechFingerprint,
    buildStages,
    progressSegments,
    stageIdsByDifficulty,
    layoutFor,
    sentencePresentation,
    sentenceCardView,
    practiceActionFor,
    manuscriptConfirmationFor,
    reconcileProgress,
    matchTranscript,
    createSession,
    transition,
  });
});
