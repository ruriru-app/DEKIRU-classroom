(() => {
  "use strict";

  const levels = [
    { level: 1, name: "屋台", customers: 1, pool: 3, types: "1〜2", quantity: "1〜3" },
    { level: 2, name: "フードコート", customers: 2, pool: 4, types: "2〜3", quantity: "2〜6" },
    { level: 3, name: "独立店舗", customers: 3, pool: 5, types: "3〜4", quantity: "4〜9" },
    { level: 4, name: "リゾート", customers: 4, pool: 6, types: "3〜5", quantity: "6〜12" }
  ];
  const cards = Array.from(document.querySelectorAll(".level-card"));
  const selectedLevel = document.getElementById("selected-level");
  const selectedName = document.getElementById("selected-name");
  const selectedRule = document.getElementById("selected-rule");
  const startStatus = document.getElementById("start-status");
  const preparingButton = document.getElementById("preparing-button");
  const playLink = document.getElementById("play-link");
  const progress = globalThis.RuRiRuProgress.read();
  const playableIndices = levels.flatMap((entry,index) => entry.level <= progress.unlocked ? [index] : []);
  for(const entry of levels) {
    const badge=document.getElementById(`level-availability-${entry.level}`);
    const stars=progress.levels[entry.level]?.stars || 0;
    const unlocked=entry.level<=progress.unlocked;
    badge.textContent=stars?'★'.repeat(stars):unlocked?'遊べる':'未解放';
    badge.classList.toggle('is-ready',unlocked);
    const card=cards[entry.level-1];
    card.classList.toggle('is-locked',!unlocked);
    card.disabled=!unlocked;
    card.setAttribute('aria-disabled',String(!unlocked));
    const unlockDescription=document.getElementById(`level-unlock-${entry.level}`);
    if(unlockDescription) {
      unlockDescription.textContent=unlocked?'':`LEVEL${entry.level-1}の★★★で選べます。`;
      unlockDescription.hidden=unlocked;
    }
    card.setAttribute('aria-describedby',`level-rules-${entry.level} level-availability-${entry.level}${unlocked?'':` level-unlock-${entry.level}`}`);
  }

  function selectLevel(index, moveFocus = false) {
    const selection = levels[index];
    if (!selection || selection.level > progress.unlocked) return;

    cards.forEach((card, cardIndex) => {
      const active = cardIndex === index;
      card.setAttribute("aria-checked", String(active));
      card.classList.toggle("is-selected", active);
      card.tabIndex = active ? 0 : -1;
    });

    selectedLevel.textContent = `LEVEL ${selection.level}`;
    selectedName.textContent = selection.name;
    selectedRule.textContent = `${selection.pool}人の中からランダムに${selection.customers}人が来店。注文は${selection.types}種類・合計${selection.quantity}個です。`;
    const isPlayable = selection.level <= progress.unlocked;
    preparingButton.hidden = isPlayable;
    playLink.hidden = !isPlayable;
    preparingButton.textContent = `LEVEL${selection.level}を遊ぶ →`;
    playLink.textContent=`LEVEL${selection.level}を遊ぶ →`;
    playLink.href=`./play.html?level=${selection.level}&v=20261103a`;
    const stars=progress.levels[selection.level]?.stars || 0;
    startStatus.textContent = isPlayable ? stars ? `獲得した星：${'★'.repeat(stars)}　もう一度接客しよう！` : `${selection.customers}人のお客さんを接客しよう！` : `LEVEL${selection.level-1}の★★★で開きます`;
    if (moveFocus) cards[index].focus();
  }

  cards.forEach((card, index) => {
    card.addEventListener("click", () => selectLevel(index));
    card.addEventListener("keydown", (event) => {
      if(card.disabled) return;
      const position=playableIndices.indexOf(index);
      let nextIndex;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = playableIndices[(position + 1) % playableIndices.length];
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = playableIndices[(position - 1 + playableIndices.length) % playableIndices.length];
      if (event.key === "Home") nextIndex = playableIndices[0];
      if (event.key === "End") nextIndex = playableIndices[playableIndices.length - 1];
      if (nextIndex === undefined) return;
      event.preventDefault();
      selectLevel(nextIndex, true);
    });
  });

  selectLevel(0);
})();
