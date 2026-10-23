// Missing completion-only writes, wrong record bucket, lost reload persistence,
// or a storage exception escaping into gameplay must fail this test.
const assert=require('node:assert/strict'),path=require('node:path');
const {setup}=require('./alphabet-helper.cjs');
const letters={upper:'ABCDEFGHIJKLMNOPQRSTUVWXYZ',lower:'abcdefghijklmnopqrstuvwxyz'};
const token=(mode,level)=>Buffer.from(JSON.stringify({v:1,g:'at',m:mode,l:level})).toString('base64url');
(async()=>{
  const t=await setup(),p=t.page,errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await t.context.addInitScript(()=>{window.testNow=100000;performance.now=()=>window.testNow;});
  const url=(mode,level)=>t.base+t.games+'/index.html#alphabet='+token(mode,level);
  const complete=async(mode,seconds)=>p.evaluate(({text,seconds})=>{
    window.testNow=alphabetStartedAt+seconds*1000;
    for(const letter of text)document.querySelector('[data-alphabet-letter="'+letter+'"]').click();
  },{text:letters[mode],seconds});
  try{
    for(const [mode,level,seconds,levelName] of [
      ['upper','easy',12.34,'Easy'],['upper','normal',13.45,'Normal'],['upper','hard',14.56,'Hard'],['upper','extra',15.67,'Extra Hard'],['upper','legend',16.78,'Legend'],
      ['lower','easy',21.23,'Easy'],['lower','normal',22.34,'Normal'],['lower','hard',23.45,'Hard'],['lower','extra',24.56,'Extra Hard'],['lower','legend',25.67,'Legend']
    ]){
      await p.goto(url(mode,level));
      assert.equal(await p.locator('#alphabetSetupBest').count(),1,'setup shows BEST for selected mode and level');
      assert.equal(await p.locator('#alphabetSetupBest').innerText(),'--:--','new bucket has no record');
      const before=await p.evaluate(()=>JSON.stringify(localStorage));
      await p.locator('#alphabetStart').click();
      await p.locator('[data-alphabet-letter="'+letters[mode][1]+'"]').evaluate(b=>b.click());
      assert.equal(await p.locator('.alphabet-letter.gone').count(),0);
      assert.equal(await p.evaluate(()=>JSON.stringify(localStorage)),before,'wrong answer cannot create a record');
      await p.locator('[data-alphabet-letter="'+letters[mode][0]+'"]').evaluate(b=>b.click());
      await p.reload();
      assert.equal(await p.locator('#alphabetSetupBest').innerText(),'--:--','abandoned run cannot create a record');
      await p.locator('#alphabetStart').click();await complete(mode,seconds);
      assert.equal(await p.locator('#alphabetFinishLevel').count(),1,'finish identifies the completed level');
      assert.equal(await p.locator('#alphabetFinishLevel').innerText(),levelName);
      assert.equal(await p.locator('#alphabetNewRecord').isVisible(),true,'first saved BEST is a new record');
      assert.equal(await p.locator('#alphabetNewRecord').innerText(),'New Record!!');
      assert.equal(await p.locator('#alphabetFinishBest').innerText(),seconds.toFixed(2)+' sec');
      assert.equal(await p.locator('#alphabetBest').innerText(),seconds.toFixed(2)+' sec');
      await p.reload();
      assert.equal(await p.locator('#alphabetSetupBest').innerText(),seconds.toFixed(2)+' sec','survives reload');
      await p.locator('#alphabetStart').click();await complete(mode,seconds+5);
      assert.equal(await p.locator('#alphabetFinishBest').innerText(),seconds.toFixed(2)+' sec','slower run preserves BEST');
      assert.equal(await p.locator('#alphabetNewRecord').isVisible(),false,'slower time is not a new record');
      await p.locator('#alphabetRetry').click();
      assert.equal(await p.locator('#alphabetNewRecord').evaluate(e=>e.hidden),true,'retry clears previous celebration');
      await complete(mode,seconds-1);
      assert.equal(await p.locator('#alphabetFinishBest').innerText(),(seconds-1).toFixed(2)+' sec','retry may improve BEST');
      assert.equal(await p.locator('#alphabetNewRecord').isVisible(),true,'faster saved BEST is a new record');
      await p.locator('#alphabetRetry').click();
      assert.equal(await p.locator('#alphabetNewRecord').evaluate(e=>e.hidden),true,'retry clears a visible new-record celebration');
    }
    // Equal times never attempt a write; write failure must preserve an existing BEST.
    await p.goto(url('upper','normal'));await p.reload();
    await p.evaluate(()=>Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError');});
    await p.locator('#alphabetStart').click();await complete('upper',12.45);
    assert.equal(await p.locator('#alphabetStorageNotice').isVisible(),false,'equal time needs no write');
    assert.equal(await p.locator('#alphabetNewRecord').isVisible(),false,'equal time is not a new record');
    await p.locator('#alphabetRetry').click();await complete('upper',11.45);
    assert.equal(await p.locator('#alphabetFinishBest').innerText(),'12.45 sec','failed write preserves saved BEST');
    assert.equal(await p.locator('#alphabetStorageNotice').isVisible(),true);
    assert.equal(await p.locator('#alphabetNewRecord').isVisible(),false,'failed save cannot claim a new record');
    await p.reload();
    // Switching mode and difficulty must immediately select the right bucket.
    await p.goto(t.base+t.games+'/index.html#/alphabetTouch');
    await p.getByRole('button',{name:'小文字',exact:true}).click();
    await p.getByRole('button',{name:'Hard',exact:true}).click();
    assert.equal(await p.locator('#alphabetSetupBest').innerText(),'22.45 sec');
    await p.getByRole('button',{name:'大文字',exact:true}).click();
    assert.equal(await p.locator('#alphabetSetupBest').innerText(),'13.56 sec');
    // Invalid data is ignored, never rendered as NaN/Infinity or an empty record.
    const key='dekiru-alphabet-best-v1:upper:easy';
    for(const bad of ['not json','null','"2"','0','-1','1e999','{}']){
      await p.evaluate(({key,bad})=>localStorage.setItem(key,bad),{key,bad});
      await p.goto(url('upper','easy'));await p.reload();
      assert.equal(await p.locator('#alphabetSetupBest').innerText(),'--:--');
    }
    // Restricted browser storage must not prevent START, completion, or retry.
    await p.evaluate(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError');}}));
    await p.locator('#alphabetStart').click();await complete('upper',9.87);
    assert.equal(await p.locator('#alphabetFinishTime').innerText(),'9.87 sec');
    assert.equal(await p.locator('#alphabetStorageNotice').isVisible(),true);
    assert.match(await p.locator('#alphabetStorageNotice').innerText(),/保存できません/);
    assert.equal(await p.locator('#alphabetNewRecord').isVisible(),false,'blocked storage cannot claim a new record');
    await p.locator('#alphabetRetry').click();assert.equal(await p.locator('.alphabet-letter.gone').count(),0);
    assert.deepEqual(errors,[]);
    await p.goto(url('lower','hard'));await p.reload();await p.locator('#alphabetStart').click();await complete('lower',19.87);
    await p.screenshot({path:path.join(process.env.ALPHABET_QA_DIR,'best-finish.png')});
    for(const [width,height] of [[1366,768],[1024,600],[390,844]]){
      await p.setViewportSize({width,height});
      for(const selector of ['#alphabetFinishLevel','#alphabetNewRecord','#alphabetFinishTime','#alphabetRetry','#alphabetToSetup']){
        const box=await p.locator(selector).boundingBox();assert.ok(box&&box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=height+1,selector+' fits finish '+width+'x'+height);
      }
    }
    console.log('PASS ten independent BEST records, completion-only writes, faster-only replacement, reload, switching, malformed data, blocked storage, retry');
  }finally{await t.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
