// Link-only integration. Game engines and authoring stay in DEKIRU Games.
window.GamesLinks=(()=>{
  const base=new URL(location.protocol==='file:'?'../games/':'../games/',location.href);
  const encode=value=>btoa(Array.from(new TextEncoder().encode(JSON.stringify(value)),b=>String.fromCharCode(b)).join('')).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
  const alphabet=()=>new URL('#alphabet='+encode({v:1,g:'at',m:'upper',l:'easy'}),base).href;
  function assigned(book,unit){
    let saved=[];
    try{const value=JSON.parse(localStorage.getItem('dekiru-created-games-v1')||'[]');if(Array.isArray(value))saved=value;}catch{}
    try{
      const official=Array.isArray(window.OFFICIAL_ROULETTE_PRESETS)?window.OFFICIAL_ROULETTE_PRESETS:[];
      return [...official,...saved].filter(g=>g?.gameType==='roulette-race'&&Array.isArray(g.assignedUnits)&&g.assignedUnits.includes(book+':'+unit)&&Array.isArray(g.selectedCardIds)&&g.selectedCardIds.length).map(g=>{
        const ids=window.GAMES_CARD_ORDER||[],selected=new Set(g.selectedCardIds),bytes=new Uint8Array(Math.ceil(ids.length/8));
        ids.forEach((id,i)=>{if(selected.has(id))bytes[i>>3]|=1<<(i&7);});
        const w=btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
        const d=g.display||{};
        const token=encode({v:1,g:'rr',n:g.name,c:g.cardCount,e:g.everybodySentence,s:g.selectedSentence,u:g.assignedUnits,a:g.audiences,d:(d.picture!==false?'1':'0')+(d.english!==false?'1':'0')+(d.japanese===true?'1':'0'),w});
        const cards=new Map((window.DEKIRU_DATA?.cards||[]).map(c=>[c.id,c]));
        const groups=new Map();
        [...selected].filter(id=>ids.includes(id)).forEach(id=>{const card=cards.get(id);if(!card)return;const label=window.DEKIRU_DATA?.categoryLabels?.[card.category]||card.category;if(!groups.has(label))groups.set(label,[]);groups.get(label).push(card.english);});
        const practice={ids:[...selected].filter(id=>ids.includes(id)&&cards.has(id)),preference:[g.everybodySentence,g.selectedSentence].some(s=>/\blike\s*(?:\(\s*P\s*\)|[～~])/i.test(s||''))};
        return {id:g.id,isOfficial:official.includes(g),name:g.name||'ROULETTE RACE',url:new URL('#play='+token,base).href,audiences:g.audiences?.length?g.audiences:['individual'],expressions:[g.everybodySentence,g.selectedSentence].filter(s=>typeof s==='string'&&s.trim()),groups:[...groups].map(([category,words])=>({category,words})),practice};
      });
    }catch{return [];}
  }
  function removePersonal(id){
    if(typeof id!=='string'||!id)return false;
    const key='dekiru-created-games-v1',saved=JSON.parse(localStorage.getItem(key)||'[]');
    if(!Array.isArray(saved))throw new Error('保存データを読み込めないため、削除しませんでした。');
    const remaining=saved.filter(g=>!(g?.gameType==='roulette-race'&&g.id===id));
    if(remaining.length===saved.length)return false;
    localStorage.setItem(key,JSON.stringify(remaining));return true;
  }
  return {alphabet,assigned,removePersonal,home:base.href};
})();
