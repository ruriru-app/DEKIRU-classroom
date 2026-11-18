(() => {
 'use strict';
 const from=new URLSearchParams(location.search).get('from');
 const returns={
   lt1:'index.html#/book/lt1',
   lt2:'index.html#/book/lt2',
   nh5:'../grade56/index.html#/book/nh5',
   nh6:'../grade56/index.html#/book/nh6'
 };
 const context=from?'?from='+encodeURIComponent(from):'';
 document.getElementById('back').href=returns[from]||returns.lt1;
 document.getElementById('short-vowels-link').href='short-vowels/'+context;
 document.getElementById('silent-e-link').href='silent-e/'+context;
 document.getElementById('consonant-digraphs-link').href='consonant-digraphs/'+context;
 document.getElementById('vowel-teams-1-link')?.setAttribute('href','vowel-teams-1/'+context);
 document.getElementById('vowel-teams-2-link')?.setAttribute('href','vowel-teams-2/'+context);
 document.getElementById('letter-sounds-link').href='letter-sounds.html'+context;
})();
