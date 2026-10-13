globalThis.CardPractice=(()=>{
  const layouts={'list':'一覧（横カード）','1':'１枚ずつ（横カード・縦スクロール）','3':'３枚ずつ（縦カード・縦スクロール）','5':'５枚ずつ（縦カード・縦スクロール）'};
  function create(){let ranks=new Map();return {
    layout:'list',order:'ordered',
    configure(key,value){if(key==='layout'&&layouts[value])this.layout=value;if(key==='order'&&['ordered','random'].includes(value)){this.order=value;ranks=new Map();}},
    arrange(items){if(this.order==='ordered')return [...items];for(const item of items){const key=item.id||item.letter||item.ref;if(!ranks.has(key))ranks.set(key,Math.random());}return [...items].sort((a,b)=>ranks.get(a.id||a.letter||a.ref)-ranks.get(b.id||b.letter||b.ref));},
    settings(standard=false){return `<h2>発音練習の設定</h2><label class="practice-setting">表示枚数<select data-practice-setting="layout">${Object.entries(layouts).map(([v,label])=>`<option value="${v}" ${this.layout===v?'selected':''}>${standard?label.replace('横カード','縦カード'):label}</option>`).join('')}</select></label><label class="practice-setting">表示方法<select data-practice-setting="order"><option value="ordered" ${this.order==='ordered'?'selected':''}>順番通り</option><option value="random" ${this.order==='random'?'selected':''}>ランダム</option></select></label>`;}
  };}
  const observers=new WeakMap();
  function fitLabels(root){
    observers.get(root)?.disconnect();observers.delete(root);
    const grid=root.querySelector('.practice-grid:not([data-layout="list"])');
    if(!grid||!grid.closest('.content-panel'))return;
    const fit=()=>{
      if(!grid.isConnected)return;
      for(const label of grid.querySelectorAll('.practice-label')){
        label.style.fontSize='';label.style.overflowWrap='';
        const children=[...label.children];if(!children.length||!label.clientWidth)continue;
        const style=getComputedStyle(label),base=parseFloat(style.fontSize);
        const height=label.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
        const fits=()=>children.every(c=>c.scrollWidth<=c.clientWidth+1)&&children.reduce((sum,c)=>sum+Math.max(c.scrollHeight,c.getBoundingClientRect().height),0)<=height+.5;
        if(fits())continue;
        // Keep whole words where possible; shrink only labels that actually overflow.
        let low=10,high=base;label.style.fontSize=low+'px';
        if(!fits()){label.style.overflowWrap='anywhere';low=8;}
        for(let n=0;n<8;n++){
          const size=(low+high)/2;label.style.fontSize=size+'px';
          if(fits())low=size;else high=size;
        }
        label.style.fontSize=(Math.floor(low*10)/10)+'px';
      }
    };
    fit();
    if(typeof ResizeObserver!=='undefined'){
      const observer=new ResizeObserver(fit);observer.observe(grid);observers.set(root,observer);
    }
    document.fonts?.ready.then(fit);
  }
  return {create,fitLabels};
})();
