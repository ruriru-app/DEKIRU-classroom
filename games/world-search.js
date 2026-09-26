(() => {
 const normalize=s=>String(s||'').normalize('NFKC').trim().toLowerCase().replace(/[\u3041-\u3096]/g,c=>String.fromCharCode(c.charCodeAt(0)+0x60)).replace(/[\s.・]/g,'');
 window.WorldSearch={find(query){const q=normalize(query);if(!q)return [];
  return window.WorldCountries.map(c=>({c,names:[c.ja,c.en,c.id,...c.aliases].map(normalize)})).filter(x=>x.names.some(n=>n.includes(q))).sort((a,b)=>Number(b.names.includes(q))-Number(a.names.includes(q))||a.c.ja.localeCompare(b.c.ja,'ja')).map(x=>x.c);
 }};
})();
