const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {setup}=require('./alphabet-helper.cjs');
const token=(mode,level)=>Buffer.from(JSON.stringify({v:1,g:'at',m:mode,l:level})).toString('base64url');
(async()=>{
  const t=await setup(),p=t.page,errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  try{
    for(const mode of ['upper','lower'])for(const level of ['easy','normal','hard','extra','legend']){
      await p.goto(t.base+t.games+'/index.html#alphabet='+token(mode,level));
      await p.locator('#alphabetStart').click();await p.evaluate(()=>document.fonts.ready);
      const letter=p.locator('[data-alphabet-letter]').first();
      const font=await letter.evaluate(e=>getComputedStyle(e).fontFamily);
      if(['easy','normal','hard'].includes(level)){
        assert.match(font,/RuRiRu Alphabet/,'card levels must use the actual bold RuRiRu font');
        assert.equal(await letter.evaluate(e=>getComputedStyle(e).fontSynthesis),'none','No synthetic bold');
        assert.equal(await letter.locator('.alphabet-guide').count(),1,'Every card has four-line guide');
        assert.equal(await letter.locator('.alphabet-glyph').count(),1,'Guide and letter share a sized frame');
        const lines=await letter.locator('.alphabet-guide').evaluate(e=>getComputedStyle(e).backgroundImage);
        assert.match(lines,/linear-gradient/);
        assert.equal(await p.evaluate(()=>[...document.fonts].some(f=>f.family.replaceAll('"','')==='RuRiRu Alphabet'&&f.status==='loaded')),true);
      }else{
        assert.match(font,/Andika/,'Extra and Legend retain the original font');
        assert.equal(await letter.locator('.alphabet-guide').count(),0);
      }
      const content=await p.locator('[data-alphabet-letter]').allTextContents();
      assert.equal(content.sort().join(''),mode==='lower'?'abcdefghijklmnopqrstuvwxyz':'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    }
    const response=await p.request.get(t.base+t.games+'/assets/fonts/RuRiRuFontv2-Bold.ttf');assert.equal(response.status(),200);
    assert.equal(crypto.createHash('sha256').update(await response.body()).digest('hex'),crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../games/assets/fonts/RuRiRuFontv2-Bold.ttf'))).digest('hex'));
    const out=process.env.ALPHABET_QA_DIR;fs.mkdirSync(out,{recursive:true});
    for(const [width,height] of [[1366,768],[1024,600],[390,844]])for(const mode of ['upper','lower'])for(const level of ['easy','hard']){
      await p.setViewportSize({width,height});await p.goto(t.base+t.games+'/index.html#alphabet='+token(mode,level));await p.reload();
      await p.locator('#alphabetStart').click();await p.evaluate(()=>document.fonts.ready);
      const result=await p.locator('[data-alphabet-letter]').evaluateAll(buttons=>buttons.map(b=>{
        const frame=b.querySelector('.alphabet-guide'),glyph=b.querySelector('.alphabet-glyph'),style=getComputedStyle(glyph),r=frame.getBoundingClientRect(),box=b.getBoundingClientRect();
        const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font=style.fontWeight+' '+style.fontSize+' '+style.fontFamily;
        const metrics=ctx.measureText(glyph.textContent);
        const probe=document.createElement('span');probe.style.cssText='display:inline-block;width:0;height:0;vertical-align:baseline';glyph.append(probe);
        const baseline=probe.getBoundingClientRect().top-r.top;probe.remove();
        const cap=ctx.measureText('H'),x=ctx.measureText('x'),desc=ctx.measureText('g');
        return {letter:glyph.textContent,font:parseFloat(style.fontSize),glyphTop:baseline-metrics.actualBoundingBoxAscent,glyphBottom:baseline+metrics.actualBoundingBoxDescent,height:r.height,width:r.width,cardWidth:box.width,cardHeight:box.height,lines:[0,.5,1,1.5].map(offset=>parseFloat(style.fontSize)*offset),actual:[baseline-cap.actualBoundingBoxAscent,baseline-x.actualBoundingBoxAscent,baseline,baseline+desc.actualBoundingBoxDescent]};
      }));
      for(const item of result){
        assert.ok(item.width<=item.cardWidth&&item.height<=item.cardHeight,'Guides fit inside '+item.letter);
        assert.ok(item.glyphTop>=-3&&item.glyphBottom<=item.height+3,'No clipped ascenders or descenders '+JSON.stringify(item));
        item.actual.forEach((actual,i)=>assert.ok(Math.abs(actual-item.lines[i])<=3.2,'Four-line alignment '+JSON.stringify(item)));
      }
      await p.screenshot({path:path.join(out,mode+'-'+level+'-'+width+'.png')});
    }
    assert.deepEqual(errors,[]);
    console.log('PASS real bold face, four guides and glyph alignment in both cases Easy/Normal/Hard; original Extra/Legend; three viewport sizes');
  }finally{await t.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
