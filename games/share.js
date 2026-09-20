function rouletteAvailableCards(){
  const available=new Set(APP_DATA.completedPictureCardIds||[]);
  const base=APP_DATA.cards.filter(card=>available.has(card.id)&&card.image&&(card.displayGroup==='standard'||card.displayGroup==='plus'));
  return base.concat(APP_DATA.cards.filter(card=>available.has(card.id)&&card.image&&card.displayGroup==='lets-try'));
}
function defaultRouletteCardIds(){
  const ids=[];
  const seen=new Set();
  APP_DATA.mappings.filter(row=>row.unit===4).forEach(row=>{
    const expression=row.expressionId?expressionById.get(row.expressionId):null;
    const id=row.cardId||expression?.cardId||'';
    if(id&&!seen.has(id)&&cardById.get(id)?.image){seen.add(id);ids.push(id)}
  });
  return ids.length?ids:rouletteAvailableCards().slice(0,24).map(card=>card.id);
}
function normalizeRouletteConfig(value){
  const allowed=new Set(rouletteAvailableCards().map(card=>card.id));
  const hasExplicitSelection=Array.isArray(value?.selectedCardIds);
  const selected=[...new Set(Array.isArray(value?.selectedCardIds)?value.selectedCardIds:[])].filter(id=>allowed.has(id));
  const audiences=[...new Set(Array.isArray(value?.audiences)?value.audiences:[])].filter(item=>item==='class'||item==='individual');
  return {
    id:String(value?.id||''),
    gameType:'roulette-race',
    name:String(value?.name||'ROULETTE RACE').slice(0,50),
    cardCount:Math.max(1,Math.min(24,Number(value?.cardCount)||12)),
    everybodySentence:String(value?.everybodySentence||'').slice(0,120),
    selectedSentence:String(value?.selectedSentence||'').slice(0,120),
    assignedUnits:[...new Set(Array.isArray(value?.assignedUnits)?value.assignedUnits:[])].filter(key=>/^(lt1|lt2):[1-9]$/.test(key)),
    audiences:audiences.length?audiences:['individual'],
    selectedCardIds:hasExplicitSelection?selected:defaultRouletteCardIds(),
    display:{
      picture:value?.display?.picture!==false,
      english:value?.display?.english!==false,
      japanese:value?.display?.japanese===true,
    },
    createdAt:String(value?.createdAt||new Date().toISOString()),
    updatedAt:String(value?.updatedAt||new Date().toISOString()),
  };
}
function loadCreatedGames(){
  try{
    const stored=JSON.parse(localStorage.getItem(ROULETTE_STORAGE_KEY)||'[]');
    createdGames=(Array.isArray(stored)?stored:[]).filter(game=>game?.gameType==='roulette-race').map(normalizeRouletteConfig);
  }catch(error){createdGames=[]}
}
function persistCreatedGames(){
  try{localStorage.setItem(ROULETTE_STORAGE_KEY,JSON.stringify(createdGames))}catch(error){console.warn('ゲーム設定を保存できませんでした',error)}
}
function assignmentLabel(key){
  const parts=String(key).split(':');
  return parts[0]==='lt2'?"Let's Try 2 Unit "+parts[1]:"Let's Try 1 Unit "+parts[1];
}
function audienceLabel(audiences){
  const values=Array.isArray(audiences)?audiences:[];
  if(values.includes('class')&&values.includes('individual'))return 'みんなで・個別の端末で';
  return values.includes('class')?'みんなで':'個別の端末で';
}
function bytesToBase64Url(bytes){
  return window.ShareCodec.bytesToBase64Url(bytes);
}
function base64UrlToBytes(value){
  return window.ShareCodec.base64UrlToBytes(value);
}
function encodeRouletteCardSelection(cardIds){
  const cards=rouletteAvailableCards();
  const positions=new Map(cards.map((card,index)=>[card.id,index]));
  const bytes=new Uint8Array(Math.ceil(cards.length/8));
  cardIds.forEach(id=>{const index=positions.get(id);if(index!==undefined)bytes[index>>3]|=1<<(index&7)});
  return bytesToBase64Url(bytes);
}
function decodeRouletteCardSelection(value){
  const cards=rouletteAvailableCards();
  const bytes=base64UrlToBytes(value);
  return cards.filter((card,index)=>(bytes[index>>3]&(1<<(index&7)))!==0).map(card=>card.id);
}
function rouletteSharePayload(config){
  const normalized=normalizeRouletteConfig(config);
  return {
    v:1,g:'rr',n:normalized.name,c:normalized.cardCount,
    e:normalized.everybodySentence,s:normalized.selectedSentence,
    u:normalized.assignedUnits,a:normalized.audiences,
    d:(normalized.display.picture?'1':'0')+(normalized.display.english?'1':'0')+(normalized.display.japanese?'1':'0'),
    w:encodeRouletteCardSelection(normalized.selectedCardIds),
  };
}
function encodeRouletteShare(config){
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(rouletteSharePayload(config))));
}
function decodeRouletteShare(value){
  const payload=JSON.parse(new TextDecoder().decode(base64UrlToBytes(value)));
  if(payload?.v!==1||payload?.g!=='rr')throw new Error('未対応の配布URLです');
  const selectedCardIds=decodeRouletteCardSelection(payload.w);
  if(!selectedCardIds.length)throw new Error('配布された単語を読み込めません');
  const display=String(payload.d||'110');
  return normalizeRouletteConfig({
    name:payload.n,cardCount:payload.c,everybodySentence:payload.e,selectedSentence:payload.s,
    assignedUnits:payload.u,audiences:payload.a,selectedCardIds,
    display:{picture:display[0]!=='0',english:display[1]!=='0',japanese:display[2]==='1'},
  });
}
function buildRouletteShareUrl(config){
  const base=location.origin&&location.origin!=='null'?location.origin+location.pathname:location.href.split('#')[0];
  return base+'#play='+encodeRouletteShare(config);
}
function closeRouletteShare(){
  const modal=document.getElementById('rouletteShareModal');
  if(modal)modal.hidden=true;
  currentRouletteShareUrl='';
}
function openRouletteShare(config){
  const modal=document.getElementById('rouletteShareModal');
  const qrRoot=document.getElementById('rouletteShareQr');
  if(!modal||!qrRoot)return;
  currentRouletteShareUrl=buildRouletteShareUrl(config);
  document.getElementById('rouletteShareGameName').textContent=config.name;
  document.getElementById('rouletteShareStatus').textContent='';
  try{
    if(typeof qrcode!=='function')throw new Error('QRコード機能を読み込めませんでした');
    const qr=qrcode(0,'L');
    qr.addData(currentRouletteShareUrl);
    qr.make();
    qrRoot.innerHTML=qr.createSvgTag(6,4);
  }catch(error){
    qrRoot.innerHTML='<p>QRコードを作成できませんでした。<br>「URLをコピーする」をお使いください。</p>';
  }
  modal.hidden=false;
  requestAnimationFrame(()=>document.getElementById('rouletteCopyUrl')?.focus());
}
async function copyRouletteShareUrl(){
  if(!currentRouletteShareUrl)return;
  let copied=false;
  try{await navigator.clipboard.writeText(currentRouletteShareUrl);copied=true}catch(error){}
  if(!copied){
    const input=document.createElement('textarea');
    input.value=currentRouletteShareUrl;
    input.style.position='fixed';input.style.opacity='0';
    document.body.append(input);input.select();
    try{copied=document.execCommand('copy')}catch(error){}
    input.remove();
  }
  document.getElementById('rouletteShareStatus').textContent=copied?'URLをコピーしました':'URLをコピーできませんでした';
}
function openSharedRouletteFromHash(){
  const match=location.hash.match(/^#play=([A-Za-z0-9_-]+)$/);
  if(!match)return false;
  try{
    const config=decodeRouletteShare(match[1]);
    rouletteSharedMode=true;
    openRouletteRace(config,'sharedGame');
    return true;
  }catch(error){
    console.warn('配布URLを読み込めませんでした',error);
    history.replaceState(null,'',location.pathname+location.search);
    rouletteSharedMode=false;
    return false;
  }
}
