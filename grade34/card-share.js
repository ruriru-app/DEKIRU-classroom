(() => {
  'use strict';
  let dialog;
  function openSave(items,display,onSave){
    const payload=CardSet.snapshot(items,display);
    dialog?.remove();
    const modal=document.createElement('dialog');dialog=modal;modal.className='card-share-dialog';
    modal.innerHTML='<form method="dialog"><button class="secondary-button">閉じる ×</button></form><h2>カードセットを保存</h2><p class="share-count"></p><form class="share-save"><label>セット名<input type="text" maxlength="60" required placeholder="例：色と食べ物" aria-label="セット名"></label><button type="submit" class="primary-button">保存する</button><small>この端末・ブラウザに保存します。配信は保存後、左メニューのタイルから行えます。</small><p role="status"></p></form>';
    modal.querySelector('.share-count').textContent=payload.refs.length+'語と表示設定を保存します';
    modal.querySelector('.share-save').onsubmit=event=>{
      event.preventDefault();
      try{onSave(modal.querySelector('input').value,payload);modal.close();modal.remove();}
      catch(error){modal.querySelector('[role="status"]').textContent=error.message;}
    };
    document.body.append(modal);modal.showModal();modal.querySelector('input').focus();
  }
  async function open(items, display, options={}) {
    // Capture before the first await so later teacher edits never alter an issued set.
    const payload = CardSet.snapshot(items, display);
    const token = await CardSet.encode(payload);
    const url = new URL('student.html', location.href);
    url.hash = 'cards=' + token;
    openUrl(url.href,options.name,payload.refs.length+'語のカードセット（発行時の選択内容）');
  }
  function openUrl(href,name,count='DEKIRU Gamesで開くゲームです'){
    const url=new URL(href,location.href);
    dialog?.remove();
    dialog = document.createElement('dialog'); dialog.className = 'card-share-dialog';
    dialog.innerHTML = '<form method="dialog"><button class="secondary-button" aria-label="閉じる">閉じる ×</button></form><h2>児童に配信</h2><p class="share-count"></p><div class="share-qr"></div><p class="share-warning"></p><label>配信用URL<textarea readonly rows="3"></textarea></label><div class="share-actions"><button class="primary-button">URLをコピーする</button><a class="secondary-button" target="_blank" rel="noopener">回答画面を試す</a></div><p role="status" class="share-status"></p>';
    document.body.append(dialog);
    if(name)dialog.querySelector('h2').textContent=name+' — 児童に配信';
    dialog.querySelector('.share-count').textContent = count;
    dialog.querySelector('textarea').value = url.href;
    dialog.querySelector('a').href = url.href;
    const warning = dialog.querySelector('.share-warning');
    if (url.protocol === 'file:') {
      warning.textContent = '現在はPC内の確認用です。このURL・QRは児童端末では開けません。公開された試用ページから配信してください。';
    } else {
      try { const qr = qrcode(0, 'L'); qr.addData(url.href); qr.make(); dialog.querySelector('.share-qr').innerHTML = qr.createSvgTag(6, 4); }
      catch { warning.textContent = 'カード数が多いためQRを作成できません。URLをコピーして配布してください。'; }
    }
    dialog.querySelector('.primary-button').onclick = async () => {
      try { await navigator.clipboard.writeText(url.href); dialog.querySelector('.share-status').textContent = 'URLをコピーしました'; }
      catch { const field = dialog.querySelector('textarea'); field.focus(); field.select(); dialog.querySelector('.share-status').textContent = 'URLを選択しました。コピーしてください。'; }
    };
    dialog.showModal();
    return dialog;
  }
  window.CardShare = {open,openSave,openUrl};
})();
