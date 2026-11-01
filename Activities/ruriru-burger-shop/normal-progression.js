(() => {
  'use strict';
  const key='ruriru-normal-progress-v1';
  const validLevel=level=>Number.isInteger(level)&&level>=1&&level<=4;
  const validResult=value=>value&&Number.isInteger(value.stars)&&value.stars>=1&&value.stars<=3&&
    Number.isInteger(value.score)&&value.score>=0&&value.score<=1000&&Number.isFinite(value.elapsedMs)&&value.elapsedMs>=0;
  let levels={};
  try {
    const saved=JSON.parse(globalThis.localStorage?.getItem(key)||'null');
    if(saved&&saved.version===1&&saved.levels&&typeof saved.levels==='object'&&!Array.isArray(saved.levels)&&
      Object.entries(saved.levels).every(([level,result])=>/^[1-4]$/.test(level)&&validResult(result))) {
      levels=Object.fromEntries(Object.entries(saved.levels).map(([level,r])=>[level,{stars:r.stars,score:r.score,elapsedMs:r.elapsedMs}]));
    }
  } catch { /* Corrupt or blocked storage starts with LEVEL1 safely. */ }
  function read() {
    let unlocked=1;
    while(unlocked<4&&levels[unlocked]?.stars===3)unlocked++;
    return {unlocked,levels:JSON.parse(JSON.stringify(levels))};
  }
  function isUnlocked(level) {return validLevel(level)&&level<=read().unlocked;}
  function recordResult(level,result) {
    if(!isUnlocked(level)||!validResult(result))return read();
    const old=levels[level];
    levels[level]={stars:Math.max(old?.stars||0,result.stars),score:Math.max(old?.score||0,result.score),
      elapsedMs:old?Math.min(old.elapsedMs,result.elapsedMs):result.elapsedMs};
    try {globalThis.localStorage?.setItem(key,JSON.stringify({version:1,levels}));} catch { /* Current page remains usable. */ }
    return read();
  }
  globalThis.RuRiRuProgress=Object.freeze({read,isUnlocked,recordResult});
})();
