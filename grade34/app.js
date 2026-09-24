(() => {
  "use strict";

  const DATA = window.DEKIRU_DATA || {
    cards: [],
    expressions: [],
    mappings: [],
    categoryLabels: {},
    unitTitles: {},
    lt2UnitTitles: {},
    advancedCategoriesByUnit: {},
  };

  const ASSET_BASE = "../";
  const app = document.getElementById("app");
  const toast = document.getElementById("toast");
  const practice = globalThis.CardPractice?.create();
  const cardById = new Map(DATA.cards.map((card) => [card.id, card]));
  const expressionById = new Map(DATA.expressions.map((expression) => [expression.id, expression]));

  const BOOKS = {
    lt1: {
      title: "Let’s Try! 1",
      subtitle: "3年生",
      units: DATA.unitTitles,
      color: "pink",
    },
    lt2: {
      title: "Let’s Try! 2",
      subtitle: "4年生",
      units: DATA.lt2UnitTitles,
      color: "blue",
    },
  };

  const ACTIVITIES = [
    {
      id: "dekiru-clock",
      title: "DEKIRU CLOCK",
      subtitle: "時計と窓の景色で時刻を読み、英語で話そう",
      units: ["lt2-4"],
      href: "clock.html",
    },
    {
      id: "alphabet-bingo",
      title: "ALPHABET BINGO",
      subtitle: "大文字・小文字のカードでビンゴの準備と抽選",
      units: [],
      href: "alphabet-bingo.html",
      qrShare: true,
    },
    {
      id: "my-pencilcase",
      title: "My Pencilcase",
      subtitle: "自分だけの文房具セットを作ろう",
      units: ["lt2-5"],
      href: `${ASSET_BASE}Activities/My_Pencilcase_v0.1.4.html`,
    },
    {
      id: "gift-set-for-my-friend",
      title: "Gift set for my friend",
      subtitle: "友だちへのギフトセットを作ろう",
      units: ["lt2-5"],
      href: `${ASSET_BASE}Activities/Gift_set_for_my_friend_v0.1.2.html`,
    },
  ];

  const state = {
    display: { image: true, english: true, japanese: false },
    unitSelections: new Map(),
    activeFeature: null,
    activeUnit: null,
    todayField: "day",
    todaySelections: { day: "", month: "", date: "", weather: "" },
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function route() {
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    if (!parts.length) return { page: "home" };
    if (parts[0] === "book" && BOOKS[parts[1]]) return { page: "book", book: parts[1] };
    if (parts[0] === "phonics" && BOOKS[parts[1]]) return { page: "phonics", book: parts[1] };
    if (parts[0] === "unit" && BOOKS[parts[1]] && Number(parts[2])) {
      return { page: "unit", book: parts[1], unit: Number(parts[2]) };
    }
    if (parts[0] === "activities") return { page: "activities" };
    return { page: "home" };
  }

  function navigate(hash) {
    if (location.hash === hash) {
      render();
      return;
    }
    location.hash = hash;
  }

  function sortedUnitEntries(units) {
    return Object.entries(units || {}).sort(([a], [b]) => Number(a) - Number(b));
  }

  function renderHome() {
    document.title = "DEKIRU Classroom for Grade 3 & 4";
    app.innerHTML = `
      <img class="home-background" src="assets/ui/home/background.svg" alt="">
      <nav class="home-scene" aria-label="教科書とActivitiesを選ぶ">
        <img src="assets/ui/home/grade34.svg" alt="">
        <svg viewBox="0 0 1920 1080" aria-label="トップメニュー">
          ${window.DEKIRU_HOME_CLOUDS.map(({label,href,d})=>`<a class="home-cloud" href="${href}" aria-label="${label}"><path d="${d}"/></a>`).join('')}
        </svg>
      </nav>`;
  }

  function entryTile(book, title, subtitle, color) {
    return `<button class="entry-tile ${color}" data-route="#/book/${book}">
      <span class="entry-kicker">Textbook</span>
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(subtitle)}</span>
    </button>`;
  }

  function renderBook(bookKey) {
    const book = BOOKS[bookKey];
    document.title = `${book.title} | DEKIRU Classroom`;
    const units = sortedUnitEntries(book.units);
    app.innerHTML = `
      <div class="book-overview">
      <section class="page-heading">
        <button class="back-button" data-route="#/" aria-label="トップへ戻る"><img src="assets/ui/originals/戻る.svg" alt=""></button>
        <div><p class="eyebrow">${escapeHtml(book.subtitle)}</p><h1>${escapeHtml(book.title)}</h1></div>
        <button class="book-phonics" data-route="#/phonics/${bookKey}"><strong>Phonics</strong><span>一文字一音</span></button>
      </section>
      <section class="unit-grid">
        ${units.map(([number, title]) => {
          const [subtitle, ...expressions] = window.DEKIRU_BOOK_OVERVIEWS?.[bookKey]?.[Number(number)-1] || [];
          const artId = window.DEKIRU_BOOK_ART?.[bookKey]?.[Number(number)-1];
          const art = cardById.get(artId) || expressionById.get(artId);
          const artSource = art ? globalThis.CardSet?.source(art) : '';
          return `
          <button class="unit-tile ${book.color}" data-route="#/unit/${bookKey}/${number}">
            <span class="book-unit-copy">
            <strong class="book-unit-heading"><span class="book-unit-number">Unit ${escapeHtml(number)}</span><span>${escapeHtml(title)}</span></strong>
            <span class="book-subtitle">${escapeHtml(subtitle)}</span>
            <span class="book-expressions">${expressions.map(text=>`<span>${escapeHtml(text)}</span>`).join('')}</span>
            </span>
            ${artSource ? `<img class="book-unit-art" src="${escapeHtml(artSource)}" alt="">` : ''}
          </button>`; }).join("")}
      </section>
      </div>`;
  }

  function renderPhonics(bookKey) {
    location.replace(`phonics.html?from=${bookKey}`);
  }

  function renderActivities() {
    document.title = "Activities | DEKIRU Classroom";
    app.innerHTML = `
      <section class="page-heading">
        <button class="back-button" data-route="#/" aria-label="トップへ戻る">◀</button>
        <div><p class="eyebrow">Activity Library</p><h1>Activities</h1></div>
      </section>
      <section class="catalog-grid">
        ${ACTIVITIES.map(activityTile).join("")}
      </section>`;
  }

  function activityTile(activity) {
    if (activityArtwork(activity)) return activityUnitTile(activity);
    return `<article class="activity-catalog-tile">
      <div>
        <span class="status-pill">Activity</span>
        <h2>${escapeHtml(activity.title)}</h2>
        <p>${escapeHtml(activity.subtitle)}</p>
      </div>
      <div class="tile-actions">
        <a class="primary-button" href="${escapeHtml(activity.href)}" target="_blank" rel="noopener">ひらく</a>
        <button class="secondary-button" data-share="${escapeHtml(activity.id)}">配布</button>
      </div>
    </article>`;
  }

  function getUnitVocabulary(bookKey, unit) {
    const mappings = bookKey === "lt1" ? DATA.mappings : DATA.lt2Mappings;
    if (!mappings) {
      return { basic: [], advance: [], groups: [], categories: new Set(), mapped: false };
    }

    const directMappings = mappings
      .filter((mapping) => Number(mapping.unit) === unit)
      .sort((a, b) => Number(a.order) - Number(b.order));
    const directCards = directMappings.map((mapping) => cardById.get(mapping.cardId)).filter(Boolean);
    const directExpressions = directMappings.map((mapping) => expressionById.get(mapping.expressionId)).filter(Boolean);
    const categories = new Set(directCards.map((card) => card.category));
    const categoryConfig = bookKey === "lt1" ? DATA.advancedCategoriesByUnit : DATA.lt2ReviewCategoriesByUnit;
    const configuredAdvance = categoryConfig?.[String(unit)] || [];
    configuredAdvance.forEach((category) => categories.add(category));

    const priorMappings = mappings.filter(mapping => Number(mapping.unit) < unit);
    if (bookKey === "lt2") priorMappings.push(...DATA.mappings);
    const priorCards = priorMappings
      .filter((mapping) => mapping.cardId)
      .map((mapping) => cardById.get(mapping.cardId))
      .filter((card) => card && categories.has(card.category) && (bookKey === "lt1" || card.displayGroup !== "plus"));

    const basicCards = uniqueBy([...directCards, ...priorCards], (card) => card.id);
    const basicIds = new Set(basicCards.map((card) => card.id));
    const advanceCards = DATA.cards.filter((card) =>
      categories.has(card.category)
      && card.displayGroup === "standard"
      && !basicIds.has(card.id)
    );

    const basic = [
      ...directExpressions.map((item) => ({ ...item, kind: "expression", ref: `expr:${item.id}`, level: "Basic", category: "expressions" })),
      ...basicCards.map((item) => ({ ...item, kind: "card", ref: `card:${item.id}`, level: "Basic" })),
    ];
    const advance = advanceCards.map((item) => ({ ...item, kind: "card", ref: `card:${item.id}`, level: "Advance" }));
    const groups = buildVocabularyGroups(basic, advance);
    return { basic, advance, groups, categories, mapped: directMappings.length > 0 };
  }

  function uniqueBy(items, getKey) {
    const seen = new Set();
    return items.filter((item) => {
      const key = getKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function buildVocabularyGroups(basic, advance) {
    const groups = [];
    const expressionItems = basic.filter((item) => item.kind === "expression");
    if (expressionItems.length) groups.push({ key: "expressions-basic", label: "表現", level: "Basic", items: expressionItems });

    const categories = uniqueBy(
      [...basic, ...advance].filter((item) => item.kind === "card").map((item) => item.category),
      (value) => value,
    );
    categories.forEach((category) => {
      const label = DATA.categoryLabels[category] || category;
      const basicItems = basic.filter((item) => item.kind === "card" && item.category === category);
      const advanceItems = advance.filter((item) => item.category === category);
      if (basicItems.length) groups.push({ key: `${category}-basic`, label, level: "Basic", items: basicItems });
      if (advanceItems.length) groups.push({ key: `${category}-advance`, label, level: "Advance", items: advanceItems });
    });
    return groups;
  }

  function getSelection(bookKey, unit, vocabulary) {
    const key = `${bookKey}-${unit}`;
    if (!state.unitSelections.has(key)) {
      state.unitSelections.set(key, new Set(vocabulary.basic.map((item) => item.ref)));
    }
    return state.unitSelections.get(key);
  }

  function selectedItems(vocabulary, selection) {
    return [...vocabulary.basic, ...vocabulary.advance].filter((item) => selection.has(item.ref));
  }

  function savedSetsMarkup(bookKey,unit){
    try{
      const sets=SavedCardSets.list(`${bookKey}-${unit}`);
return `<h2>保存したカードセット</h2>${sets.length?sets.map(s=>`<div class="saved-set-row"><button class="side-action" data-saved-set="${escapeHtml(s.id)}">${escapeHtml(s.name)}</button><button class="secondary-button saved-set-edit" data-edit-saved-set="${escapeHtml(s.id)}" aria-label="${escapeHtml(s.name)}を確認・編集">確認・編集</button><button class="secondary-button" data-share-saved-set="${escapeHtml(s.id)}" aria-label="${escapeHtml(s.name)}を配信">配信</button><button class="secondary-button" data-delete-set="${escapeHtml(s.id)}" aria-label="${escapeHtml(s.name)}を削除">削除</button></div>`).join(''):'<p>単語を選び「セットを保存」で追加できます。</p>'}`;
    }catch(error){return `<p>${escapeHtml(error.message)}</p>`;}
  }
  function renderUnit(bookKey, unit) {
    const previousSidebar = state.activeUnit?.bookKey === bookKey && state.activeUnit?.unit === unit
      ? app.querySelector('.unit-sidebar') : null;
    const sidebarScroll = previousSidebar?.scrollTop || 0;
    const openDetails = new Set(Array.from(previousSidebar?.querySelectorAll('details[data-accordion][open]') || [])
      .map(details => details.dataset.accordion));
    const book = BOOKS[bookKey];
    const title = book.units[String(unit)] || book.units[unit] || `Unit ${unit}`;
    const vocabulary = getUnitVocabulary(bookKey, unit);
    const selection = getSelection(bookKey, unit, vocabulary);
    state.activeUnit = { bookKey, unit };
    document.body.classList.toggle("today-player-mode", state.activeFeature === "today");
    if (state.activeFeature === "today") {
      app.innerHTML = todayView();
      return;
    }
    document.title = `${book.title} Unit ${unit} | DEKIRU Classroom`;

    app.innerHTML = `
      <div class="workspace">
        <aside class="unit-sidebar" aria-label="Unitメニュー">
          <div class="sidebar-unit">
            <div class="sidebar-unit-top">
              <button class="sidebar-back-button" data-route="#/book/${bookKey}" aria-label="Unit選択に戻る" title="Unit選択に戻る">◀</button>
              <p>${escapeHtml(book.title)} Unit ${unit}</p>
            </div>
            <h1>${escapeHtml(title)}</h1>
          </div>
          <button class="side-action" data-feature="today"><span>Today is...</span><b>›</b></button>
          <button class="side-action" data-feature="unit-activities"><span>Activities</span><b>›</b></button>
          <section class="saved-card-sets" id="saved-card-sets">${savedSetsMarkup(bookKey,unit)}</section>
          ${displaySettings()}
          ${wordSelection(vocabulary, selection, bookKey, unit)}
          <section class="specific-settings" id="specific-settings">
            <h2>選択したゲーム・活動の設定</h2>
            <p>右側でゲームや活動を選ぶと、ここに専用設定を表示します。</p>
          </section>
        </aside>
        <main class="content-panel ${state.activeFeature ? '' : 'unit-overview'}" id="unit-content">
          ${state.activeFeature ? renderFeature(state.activeFeature, bookKey, unit, title, vocabulary, selection) : renderUnitSections(bookKey, unit, title)}
        </main>
      </div>`;
    if (previousSidebar) {
      app.querySelectorAll('.unit-sidebar details[data-accordion]').forEach(details => {
        details.open = openDetails.has(details.dataset.accordion);
      });
    }
    const activeGame = state.activeFeature === 'look-say' ? LookSay : state.activeFeature === 'whats-missing' ? WhatsMissing : state.activeFeature === 'bomb-game' ? BombGame : null;
    if (activeGame) {
      document.getElementById("specific-settings").innerHTML = activeGame.settingsMarkup();
      activeGame.attach({ pool: () => selectedItems(vocabulary, selection), source: pictureSource,
        display: () => state.display, notify: showToast,
        card: item => mainCard(item).replace(/ data-speak="[^"]*"/, ' tabindex="-1"') });
    }
    if (previousSidebar) app.querySelector('.unit-sidebar').scrollTop = sidebarScroll;
    if (state.activeFeature === 'sentences') SentencePlayer.attach({unitKey:`${bookKey}-${unit}`,items:selectedItems(vocabulary,selection),cards:[...DATA.cards,...DATA.expressions],source:pictureSource,labels:DATA.categoryLabels});
  }

  function displaySettings() {
    const labels = { image: "絵", english: "英語", japanese: "日本語" };
    return `<details class="sidebar-block" data-accordion="display">
      <summary>表示設定</summary>
      <div class="display-checks">
        ${Object.entries(labels).map(([key, label]) => `
          <label><input type="checkbox" data-display="${key}" ${state.display[key] ? "checked" : ""}><span>${label}</span></label>`).join("")}
      </div>
    </details>`;
  }

  function wordSelection(vocabulary, selection, bookKey, unit) {
    if (!vocabulary.mapped) {
      return `<details class="sidebar-block">
        <summary>使用する単語を選ぶ</summary>
        <div class="empty-inline">このUnitの語彙割り当ては次の工程で登録します。</div>
      </details>`;
    }
    return `<details class="sidebar-block word-selector" data-accordion="words">
      <summary>使用する単語を選ぶ <span class="selection-total">使用 ${selection.size}語</span></summary>
      <div class="word-groups">
        ${vocabulary.groups.map((group) => wordGroup(group, selection, bookKey, unit)).join("")}
      </div>
    </details><button class="secondary-button card-set-share" data-card-set-save>セットを保存</button>`;
  }

  function wordGroup(group, selection, bookKey, unit) {
    const selectedCount = group.items.filter((item) => selection.has(item.ref)).length;
    const allSelected = selectedCount === group.items.length && group.items.length > 0;
    return `<details class="word-group" data-accordion="group-${escapeHtml(group.key)}">
      <summary>
        <label class="group-check" onclick="event.stopPropagation()">
          <input type="checkbox" data-group="${escapeHtml(group.key)}" data-book="${bookKey}" data-unit="${unit}" ${allSelected ? "checked" : ""}>
          <span>${escapeHtml(group.label)} ${escapeHtml(group.level)}（<b>${group.items.length}</b>）</span>
        </label>
      </summary>
      <div class="word-group-items">
        ${group.items.map((item) => `<button class="word-chip ${selection.has(item.ref) ? "" : "off"}" data-word-ref="${escapeHtml(item.ref)}" data-book="${bookKey}" data-unit="${unit}">${escapeHtml(item.english)}</button>`).join("")}
      </div>
    </details>`;
  }

  function externalGameTile(name,url,personalId=''){
    if (!personalId && name === 'ALPHABET TOUCH') return illustratedTile('alphabet-touch-tile.svg', name, 'アルファベット', url, `data-game-share="${escapeHtml(url)}" data-game-name="${escapeHtml(name)}"`, 'ゲームを配る');
    return `<article class="feature-tile personal" ${personalId?`data-personal-game="${escapeHtml(personalId)}"`:''}><div class="feature-tile-heading"><span class="tile-mark">${personalId?'個人保存':'DEKIRU Games'}</span><strong>${escapeHtml(name)}</strong></div><p class="feature-tile-description">別タブでゲームを開きます</p><div class="share-actions"><a class="primary-button" href="${escapeHtml(url)}" target="_blank" rel="noopener">あそぶ</a><button class="secondary-button" data-game-share="${escapeHtml(url)}" data-game-name="${escapeHtml(name)}">配信</button>${personalId?`<button class="secondary-button" data-delete-personal-game="${escapeHtml(personalId)}" data-game-name="${escapeHtml(name)}">削除</button>`:''}</div></article>`;
  }
  function assignedGameTile(game){
    return game.isOfficial?RoulettePresetTile.render(game):externalGameTile(game.name,game.url,game.id);
  }
  function renderUnitSections(bookKey, unit, title) {
    const activities = ACTIVITIES.filter((activity) => activity.units.includes(`${bookKey}-${unit}`));
    const interviewTiles=window.InterviewLinks?.tiles(bookKey,unit)||'';
    const alphabetTile = bookKey === "lt1" && unit === 6
      ? externalGameTile('ALPHABET TOUCH',GamesLinks.alphabet())
      : "";
    const linkedGames=GamesLinks.assigned(bookKey,unit);
    const individualGames=alphabetTile+linkedGames.filter(g=>g.audiences.includes('individual')).map(assignedGameTile).join('');
    return `
      <section class="content-heading">
        <button class="back-button" data-route="#/book/${bookKey}" aria-label="Unit一覧へ戻る">◀</button>
        <div><p>${escapeHtml(BOOKS[bookKey].title)} Unit ${unit}</p><h1>${escapeHtml(title)}</h1></div>
        <button class="fullscreen-button" data-fullscreen aria-label="全画面表示">⛶</button>
      </section>
      ${sectionBlock("Words &amp; Phrases", "言葉と文を確認する", `
        <div class="feature-grid">
          ${featureTile("pronunciation", "発音練習", "絵・英語・音声で言葉を確認")}
          ${featureTile("sentences", "文で話そう", "カードを並べて文で話す")}
        </div>`)}
      ${sectionBlock("Games（みんなで）", "大型提示画面で学級全体で遊ぶ", `
        <div class="feature-grid">
          ${featureTile("look-say", "Look＆Say", "画面に短い時間表示された絵を見てこたえる", "class")}
          ${featureTile("whats-missing", "What’s Missing?", "消えたカードを見つける", "class")}
          ${featureTile("bomb-game", "Bomb Game", "選んだ言葉で進めるクラスゲーム", "class")}
          ${linkedGames.filter(g=>g.audiences.includes('class')).map(assignedGameTile).join('')}
        </div>`)}
      ${sectionBlock("Games（個人の端末で）", "配布されたゲームを児童が自分で練習する", individualGames?`<div class="feature-grid">${individualGames}</div>`:`<div class="empty-state compact"><p>このUnitの配布用ゲームは、今後追加します。</p></div>`)}
      ${sectionBlock("Activities", "このUnitで使える活動", activities.length||interviewTiles ? `<div class="feature-grid">${activities.map((activity) => activityUnitTile(activity)).join("")}${interviewTiles}</div>` : `<div class="empty-state compact"><p>このUnitのActivityは、今後追加します。</p></div>`)}
    `;
  }

  function sectionBlock(title, subtitle, content, open = false) {
    const banner = ['Words &amp; Phrases','Games（みんなで）','Games（個人の端末で）','Activities'].indexOf(title);
    return `<details class="content-section" ${open ? "open" : ""}>
      <summary class="${banner >= 0 ? 'illustrated-summary' : ''}"><span class="${banner >= 0 ? 'tile-accessible-text' : ''}"><strong>${title}</strong><small>${escapeHtml(subtitle)}</small></span>${banner >= 0 ? `<span class="unit-menu-art menu-art-${banner}" aria-hidden="true"><img src="assets/ui/unit-menu-banners.svg" alt=""></span>` : ''}</summary>
      <div class="section-body">${content}</div>
    </details>`;
  }

  function featureTile(feature, title, subtitle, type = "words") {
    const artwork = {'look-say':'look-say-tile.svg','whats-missing':'whats-missing-tile-v2.svg','bomb-game':'bomb-game-tile.svg'}[feature];
    if (artwork) return `<button class="illustrated-feature" data-feature="${escapeHtml(feature)}" aria-label="${escapeHtml(title)}" title="${escapeHtml(subtitle)}"><img src="assets/ui/${artwork}" alt=""></button>`;
    return `<button class="feature-tile ${type}" data-feature="${escapeHtml(feature)}">
      <span class="feature-tile-heading"><span class="tile-mark">${type === "personal" ? "個人の端末で" : type === "class" ? "みんなで" : "Words"}</span><strong>${escapeHtml(title)}</strong></span>
      <span class="feature-tile-description">${escapeHtml(subtitle)}</span>
    </button>`;
  }

  function activityUnitTile(activity) {
    const art = activityArtwork(activity);
    if (art) return illustratedTile(art[0],activity.title,art[1],activity.href,`data-share="${escapeHtml(activity.id)}"`,'シートを配る');
    return `<article class="feature-tile activity static-tile">
      <div class="feature-tile-heading"><span class="tile-mark">Activities</span><strong>${escapeHtml(activity.title)}</strong></div>
      <span class="feature-tile-description">${escapeHtml(activity.subtitle)}</span>
      <div class="tile-actions">
        <a class="primary-button" href="${escapeHtml(activity.href)}" target="_blank" rel="noopener">ひらく</a>
        <button class="secondary-button" data-share="${escapeHtml(activity.id)}">配布</button>
      </div>
    </article>`;
  }

  function activityArtwork(activity) {
    return {'dekiru-clock':['clock-tile.svg','時刻'],'my-pencilcase':['pencilcase-tile.svg','文房具'],'gift-set-for-my-friend':['gift-set-tile.svg','文房具']}[activity.id];
  }

  function illustratedTile(art,title,words,url,shareAttributes,shareLabel) {
    return `<article class="illustrated-activity" aria-label="${escapeHtml(title)}">
      <img src="assets/ui/${art}" alt="${escapeHtml(title)}">
      <span class="illustrated-words">${escapeHtml(words)}</span>
      <a class="art-hotspot art-play" href="${escapeHtml(url)}" target="_blank" rel="noopener" aria-label="${escapeHtml(title)}をひらく"><span class="tile-accessible-text">Play</span></a>
      <button class="art-hotspot art-share" ${shareAttributes} aria-label="${escapeHtml(title)}：${shareLabel}"><span class="tile-accessible-text">${shareLabel}</span></button>
    </article>`;
  }

  function renderFeature(feature, bookKey, unit, unitTitle, vocabulary, selection) {
    if (feature === "sentences") return SentencePlayer.markup(`${bookKey}-${unit}`);
    if (feature === "look-say") return LookSay.markup();
    if (feature === "whats-missing") return WhatsMissing.markup();
    if (feature === "bomb-game") return BombGame.markup();
    const chosen = selectedItems(vocabulary, selection);
    const meta = featureMeta(feature);
    const content = featureContent(feature, chosen, bookKey, unit);
    requestAnimationFrame(() => renderSpecificSettings(feature));
    return `
      <section class="content-heading feature-heading">
        <button class="back-button" data-feature="close" aria-label="Unitページへ戻る">◀</button>
        <div><p>${escapeHtml(BOOKS[bookKey].title)} Unit ${unit}</p><h1>${escapeHtml(meta.title)}</h1></div>
        ${feature === 'pronunciation' ? `<div class="feature-toolbar"><span>${escapeHtml(unitTitle)}</span><b>使用 ${chosen.length}語</b></div>` : ''}
        <button class="fullscreen-button" data-fullscreen aria-label="全画面表示">⛶</button>
      </section>
      <section class="feature-view">
        ${feature === 'pronunciation' ? '' : `<div class="feature-toolbar"><span>${escapeHtml(unitTitle)}</span><b>使用 ${chosen.length}語</b></div>`}
        ${content}
      </section>`;
  }

  function featureMeta(feature) {
    const items = {
      today: ["Today is...", "日付と天気を確認"],
      "unit-activities": ["Activities", "このUnitで使える活動"],
      pronunciation: ["発音練習", "選んだ言葉を見て・聞いて確認"],
      sentences: ["文で話そう", "選んだ言葉を文で使う"],
      "look-say": ["Look & Say", "短時間見えたカードを答える"],
      "whats-missing": ["What’s Missing?", "消えたカードを見つける"],
      "bomb-game": ["Bomb Game", "選んだ言葉で遊ぶ"],
      "alphabet-touch": ["ALPHABET TOUCH", "A〜Zを順番にタッチ"],
    };
    const [title, subtitle] = items[feature] || ["教材", ""];
    return { title, subtitle };
  }

  function featureContent(feature, chosen, bookKey, unit) {
    if (feature === "today") return todayView();
    if (feature === "unit-activities") {
      const activities = ACTIVITIES.filter((activity) => activity.units.includes(`${bookKey}-${unit}`));
      const interviewTiles=window.InterviewLinks?.tiles(bookKey,unit)||'';
      return activities.length||interviewTiles
        ? `<div class="catalog-grid embedded">${activities.map(activityTile).join("")}${interviewTiles}</div>`
        : `<div class="empty-state"><h2>Activityは準備中です</h2><p>このUnitに合う活動を、今後ここへ追加します。</p></div>`;
    }
    if (feature === "pronunciation") return practiceCards(chosen);
    if (feature === "alphabet-touch") {
      return externalGameTile('ALPHABET TOUCH',GamesLinks.alphabet());
    }
    return `<div class="game-preview">
      <span class="status-pill">Games（みんなで）</span>
      <h2>${escapeHtml(featureMeta(feature).title)}</h2>
      <p>左で選んだ ${chosen.length}語を使います。ゲーム本体は、この新しい構造へ順番に移植します。</p>
      <div class="preview-cards">${chosen.slice(0, 6).map((item) => miniCard(item)).join("")}</div>
    </div>`;
  }

  function renderSpecificSettings(feature) {
    const container = document.getElementById("specific-settings");
    if (!container) return;
    if(feature==='pronunciation'){container.innerHTML=practice.settings(true);return;}
    const meta = featureMeta(feature);
    const settings = {
      pronunciation: "一覧表示・1枚表示・自動再生などの設定をここへまとめます。",
      "look-say": "表示枚数・回数・時間を設定します。",
      "whats-missing": "表示枚数・難易度・表示時間を設定します。",
      "bomb-game": "出題数など、ゲーム専用の設定をここへまとめます。",
      "alphabet-touch": "配布済みプリセットを開くための情報を表示します。",
      today: "曜日・月・日付・天気の候補を選びます。",
      "unit-activities": "選んだActivity固有の設定をここへ表示します。",
    };
    container.innerHTML = `<h2>${escapeHtml(meta.title)} の設定</h2><p>${escapeHtml(settings[feature] || "専用設定を表示します。")}</p>`;
  }

  function todayView() {
    const fields = {
      day: { category: "days", placeholder: "Day", title: "曜日を選ぶ" },
      month: { category: "months", placeholder: "Month", title: "月を選ぶ" },
      date: { category: "dates", placeholder: "Date", title: "日付を選ぶ" },
      weather: { category: "weather", placeholder: "Weather", title: "天気を選ぶ" },
    };
    const config = fields[state.todayField];
    const cards = DATA.cards.filter(card => card.category === config.category && card.displayGroup !== "category")
      .sort((a, b) => a.id.localeCompare(b.id));
    return `<div class="today-layout">
      <section class="today-builder" aria-label="今日の日付と天気">
        <button class="back-button today-builder-back" data-feature="close" aria-label="前の画面へ戻る">◀</button>
        <div class="today-formula">
          ${Object.entries(fields).map(([field, info]) => {
            const card = cardById.get(state.todaySelections[field]);
            return `<span class="today-lead ${field === "weather" ? "weather" : ""}">${field === "day" ? "Today is" : field === "weather" ? "The weather is" : ""}</span>
              <button class="today-slot ${field === state.todayField ? "active" : ""} ${card ? "" : "placeholder"}" data-today-field="${field}" aria-label="${info.title}${card ? "、現在は" + escapeHtml(card.english) : ""}" aria-pressed="${field === state.todayField}">
                ${card ? `<span class="today-slot-word">${escapeHtml(card.english)}</span><span class="today-slot-picture"><img src="${escapeHtml(ASSET_BASE + card.image)}" alt=""></span>` : `<span class="today-slot-placeholder">${info.placeholder}</span>`}
              </button><span class="today-punctuation">${field === "day" ? "," : field === "month" ? "" : "."}</span>`;
          }).join("")}
        </div>
      </section>
      <section class="today-choices-panel" aria-label="候補のカード">
        <h2 class="today-choices-title">${config.title}</h2>
        <div class="today-choices">${cards.map(card => `<button class="today-choice ${state.todaySelections[state.todayField] === card.id ? "selected" : ""}" data-today-choice="${escapeHtml(card.id)}" aria-pressed="${state.todaySelections[state.todayField] === card.id}"><span class="today-choice-picture"><img src="${escapeHtml(ASSET_BASE + card.image)}" alt=""></span><span class="today-choice-word">${escapeHtml(card.english)}</span></button>`).join("")}</div>
      </section>
    </div>`;
  }

  function cardGrid(items) {
    if (!items.length) return emptyVocabulary();
    return `<div class="card-grid">${items.map((item) => mainCard(item)).join("")}</div>`;
  }

  function practiceCards(items) {
    if(!items.length)return emptyVocabulary();
    return `<div class="practice-scroll"><div class="practice-grid" data-layout="${practice.layout}">${practice.arrange(items).map(item=>{
      const source=pictureSource(item);
      return `<button class="practice-card ${state.display.image?'':'no-picture'}" data-speak="${escapeHtml(item.speech||item.english)}">${state.display.image?`<div class="practice-art">${source?`<img src="${escapeHtml(source)}" alt="">`:'<span>No image</span>'}</div>`:''}<div class="practice-label">${state.display.english?`<strong>${escapeHtml(item.english)}</strong>`:''}${state.display.japanese?`<small>${escapeHtml(item.japanese)}</small>`:''}</div></button>`;
    }).join('')}</div></div>`;
  }

  function emptyVocabulary() {
    return `<div class="empty-state"><h2>使用する単語を選んでください</h2><p>左側の「使用する単語を選ぶ」を開いて選択できます。</p></div>`;
  }

  function mainCard(item) {
    const source = pictureSource(item);
    const image = source
      ? `<img src="${escapeHtml(source)}" alt="">`
      : `<div class="no-image">${item.kind === "expression" ? "Aa" : "No image"}</div>`;
    return `<button class="word-card" data-speak="${escapeHtml(item.speech || item.english)}">
      ${state.display.image ? `<div class="card-picture">${image}</div>` : ""}
      ${state.display.english ? `<strong>${escapeHtml(item.english)}</strong>` : ""}
      ${state.display.japanese ? `<span>${escapeHtml(item.japanese)}</span>` : ""}
    </button>`;
  }

  function miniCard(item) {
    const source = pictureSource(item);
    const image = source
      ? `<img src="${escapeHtml(source)}" alt="">`
      : `<span>Aa</span>`;
    return `<div class="mini-card">${image}<b>${escapeHtml(item.english)}</b></div>`;
  }

  function pictureSource(item) {
    return CardSet.source(item);
  }

  function toggleWord(ref, bookKey, unit) {
    const vocabulary = getUnitVocabulary(bookKey, unit);
    const selection = getSelection(bookKey, unit, vocabulary);
    if (selection.has(ref)) selection.delete(ref); else selection.add(ref);
    renderUnit(bookKey, unit);
  }

  function toggleGroup(groupKey, checked, bookKey, unit) {
    const vocabulary = getUnitVocabulary(bookKey, unit);
    const selection = getSelection(bookKey, unit, vocabulary);
    const group = vocabulary.groups.find((item) => item.key === groupKey);
    if (!group) return;
    group.items.forEach((item) => checked ? selection.add(item.ref) : selection.delete(item.ref));
    renderUnit(bookKey, unit);
  }

  function speak(text) {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.78;
    window.speechSynthesis.speak(utterance);
  }

  function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { toast.hidden = true; toast.classList.remove("show"); }, 2200);
  }

  async function shareActivity(activityId) {
    const activity = ACTIVITIES.find((item) => item.id === activityId);
    if (!activity) return;
    const url = new URL(activity.href, location.href).href;
    if (activity.qrShare) { CardShare.openUrl(url, activity.title); return; }
    try {
      await navigator.clipboard.writeText(url);
      showToast("URLをコピーしました");
    } catch {
      window.prompt("このURLをコピーしてください", url);
    }
  }

  async function toggleFullscreen() {
    const panel = document.getElementById("unit-content");
    if (!panel) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen?.();
    } else if (panel.classList.contains("fullscreen-content")) {
      panel.classList.remove("fullscreen-content");
    } else {
      try {
        if (!panel.requestFullscreen) throw new Error("Fullscreen unavailable");
        await panel.requestFullscreen();
      } catch { panel.classList.add("fullscreen-content"); }
    }
  }

  app.addEventListener("click", (event) => {
    const deleteGame=event.target.closest('[data-delete-personal-game]');
    if(deleteGame){
      if(!window.confirm(`個人保存の「${deleteGame.dataset.gameName}」を削除しますか？すべてのUnitの一覧とCreate Gamesから削除されます。公式プリセットと配信済みURLは残ります。`))return;
      try{
        GamesLinks.removePersonal(deleteGame.dataset.deletePersonalGame);
        app.querySelectorAll('[data-personal-game]').forEach(tile=>{if(tile.dataset.personalGame===deleteGame.dataset.deletePersonalGame)tile.remove();});
        showToast('個人保存のゲームを削除しました');
      }catch{showToast('削除できませんでした。保存データは変更していません。');}
      return;
    }
    const gameShare=event.target.closest('[data-game-share]');
    if(gameShare){CardShare.openUrl(gameShare.dataset.gameShare,gameShare.dataset.gameName);return;}
    const savedButton=event.target.closest('[data-saved-set],[data-delete-set],[data-share-saved-set],[data-edit-saved-set]');
    if(savedButton&&state.activeUnit){
      if(LookSay.isRunning()||WhatsMissing.isRunning()||BombGame.isRunning()){showToast('ゲームの進行が終わってから操作してください');return;}
      const {bookKey,unit}=state.activeUnit,key=`${bookKey}-${unit}`;
      try{
        const id=savedButton.dataset.savedSet||savedButton.dataset.deleteSet||savedButton.dataset.shareSavedSet||savedButton.dataset.editSavedSet;
        const saved=SavedCardSets.list(key).find(s=>s.id===id);if(!saved)return;
        if(savedButton.hasAttribute('data-edit-saved-set')){
          CardSetEditor.open(saved,getUnitVocabulary(bookKey,unit).groups,(name,payload,replaceId)=>{
            SavedCardSets.save(key,name,payload,replaceId);
            const section=document.getElementById('saved-card-sets');if(section)section.innerHTML=savedSetsMarkup(bookKey,unit);
            showToast(replaceId?'セットを更新しました':'別名で保存しました');
          });
          return;
        }
        if(savedButton.hasAttribute('data-share-saved-set')){
          const restored=CardSet.resolve(saved.payload);
          CardShare.open(restored.items,restored.display,{name:saved.name}).catch(error=>showToast(error.message));
          return;
        }
        if(savedButton.hasAttribute('data-delete-set')){
          if(!window.confirm(`「${saved.name}」を削除しますか？配信済みのURLは引き続き使えます。`))return;
          SavedCardSets.remove(key,id);
          document.getElementById('saved-card-sets').innerHTML=savedSetsMarkup(bookKey,unit);
          showToast('セットを削除しました');return;
        }
        const restored=CardSet.resolve(saved.payload),vocabulary=getUnitVocabulary(bookKey,unit);
        const available=new Set([...vocabulary.basic,...vocabulary.advance].map(i=>i.ref));
        if(restored.items.some(i=>!available.has(i.ref)))throw new Error('このUnitで使えない語が含まれるため復元できません。');
        LookSay.stop(true);WhatsMissing.stop(true);BombGame.stop(true);
        state.unitSelections.set(key,new Set(restored.items.map(i=>i.ref)));state.display=restored.display;
        renderUnit(bookKey,unit);showToast(`「${saved.name}」を呼び出しました`);
      }catch(error){showToast(error.message);}
      return;
    }
    if (event.target.closest('[data-card-set-save]') && state.activeUnit) {
      const {bookKey, unit} = state.activeUnit;
      const vocabulary = getUnitVocabulary(bookKey, unit);
      const items = selectedItems(vocabulary, getSelection(bookKey, unit, vocabulary));
      if (!items.length) { showToast('使用する単語を選んでください'); return; }
      try{CardShare.openSave(items, state.display, (name,payload)=>{
        SavedCardSets.save(`${bookKey}-${unit}`,name,payload);
        if(state.activeUnit?.bookKey===bookKey&&state.activeUnit?.unit===unit){
          const section=document.getElementById('saved-card-sets');if(section)section.innerHTML=savedSetsMarkup(bookKey,unit);
        }
        showToast('セットを保存しました。タイルの「配信」から配れます。');
      });}catch(error){showToast(error.message);}
      return;
    }
    const lookAction = event.target.closest("[data-look-action]");
    if (lookAction) { LookSay.action(lookAction.dataset.lookAction); return; }
    const missingAction = event.target.closest('[data-missing-action]');
    if (missingAction) { WhatsMissing.action(missingAction.dataset.missingAction); return; }
    const bombAction = event.target.closest('[data-bomb-action]');
    if (bombAction) { BombGame.action(bombAction.dataset.bombAction); return; }
    const bombCard = event.target.closest('[data-bomb-pick]');
    if (bombCard) { BombGame.pick(Number(bombCard.dataset.bombPick)); return; }
    const todayField = event.target.closest("[data-today-field]");
    const todayChoice = event.target.closest("[data-today-choice]");
    if (todayField || todayChoice) {
      const scroll = app.querySelector(".today-choices")?.scrollLeft || 0;
      if (todayField) state.todayField = todayField.dataset.todayField;
      else state.todaySelections[state.todayField] = todayChoice.dataset.todayChoice;
      app.innerHTML = todayView();
      if (todayChoice) app.querySelector(".today-choices").scrollLeft = scroll;
      return;
    }
    const routeTarget = event.target.closest("[data-route]");
    if (routeTarget) {
      globalThis.SentencePlayer?.stop();
      LookSay.stop(true); WhatsMissing.stop(true); BombGame.stop(true);
      state.activeFeature = null;
      navigate(routeTarget.dataset.route);
      return;
    }

    const shareTarget = event.target.closest("[data-share]");
    if (shareTarget) {
      shareActivity(shareTarget.dataset.share);
      return;
    }

    const fullscreenTarget = event.target.closest("[data-fullscreen]");
    if (fullscreenTarget) {
      toggleFullscreen();
      return;
    }

    const wordTarget = event.target.closest("[data-word-ref]");
    if (wordTarget) {
      if (LookSay.isRunning() || WhatsMissing.isRunning() || BombGame.isRunning()) return;
      toggleWord(wordTarget.dataset.wordRef, wordTarget.dataset.book, Number(wordTarget.dataset.unit));
      return;
    }

    const featureTarget = event.target.closest("[data-feature], [data-interview-sentence]");
    if (featureTarget && state.activeUnit) {
      if (featureTarget.dataset.feature === "close" && (document.fullscreenElement || document.querySelector('.fullscreen-content'))) {
        toggleFullscreen();
        return;
      }
      LookSay.stop(true); WhatsMissing.stop(true); BombGame.stop(true);
      const previousFeature=state.activeFeature;
      const previousSections=[...document.querySelectorAll('details.content-section[open]')].map(e=>e.querySelector('summary')?.textContent);
      state.activeFeature = featureTarget.dataset.interviewSentence ? 'sentences' : featureTarget.dataset.feature === "close" ? null : featureTarget.dataset.feature;
      globalThis.SentencePlayer?.stop();
      if (state.activeFeature === "today") state.todayField = "day";
      renderUnit(state.activeUnit.bookKey, state.activeUnit.unit);
      if(featureTarget.dataset.interviewSentence){
        const dialog=document.createElement('dialog');dialog.className='preset-sentence-dialog';dialog.setAttribute('aria-label','文で話そう');
        SentencePlayer.openForCards(featureTarget.dataset.interviewSentence,JSON.parse(featureTarget.dataset.interviewCards),()=>dialog.close());
        const panel=document.getElementById('unit-content');panel.remove();
        state.activeFeature=previousFeature;renderUnit(state.activeUnit.bookKey,state.activeUnit.unit);
        document.querySelectorAll('details.content-section').forEach(e=>{e.open=previousSections.includes(e.querySelector('summary')?.textContent);});
        const background=document.getElementById('unit-content');background.id='unit-content-background';
        dialog.append(panel);document.body.append(dialog);
        dialog.addEventListener('click',async event=>{if(!event.target.closest('[data-fullscreen]'))return;try{if(document.fullscreenElement===dialog)await document.exitFullscreen();else await dialog.requestFullscreen();}catch{dialog.classList.toggle('practice-expanded');}});
        dialog.addEventListener('close',()=>{SentencePlayer.stop();if(document.fullscreenElement&&dialog.contains(document.fullscreenElement))document.exitFullscreen?.();dialog.remove();background.id='unit-content';document.querySelector('[data-interview-sentence]')?.focus();});
        dialog.showModal();
      }
      return;
    }

    const speechTarget = event.target.closest("[data-speak]");
    if (speechTarget) speak(speechTarget.dataset.speak);
  });

  app.addEventListener("change", (event) => {
    const practiceSetting=event.target.closest('[data-practice-setting]');
    if(practiceSetting && state.activeUnit){practice.configure(practiceSetting.dataset.practiceSetting,practiceSetting.value);const {bookKey,unit}=state.activeUnit;const vocabulary=getUnitVocabulary(bookKey,unit);const selection=state.unitSelections.get(`${bookKey}-${unit}`);const panel=document.querySelector('#unit-content .practice-scroll');if(panel&&selection)panel.outerHTML=practiceCards(selectedItems(vocabulary,selection));else renderUnit(bookKey,unit);return;}
    const bombSetting = event.target.closest('[data-bomb-setting]');
    if (bombSetting) { BombGame.configure(bombSetting.dataset.bombSetting, bombSetting.type === 'checkbox' ? bombSetting.checked : bombSetting.value); return; }
    const lookSetting = event.target.closest("[data-look-setting]");
    if (lookSetting) { LookSay.configure(lookSetting.dataset.lookSetting, lookSetting.value); return; }
    const missingSetting = event.target.closest('[data-missing-setting],[data-missing-seconds]');
    if (missingSetting) {
      WhatsMissing.configure(missingSetting.dataset.missingSetting || missingSetting.dataset.missingSeconds, missingSetting.value);
      renderUnit(state.activeUnit.bookKey,state.activeUnit.unit); return;
    }
    if (LookSay.isRunning() || WhatsMissing.isRunning() || BombGame.isRunning()) return;
    const display = event.target.closest("[data-display]");
    if (display && state.activeUnit) {
      state.display[display.dataset.display] = display.checked;
      renderUnit(state.activeUnit.bookKey, state.activeUnit.unit);
      return;
    }

    const group = event.target.closest("[data-group]");
    if (group) toggleGroup(group.dataset.group, group.checked, group.dataset.book, Number(group.dataset.unit));
  });

  app.addEventListener("error", (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    if (!image.dataset.triedOriginal && image.getAttribute("src")?.includes("/assets/cards/")) {
      image.dataset.triedOriginal = "true";
      image.src = "assets/cards/" + image.getAttribute("src").split("/assets/cards/")[1];
      return;
    }
    const fallback = document.createElement("div");
    fallback.className = "no-image";
    fallback.textContent = "No image";
    image.replaceWith(fallback);
  }, true);

  document.querySelector("[data-home]")?.addEventListener("click", () => {
    state.activeFeature = null;
    navigate("#/");
  });
  window.addEventListener("hashchange", () => {
    LookSay.stop(true); WhatsMissing.stop(true); BombGame.stop(true);
    state.activeFeature = null;
    render();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") document.querySelector('.fullscreen-content')?.classList.remove('fullscreen-content');
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.activeFeature === 'bomb-game') {
      BombGame.stop(); renderUnit(state.activeUnit.bookKey,state.activeUnit.unit);
    }
    if (document.hidden && WhatsMissing.isRunning()) {
      WhatsMissing.stop();
      if (state.activeFeature === 'whats-missing') renderUnit(state.activeUnit.bookKey,state.activeUnit.unit);
    }
    if (document.hidden && LookSay.isRunning()) {
      LookSay.stop();
      if (state.activeFeature === "look-say") renderUnit(state.activeUnit.bookKey, state.activeUnit.unit);
    }
  });

  function render() {
    globalThis.SentencePlayer?.stop();
    document.body.classList.remove("today-player-mode");
    const current = route();
    document.body.classList.toggle("book-page", current.page === "book");
    document.body.classList.toggle("home-page", current.page === "home");
    if (current.page === "book") renderBook(current.book);
    else if (current.page === "phonics") renderPhonics(current.book);
    else if (current.page === "unit") renderUnit(current.book, current.unit);
    else if (current.page === "activities") renderActivities();
    else renderHome();
    window.scrollTo(0, 0);
  }

  render();
})();
