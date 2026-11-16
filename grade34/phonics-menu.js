(() => {
 'use strict';
 const from=new URLSearchParams(location.search).get('from');
 const returns={
   lt1:'index.html#/book/lt1',
   lt2:'index.html#/book/lt2',
   nh5:'../grade56/index.html#/book/nh5',
   nh6:'../grade56/index.html#/book/nh6'
 };
 document.getElementById('back').href=returns[from]||returns.lt1;
 document.getElementById('short-vowels-link').href='short-vowels/'+(from?'?from='+encodeURIComponent(from):'');
 document.getElementById('letter-sounds-link').href='letter-sounds.html'+(from?'?from='+encodeURIComponent(from):'');
})();
