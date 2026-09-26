(() => {
  'use strict';
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let activeDialog=null;
  function closeDialog(){if(activeDialog){activeDialog.close();activeDialog.remove();activeDialog=null;}}
  window.addEventListener('hashchange',closeDialog);
  function mount(sidebar,{unit,groups,getSelected,apply}) {
    const list=document.createElement('section');list.className='nhe-saved-sets';
    sidebar.querySelector('.page-heading').after(list);
    const save=document.createElement('button');save.className='secondary-button nhe-set-save';save.dataset.nheSaveSet='';save.textContent='セットを保存';
    sidebar.querySelector('.nhe-save-status').before(save);
    const status=document.createElement('p');status.dataset.nheSetStatus='';status.setAttribute('role','status');save.after(status);
    function refresh(){
      try {
        const sets=window.SavedCardSets.list(unit);
        list.innerHTML='<h2>保存したカードセット</h2>'+ (sets.length?sets.map(s=>`<div class="nhe-saved-row"><button class="side-action" data-nhe-load-set="${esc(s.id)}">${esc(s.name)}</button><div><button class="secondary-button" data-nhe-edit-set="${esc(s.id)}">確認・編集</button><button class="secondary-button" data-nhe-delete-set="${esc(s.id)}">削除</button></div></div>`).join(''):'<p>単語を選び「セットを保存」で追加できます。</p>');
      }catch(e){list.textContent=e.message;}
    }
    function edit(set){
      const selected=new Set(set?window.CardSet.resolve(set.payload).items.map(c=>c.id):getSelected());
      if(!set&&!selected.size){status.textContent='保存する単語を選択してください。';return;}
      closeDialog();
      const dialog=document.createElement('dialog');activeDialog=dialog;dialog.className='nhe-set-dialog';
      dialog.setAttribute('aria-labelledby','nhe-set-heading');
      dialog.innerHTML=`<form><h2 id="nhe-set-heading">${set?'カードセットの確認・編集':'カードセットを保存'}</h2><label>セット名<input name="setName" maxlength="60" required value="${esc(set?.name||'')}" autocomplete="off"></label><p>この端末のブラウザー内に保存されます。</p>${set?'<div class="nhe-set-words">'+groups.map(g=>`<fieldset><legend>${esc(g.label)}</legend>${g.cards.map(c=>`<label><input type="checkbox" data-set-word="${esc(c.id)}" ${selected.has(c.id)?'checked':''}>${esc(c.english)}</label>`).join('')}</fieldset>`).join('')+'</div>':`<p>${selected.size}語を保存します。</p>`}<p role="alert"></p><div class="nhe-set-actions"><button type="button" data-cancel class="secondary-button">キャンセル</button><button type="submit" class="secondary-button">保存</button></div></form>`;
      document.body.append(dialog);dialog.showModal();
      dialog.querySelector('[data-cancel]').onclick=closeDialog;
      dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog();});
      dialog.querySelector('form').onsubmit=event=>{
        event.preventDefault();
        try{
          const ids=set?[...dialog.querySelectorAll('[data-set-word]:checked')].map(i=>i.dataset.setWord):[...selected];
          if(!ids.length)throw new Error('保存する単語を選択してください。');
          window.SavedCardSets.save(unit,dialog.querySelector('[name="setName"]').value,{v:1,refs:ids.map(id=>'card:'+id),d:set?.payload.d||3},set?.id);
          closeDialog();refresh();status.textContent='セットを保存しました。';
        }catch(e){dialog.querySelector('[role="alert"]').textContent=e.message;}
      };
    }
    save.onclick=()=>{try{edit();}catch(e){status.textContent=e.message;}};
    list.onclick=event=>{
      const button=event.target.closest('button');if(!button)return;
      try{
        const id=button.dataset.nheLoadSet||button.dataset.nheEditSet||button.dataset.nheDeleteSet;
        const set=window.SavedCardSets.list(unit).find(s=>s.id===id);
        if(!set)throw new Error('セットが見つかりません。画面を開き直してください。');
        if(button.hasAttribute('data-nhe-load-set')){apply(window.CardSet.resolve(set.payload).items.map(c=>c.id));status.textContent='「'+set.name+'」を呼び出しました。';}
        else if(button.hasAttribute('data-nhe-edit-set'))edit(set);
        else if(confirm('「'+set.name+'」を削除しますか？')){window.SavedCardSets.remove(unit,id);refresh();status.textContent='セットを削除しました。';}
      }catch(e){status.textContent=e.message;}
    };
    refresh();
  }
  window.NheSavedSets={mount};
})();
