const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup}=require('./alphabet-helper.cjs');
const lower='abcdefghijklmnopqrstuvwxyz',upper='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const token=payload=>Buffer.from(JSON.stringify(payload)).toString('base64url');
(async()=>{
  const t=await setup(),p=t.page,errors=[];
  // Classroom links use the public /games/ path. Resolve it to the current
  // source during source QA; built QA uses the actual generated directory.
  if(t.games!=='games')await t.context.route(t.base+'games/**',route=>route.continue({url:route.request().url().replace(t.base+'games/',t.base+t.games+'/')}));
  p.on('pageerror',e=>errors.push(e.message));
  await t.context.addInitScript(()=>{
    window.alphabetSpoken=[];
    speechSynthesis.speak=u=>window.alphabetSpoken.push(u.text);
    speechSynthesis.cancel=()=>{};
  });
  const game=t.base+t.games+'/index.html';
  const boardLetters=()=>p.locator('[data-alphabet-letter]').allTextContents();
  const assertStudentSafe=async()=>{
    assert.equal(await p.locator('#homeBtn').isVisible(),false);
    assert.equal(await p.locator('#alphabetBack').isVisible(),false);
    assert.equal(await p.locator('#alphabetDistribute').isVisible(),false);
    assert.equal(await p.locator('.page.active').getAttribute('id'),'alphabetTouch');
  };
  try{
    // A missing switch, wrong event binding, or uppercase-only renderer fails here.
    await p.goto(game+'#/alphabetTouch');
    const lowerButton=p.getByRole('button',{name:'小文字',exact:true});
    assert.equal(await lowerButton.count(),1,'setup offers lowercase');
    await lowerButton.click();assert.equal(await lowerButton.getAttribute('aria-pressed'),'true');
    await p.locator('#alphabetDistribute').click();
    const share=await p.evaluate(()=>currentRouletteShareUrl);
    assert.equal(JSON.parse(Buffer.from(new URL(share).hash.slice(10),'base64url')).m,'lower');
    assert.match(await p.locator('#rouletteShareGameName').innerText(),/小文字/);
    await p.goto(share);await assertStudentSafe();
    await p.locator('#alphabetStart').click();
    assert.equal((await boardLetters()).sort().join(''),lower);
    assert.equal(await p.locator('#alphabetNextLetter').innerText(),'a');
    await p.waitForFunction(()=>window.alphabetSpoken.includes('A'));
    await p.locator('[data-alphabet-letter=b]').click();
    assert.equal(await p.locator('.alphabet-letter.gone').count(),0);
    for(const letter of lower)await p.locator('[data-alphabet-letter='+letter+']').click();
    assert.equal(await p.locator('#alphabetFinish').isVisible(),true);await assertStudentSafe();
    await p.locator('#alphabetRetry').click();assert.equal(await p.locator('.alphabet-letter.gone').count(),0);
    await p.locator('#alphabetBack').evaluate(e=>e.click());await assertStudentSafe();
    await p.locator('#alphabetToSetup').evaluate(e=>e.click());await assertStudentSafe();
    assert.equal(await p.locator('#alphabetSetup').isVisible(),true);
    // Every difficulty keeps lowercase; Legend still moves and stays in bounds.
    for(const level of ['normal','hard','extra','legend']){
      await p.goto(game+'#alphabet='+token({v:1,g:'at',m:'lower',l:level}));
      await p.locator('#alphabetStart').click();assert.equal((await boardLetters()).sort().join(''),lower);
      assert.equal(await p.locator('#alphabetNext').isVisible(),false);
      if(level==='legend'){
        const first=p.locator('[data-alphabet-letter=a]');
        const start=await first.evaluate(e=>e.style.transform);
        await p.waitForFunction(before=>document.querySelector('[data-alphabet-letter=a]').style.transform!==before,start);
      }
      for(const letter of lower)await p.locator('[data-alphabet-letter='+letter+']').evaluate(e=>e.click());
      assert.equal(await p.locator('#alphabetFinish').isVisible(),true);await assertStudentSafe();
    }
    for(const payload of [{v:1,g:'at',m:'upper',l:'easy'},{v:1,g:'at',l:'normal'}]){
      await p.goto(game+'#alphabet='+token(payload));await p.locator('#alphabetStart').click();
      assert.equal((await boardLetters()).sort().join(''),upper);await assertStudentSafe();
    }
    // All 26 moving letters can pile up. The next letter must remain the real
    // pointer target (not merely have a class claiming it is in front).
    for(const [mode,letters] of [['upper',upper],['lower',lower]]){
      await p.goto(game+'#alphabet='+token({v:1,g:'at',m:mode,l:'legend'}));await p.locator('#alphabetStart').click();
      await p.waitForFunction(()=>alphabetMovingItems.length===26);
      const point=await p.evaluate(()=>{
        cancelAnimationFrame(alphabetMotionFrame);alphabetMotionFrame=0;
        document.querySelectorAll('[data-alphabet-letter]').forEach(e=>e.style.transform='translate3d(100px,100px,0)');
        const box=document.getElementById('alphabetBoard').getBoundingClientRect();return {x:box.left+112,y:box.top+112};
      });
      for(const letter of letters){
        const top=await p.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('[data-alphabet-letter]')?.dataset.alphabetLetter,point);
        assert.equal(top,letter,'Legend overlap exposes '+letter+' in '+mode);
        await p.mouse.click(point.x,point.y);
      }
      assert.equal(await p.locator('#alphabetFinish').isVisible(),true);
    }
    // Classroom must open and distribute the same small lowercase URL from LT2 Unit6.
    for(const [book,letters] of [['lt1',upper],['lt2',lower]]){
      await p.goto(t.base+t.grade+'/index.html#/unit/'+book+'/6');
      const tile=p.locator('article[aria-label="ALPHABET TOUCH"]');assert.equal(await tile.count(),1);
      await tile.evaluate(e=>{for(let a=e.parentElement;a;a=a.parentElement)if(a.tagName==='DETAILS')a.open=true;});
      const link=tile.locator('a');assert.equal(await link.getAttribute('target'),'_blank');
      const url=await link.getAttribute('href');assert.equal(await tile.locator('[data-game-share]').getAttribute('data-game-share'),url);
      const popup=p.waitForEvent('popup');await link.click();const child=await popup;
      await child.locator('#alphabetStart').click();
      assert.equal((await child.locator('[data-alphabet-letter]').allTextContents()).sort().join(''),letters);
      await child.close();
    }
    // Invalid delivery links stay on an activity-local error, never a teacher/top page.
    await p.goto(game+'#alphabet=broken');await assertStudentSafe();
    assert.equal(await p.locator('[role=alert]').isVisible(),true);
    assert.equal(await p.locator('#alphabetStart').isVisible(),false);
    await p.reload();await assertStudentSafe();
    // Keep the existing styling and fit on common student screens.
    const out=path.join(process.env.ALPHABET_QA_DIR,'lowercase');fs.mkdirSync(out,{recursive:true});
    for(const [width,height] of [[1366,768],[1024,600],[390,844]]){
      await p.setViewportSize({width,height});await p.goto(game+'#/alphabetTouch');await p.reload();await lowerButton.click();
      for(const selector of ['#alphabetStart','[data-alphabet-mode=upper]','[data-alphabet-mode=lower]']){
        const box=await p.locator(selector).boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=height+1,selector+' fits '+width+'x'+height);
      }
      await p.locator('#alphabetStart').click();
      await p.evaluate(()=>document.fonts.ready);
      assert.equal(await p.locator('[data-alphabet-letter=a]').evaluate(e=>getComputedStyle(e).fontFamily.includes('RuRiRu Alphabet')),true);
      await p.screenshot({path:path.join(out,'lowercase-'+width+'.png')});
    }
    assert.deepEqual(errors,[]);
    console.log('PASS lowercase UI, five levels, pronunciation, retry, mode URL, legacy URLs, both Unit6 tiles, student navigation and three screen sizes');
  }catch(error){
    console.error('Alphabet browser state',await p.evaluate(()=>({url:location.href,active:document.querySelector('.page.active')?.id,optionsHidden:document.getElementById('alphabetOptions')?.hidden,sharedError:document.getElementById('alphabetShareError')?.hidden,pageErrors:window.alphabetSpoken})),errors);
    throw error;
  }finally{await t.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
