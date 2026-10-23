(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.CardPrintCore=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
function integer(value,min,max,label){if(!Number.isInteger(value)||value<min||value>max)throw Error(label+'は'+min+'～'+max+'で指定してください。');return value;}
function groups(side){
 const selected=side.groups.filter(g=>g.ids.length);
 if(!selected.length)throw Error('印刷する絵を選んでください。');
 const result=side.rule==='pooled'?[{ids:[...new Set(selected.flatMap(g=>g.ids))],count:side.total}]:selected;
 result.forEach(g=>{integer(g.count,1,12,'1枚に入れる絵の数');if(g.count>g.ids.length)throw Error('絵の数が候補の単語数を超えています。候補を増やすか、入れる数を減らしてください。');});
 if(result.reduce((n,g)=>n+g.count,0)>12)throw Error('児童用カード1枚に入れる絵は12個以内にしてください。');
 return result;
}
function generate(config,random=Math.random){
 integer(config.count,1,200,'児童用カードの枚数');
 const front=groups(config.front),back=config.duplex?groups(config.back):null,counts={},cards=[];
 function choose(rules){
  const chosen=[];
  for(const group of rules)for(let i=0;i<group.count;i++){
   const available=group.ids.filter(id=>!chosen.includes(id));
   if(!available.length)throw Error('同じカード内で絵が重複します。候補を確認してください。');
   const minimum=Math.min(...available.map(id=>counts[id]||0)),ties=available.filter(id=>(counts[id]||0)===minimum);
   const id=ties[Math.floor(random()*ties.length)];chosen.push(id);counts[id]=(counts[id]||0)+1;
  }
  // Randomize picture positions without changing the balanced distribution order.
  for(let i=chosen.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[chosen[i],chosen[j]]=[chosen[j],chosen[i]];}
  return chosen;
 }
 for(let number=1;number<=config.count;number++)cards.push({number,front:choose(front),back:back?choose(back):[]});
 return {cards,counts};
}
function pictureCards(ids,copies){
 integer(copies,1,30,'各ピクチャーカードの枚数');
 if(!ids.length)throw Error('印刷する絵を選んでください。');
 if(ids.length*copies>500)throw Error('一度に印刷するピクチャーカードは500枚以内にしてください。');
 return ids.flatMap(id=>Array.from({length:copies},()=>id)).map((id,i)=>({number:i+1,front:[id],back:[]}));
}
function layout(size){
 if(size==='business')return {cols:4,rows:3,w:50,h:89,x:5,y:15};
 if(size==='nine')return {cols:3,rows:3,w:70,h:99,x:0,y:0};
 const configs={picture1:[1,1],picture2:[1,2],picture4:[2,2],picture6:[2,3],picture9:[3,3]};
 const dimensions=configs[size];if(!dimensions)throw Error('カードサイズが正しくありません。');
 const [cols,rows]=dimensions;return {cols,rows,w:200/cols,h:287/rows,x:5,y:5};
}
function pages(cards,size,duplex,flip='long'){
 const l=layout(size),per=l.cols*l.rows,front=[],back=[];
 for(let offset=0;offset<cards.length;offset+=per){
  const f=Array.from({length:per},(_,slot)=>cards[offset+slot]||null),b=new Array(per).fill(null);
  for(let i=0;i<per;i++){const row=Math.floor(i/l.cols),col=i%l.cols;const target=flip==='short'?(l.rows-1-row)*l.cols+col:row*l.cols+(l.cols-1-col);b[target]=f[i];}
  front.push({side:'front',slots:f,sheet:front.length+1});
  if(duplex)back.push({side:'back',slots:b,sheet:back.length+1});
 }
 return {front,back,interleaved:front.flatMap((page,i)=>duplex?[page,back[i]]:[page])};
}
// Self-contained PDF: one high-resolution JPEG per A4 page. Fonts and artwork are baked in.
function pdf(jpegs,width,height){
 if(!jpegs.length)throw Error('PDFに保存するページがありません。');
 const encoder=new TextEncoder(),chunks=[],offsets=[0];let length=0;
 const add=value=>{const bytes=typeof value==='string'?encoder.encode(value):value;chunks.push(bytes);length+=bytes.length;};
 const object=(id,content)=>{offsets[id]=length;add(id+' 0 obj\n');add(content);add('\nendobj\n');};
 add('%PDF-1.4\n%DEKIRU\n');
 object(1,'<< /Type /Catalog /Pages 2 0 R >>');
 object(2,'<< /Type /Pages /Count '+jpegs.length+' /Kids ['+jpegs.map((_,i)=>(3+i*3)+' 0 R').join(' ')+'] >>');
 jpegs.forEach((bytes,i)=>{
  const page=3+i*3,image=page+1,stream=page+2;
  object(page,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.27559 841.88976] /Resources << /XObject << /Im '+image+' 0 R >> >> /Contents '+stream+' 0 R >>');
  offsets[image]=length;add(image+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+width+' /Height '+height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+bytes.length+' >>\nstream\n');add(bytes);add('\nendstream\nendobj\n');
  const commands='q\n595.27559 0 0 841.88976 0 0 cm\n/Im Do\nQ\n';
  object(stream,'<< /Length '+encoder.encode(commands).length+' >>\nstream\n'+commands+'endstream');
 });
 const start=length,count=3+jpegs.length*3;add('xref\n0 '+count+'\n0000000000 65535 f \n');
 for(let id=1;id<count;id++)add(String(offsets[id]).padStart(10,'0')+' 00000 n \n');
 add('trailer\n<< /Size '+count+' /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF');
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
return Object.freeze({generate,pictureCards,layout,pages,pdf});
});


