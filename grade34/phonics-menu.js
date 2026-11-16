(() => {
 'use strict';
 const from=new URLSearchParams(location.search).get('from');
 const returns={lt1:'index.html#/book/lt1',lt2:'index.html#/book/lt2',nh5:'../grade56/index.html#/book/nh5'};
 document.getElementById('back').href=returns[from]||returns.lt1;
 document.getElementById('letter-sounds-link').href='letter-sounds.html'+(from?'?from='+encodeURIComponent(from):'');
})();
