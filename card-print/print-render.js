window.CardPrintRender=(()=>{
'use strict';
const MM=240/25.4,W=Math.round(210*MM),H=Math.round(297*MM);
const images=new Map();
async function loadImage(card){
 if(images.has(card.id))return images.get(card.id);
 const image=new Image();image.decoding='async';
 const ready=new Promise((resolve,reject)=>{image.onload=()=>resolve(image);image.onerror=()=>reject(Error(card.english+' の絵を読み込めません。'));});
 image.src=card.src;images.set(card.id,ready);
 try{return await ready;}catch(error){images.delete(card.id);throw error;}
}
async function prepare(cards,font){
 if(font!=='none'){
  const family=font==='ruriru'?'PrintRuRiRu':'PrintAndika';
  await document.fonts.load('24px '+family);
  if(!document.fonts.check('24px '+family))throw Error('印刷用フォントを読み込めません。再読み込みしてください。');
 }
 const artwork=new Map();
 for(let offset=0;offset<cards.length;offset+=20){
  await Promise.all(cards.slice(offset,offset+20).map(async card=>artwork.set(card.id,await loadImage(card))));
 }
 return artwork;
}
function contain(ctx,image,x,y,w,h){
 const scale=Math.min(w/image.naturalWidth,h/image.naturalHeight),dw=image.naturalWidth*scale,dh=image.naturalHeight*scale;
 ctx.drawImage(image,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
}
function wrapped(ctx,text,max){
 const parts=String(text).split(/\s+/),lines=[];let line='';
 for(const word of parts){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>max){lines.push(line);line=word;}else line=next;}
 if(line)lines.push(line);return lines;
}
function caption(ctx,text,x,y,w,h,font,scaleToCard=false){
 const family=font==='ruriru'?'PrintRuRiRu':'PrintAndika';
 let size=Math.min(scaleToCard?h:12*MM,h/(font==='ruriru'?1.875:1.4)),lines;
 for(;;){ctx.font=size+'px '+family;lines=wrapped(ctx,text,w-2*MM);if((lines.length*(font==='ruriru'?1.875:1.35)*size<=h&&lines.every(l=>ctx.measureText(l).width<=w-2*MM))||size<1.5*MM)break;size*=.93;}
 const lineHeight=size*(font==='ruriru'?1.875:1.35),top=y+(h-lineHeight*lines.length)/2;
 ctx.textAlign='center';ctx.fillStyle='#242424';
 lines.forEach((line,i)=>{
  const lineTop=top+i*lineHeight;
  if(font==='ruriru'){
   ctx.lineWidth=scaleToCard?Math.max(.3*MM,size*.012):.24*MM;ctx.setLineDash([]);
   [6,22,38,54].forEach((position,j)=>{ctx.strokeStyle=j===2?'#bc3e78':'#579cc2';ctx.beginPath();ctx.moveTo(x,lineTop+position/32*size);ctx.lineTo(x+w,lineTop+position/32*size);ctx.stroke();});
   ctx.textBaseline='alphabetic';ctx.fillText(line,x+w/2,lineTop+38/32*size);
  }else{ctx.textBaseline='middle';ctx.fillText(line,x+w/2,lineTop+lineHeight/2);}
 });
}
function draw(page,config,artwork,catalog){
 const {width:W,height:H}=dimensions(config.orientation);
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');
 ctx.fillStyle='white';ctx.fillRect(0,0,W,H);
 const l=CardPrintCore.layout(config.size,config.orientation),pad=config.size==='business'?3:5;
 page.slots.forEach((slot,index)=>{
  if(!slot)return;
  const x=(l.x+(index%l.cols)*l.w)*MM,y=(l.y+Math.floor(index/l.cols)*l.h)*MM,w=l.w*MM,h=l.h*MM;
  const innerX=x+pad*MM,innerY=y+pad*MM,innerW=w-pad*2*MM,innerH=h-pad*2*MM;
  ctx.save();ctx.beginPath();ctx.rect(x+MM,y+MM,w-2*MM,h-2*MM);ctx.clip();
  let header=0;
  if(config.title){ctx.font=3*MM+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='top';ctx.fillStyle='#333';ctx.fillText(config.title,innerX+innerW/2,innerY,innerW);header+=4.5*MM;}
  if(config.kind==='activity'){ctx.font=3.3*MM+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='top';ctx.fillStyle='#333';ctx.fillText('No. '+slot.number,innerX+innerW/2,innerY+header);header+=5*MM;}
  const ids=slot[page.side],cols=config.orientation==='landscape'&&ids.length<=4?ids.length:ids.length===1?1:ids.length<=4?2:3,rows=Math.ceil(ids.length/cols),gap=2*MM;
  const cellW=(innerW-(cols-1)*gap)/cols,cellH=(innerH-header-(rows-1)*gap)/rows;
  ids.forEach((id,i)=>{
   const card=catalog.get(id),image=artwork.get(id),cx=innerX+(i%cols)*(cellW+gap),cy=innerY+header+Math.floor(i/cols)*(cellH+gap);
   const labelH=config.font==='none'?0:config.kind==='pictures'?cellH*.28:Math.min(cellH*.36,12*MM);
   contain(ctx,image,cx,cy,cellW,cellH-labelH);
   if(labelH)caption(ctx,card.english,cx,cy+cellH-labelH,cellW,labelH,config.font,config.kind==='pictures');
  });
  ctx.restore();
 });
 ctx.lineWidth=.1*MM;ctx.strokeStyle='#aaaaaa';ctx.setLineDash([1*MM,1*MM]);
 for(let c=0;c<=l.cols;c++){const x=(l.x+c*l.w)*MM;ctx.beginPath();ctx.moveTo(x,l.y*MM);ctx.lineTo(x,(l.y+l.rows*l.h)*MM);ctx.stroke();}
 for(let r=0;r<=l.rows;r++){const y=(l.y+r*l.h)*MM;ctx.beginPath();ctx.moveTo(l.x*MM,y);ctx.lineTo((l.x+l.cols*l.w)*MM,y);ctx.stroke();}
 return canvas;
}
async function jpeg(canvas){
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.95));
 if(!blob)throw Error('PDF用の画像を作れません。');
 return new Uint8Array(await blob.arrayBuffer());
}
function dimensions(orientation){return orientation==='landscape'?{width:H,height:W}:{width:W,height:H};}
return {prepare,draw,jpeg,dimensions,width:W,height:H};
})();


