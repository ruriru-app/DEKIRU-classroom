/* Trusted adapters for existing picture cards and offline country search. */
window.SpeechCatalog=(()=>{
 'use strict';
 const inserts={USA:'the U.S.',GBR:'the U.K.',CHN:'China',NLD:'the Netherlands',PHL:'the Philippines',ARE:'the United Arab Emirates',CZE:'the Czech Republic',COD:'the Democratic Republic of the Congo',COG:'the Republic of the Congo',BHS:'the Bahamas',GMB:'the Gambia',DOM:'the Dominican Republic',CAF:'the Central African Republic',SLB:'the Solomon Islands',MHL:'the Marshall Islands',FSM:'the Federated States of Micronesia',MDV:'the Maldives',SYC:'the Seychelles'};
 function create({data,source,countries,search,sourceBase,assetBase}){
  const cards=new Map(data.cards.map(c=>[c.id,c]));
  function imageUrl(ref){
   if(!ref)return '';
   const url=new URL(ref,sourceBase),base=new URL(sourceBase);
   return url.origin===base.origin&&['http:','https:','file:'].includes(url.protocol)?url.href:'';
  }
  function card(id,overrides={}){
   const item=cards.get(id);if(!item)return null;
   const src=source(item);if(!src)return null;
   return {id,label:item.english,insertText:item.english,category:item.category,cardRef:id,imageUrl:imageUrl(src),...overrides};
  }
  function country(id){const c=countries.find(c=>c.id===id);return c?{id:c.id,label:c.ja+' / '+(inserts[c.id]||c.en),insertText:inserts[c.id]||c.en,category:'国名'}:null;}
  const allCountries=()=>countries.map(c=>country(c.id));
  const artwork=name=>new URL(name+'.png',assetBase).href;
  return {card,country,findCountries:query=>search(query).map(c=>country(c.id)),imageUrl,allCountries,artwork};
 }
 return {create};
})();
