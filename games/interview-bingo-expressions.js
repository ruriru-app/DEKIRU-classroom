/* Contextual display only; dictionary labels and reusable presets stay unchanged. */
(function(root){
  'use strict';
  function render(expressions,card,{completeExpressions,forms}){
    const template=expressions?.template||'',slots=expressions?.slots||[];
    if(slots.length>1)return {text:template,notice:'複数の独立した差し替え枠は、この児童プレビューでは未対応です。',supported:false};
    if(!slots.length)return {text:template,notice:'',supported:true};
    if(!card)return {text:template,notice:'左のマスを選んで、質問するカードを決めましょう。',supported:true};
    try{
      const text=template.replace(/\(P[1-9]?\)/g,(marker,offset)=>{
        const prefix=template.slice(0,offset);let form=card;
        if(/\bhave\s*$/i.test(prefix)&&card.category==='stationery')form={...card,...forms.possession(card,1)};
        else if(/\blike\s*$/i.test(prefix))form={...card,...forms.preference(card)};
        return completeExpressions({expressions:{template:marker,slots}},form);
      });
      return {text,notice:'',supported:true};
    }catch{return {text:template,notice:'このカードでは表現を確認できません。候補カードを確認してください。',supported:false};}
  }
  const api={render};root.InterviewBingoExpressions=api;if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
