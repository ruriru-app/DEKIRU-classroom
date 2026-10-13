const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {setup}=require(fs.existsSync(path.join(__dirname,'interview-test-helper.cjs'))?'./interview-test-helper.cjs':'./practice-test-helper.cjs');
async function withPractice(kind,run){
 const t=await setup(),errors=[];t.page.on('pageerror',e=>errors.push(e.message));try{
  if(process.env.INTERVIEW_PUBLIC==='1'){t.base='https://ruriru-app.github.io/DEKIRU-classroom/';t.grade='grade34';t.senior='grade56';t.page.setDefaultTimeout(20000);}
  const p=t.page;await p.goto(t.base+(kind==='nhe'?t.senior+'/index.html#/unit/nh6/6':t.grade+'/index.html#/unit/lt1/4'));
  if(kind==='nhe'){
   await p.locator('[data-nhe-group="living_things:plus"]').check();
   await p.getByText('Words and Phrases',{exact:true}).click();await p.getByRole('button',{name:'発音練習',exact:true}).click();
  }else{await p.locator('summary').filter({hasText:'Words & Phrases'}).click();await p.locator('[data-feature="pronunciation"]').click();}
  await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>[...document.querySelectorAll('.practice-card img')].every(i=>i.complete&&i.naturalWidth>0),null,{timeout:45000});await run(t);assert.deepEqual(errors,[],'No browser script errors');
 }finally{await t.close();}
}
async function settle(p){await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function choose(p,layout){await p.locator('[data-practice-setting="layout"]').selectOption(layout);await settle(p);}
async function shortWord(p,word){return p.locator('.practice-card').filter({has:p.locator('strong',{hasText:new RegExp('^'+word+'$')})}).locator('.practice-label').evaluate(l=>({font:parseFloat(getComputedStyle(l).fontSize),width:l.parentElement.clientWidth}));}
for(const kind of ['nhe','lt']){
 test(kind+' short word text scales with enlarged 5/3/1-card pictures, retaining the overview',async()=>withPractice(kind,async({page:p})=>{
  const word=kind==='nhe'?'desert':'white';const overview=await shortWord(p,word);
  for(const layout of ['5','3','1']){
   await choose(p,layout);const s=await shortWord(p,word);
   assert.ok(s.font/s.width>=.13,JSON.stringify({kind,layout,...s})+' text must use the enlarged card width');
  }
  await choose(p,'list');assert.equal((await shortWord(p,word)).font,overview.font,'Overview text must stay unchanged');
 }));
 test(kind+' long text stays fully visible while toggling labels, pictures, viewport and fullscreen',async()=>withPractice(kind,async({page:p})=>{
  const display=field=>p.locator(kind==='nhe'?'[data-nhe-display="'+field+'"]':'[data-display="'+field+'"]');
  if(kind==='lt')await p.locator('[data-accordion="display"] summary').click();
  for(const viewport of [{width:1920,height:1080},{width:1280,height:600}]){
   await p.setViewportSize(viewport);
   for(const layout of ['1','3','5']){
    await choose(p,layout);
    for(const [english,japanese,image]of [[true,false,true],[true,true,true],[false,true,true],[true,true,false]]){
     await display('english').setChecked(english);await display('japanese').setChecked(japanese);await display('image').setChecked(image);await settle(p);
     const overflow=await p.locator('.practice-label').evaluateAll(labels=>labels.flatMap(l=>{
      const b=l.getBoundingClientRect(),s=getComputedStyle(l),left=b.left+parseFloat(s.paddingLeft),right=b.right-parseFloat(s.paddingRight),top=b.top+parseFloat(s.paddingTop),bottom=b.bottom-parseFloat(s.paddingBottom);
      return [...l.children].flatMap(c=>{const r=c.getBoundingClientRect();return c.scrollWidth>c.clientWidth+1||r.left<left-1||r.right>right+1||r.top<top-1||r.bottom>bottom+1?[{word:l.textContent,font:s.fontSize,overflow:[r.left-left,r.right-right,r.top-top,r.bottom-bottom]}]:[];});
     }));
     assert.equal(overflow.length,0,JSON.stringify({kind,viewport,layout,english,japanese,image,examples:overflow.slice(0,3)}));
    }
   }
  }
  await display('image').check();await display('english').check();await display('japanese').uncheck();await choose(p,'3');
  await p.getByRole('button',{name:'全画面表示',exact:true}).click();await p.waitForFunction(()=>document.fullscreenElement||document.querySelector('.fullscreen-content'));await settle(p);
  const short=await shortWord(p,kind==='nhe'?'desert':'white');assert.ok(short.font/short.width>=.13,'Fullscreen text must rescale with pictures');
  if(process.env.PRACTICE_SCREENSHOT==='1'){
   if(kind==='lt')await p.locator('.practice-card').filter({has:p.locator('strong',{hasText:/^red$/})}).scrollIntoViewIfNeeded();
   await p.screenshot({path:path.resolve(__dirname,'../qa/build-my-speech/practice-text-'+kind+'-'+(process.env.INTERVIEW_PUBLIC==='1'?'published':'built')+'.png')});
  }
 }));
}
test('a fitted long phrase grows again on a wider screen, without splitting a single word',async()=>withPractice('nhe',async({page:p})=>{
 await choose(p,'3');await p.setViewportSize({width:1280,height:600});await settle(p);
 const phrase=p.locator('.practice-card').filter({has:p.locator('strong',{hasText:'refuse to buy wildlife products'})}).locator('.practice-label');
 const narrow=await phrase.evaluate(l=>parseFloat(getComputedStyle(l).fontSize));
 await p.setViewportSize({width:1920,height:1080});await settle(p);
 const wider=await phrase.evaluate(l=>parseFloat(getComputedStyle(l).fontSize));
 assert.ok(wider>narrow*1.25,JSON.stringify({narrow,wider})+' fitted text must grow after resizing');
 const word=p.locator('.practice-card strong').filter({hasText:/^rainforest$/});
 for(const layout of ['1','3','5']){
  await choose(p,layout);
  assert.equal(await word.evaluate(e=>{const r=document.createRange();r.selectNodeContents(e);return r.getClientRects().length;}),1,'A single word remains on one line');
 }
}));
