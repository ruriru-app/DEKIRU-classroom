const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('./print-core.js');
function picturePositions(count,orientation){
 const positions=[],ctx={fillRect(){},save(){},beginPath(){},rect(){},clip(){},fillText(){},restore(){},setLineDash(){},moveTo(){},lineTo(){},stroke(){},drawImage(image,x,y,w,h){positions.push({x:x+w/2,y:y+h/2});}};
 const context={window:{},CardPrintCore:C,document:{createElement:()=>({getContext:()=>ctx})}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('./print-render.js'),'utf8'),context);
 const ids=Array.from({length:count},(_,i)=>String(i)),art=new Map(ids.map(id=>[id,{naturalWidth:100,naturalHeight:100}]));
 context.window.CardPrintRender.draw({side:'front',slots:[{number:1,front:ids}]},{size:'business',kind:'activity',orientation,font:'none',title:''},art,new Map());
 return positions;
}
for(const count of [3,4])test(count+' pictures share one horizontal row in landscape cards',()=>{
 const p=picturePositions(count,'landscape');assert.equal(p.length,count);assert.equal(new Set(p.map(x=>x.y)).size,1);assert.equal(new Set(p.map(x=>x.x)).size,count);
});
test('portrait cards retain two-column wrapping',()=>{
 const p=picturePositions(4,'portrait');assert.equal(new Set(p.map(x=>x.y)).size,2);assert.equal(new Set(p.map(x=>x.x)).size,2);
});
