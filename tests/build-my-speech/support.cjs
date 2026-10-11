const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
function unitPreset(){
 const w={console,URL,setTimeout,clearTimeout};w.window=w;vm.createContext(w);
 for(const file of ['grade34/data/app-data.js','grade34/data/picture-links.js','grade34/card-set.js','grade34/sentence-forms.js','games/world-countries.js','games/world-search.js','grade56/speech-model.js','grade56/speech-catalog.js','grade56/speech-presets.js']){
  const full=path.join(root,file);assert.ok(fs.existsSync(full),'Required speech module is missing: '+file);
  vm.runInContext(fs.readFileSync(full,'utf8'),w,{filename:file});
 }
 const {pathToFileURL}=require('node:url');
 const catalog=w.SpeechCatalog.create({data:w.DEKIRU_DATA,source:w.CardSet.source,countries:w.WorldCountries,search:w.WorldSearch.find,sourceBase:pathToFileURL(path.join(root,'grade34')+'/').href,assetBase:pathToFileURL(path.join(root,'grade56/assets/build-my-speech')+'/').href});
 return {w,catalog,preset:w.SpeechPresets.get('nh6',5,catalog)};
}
module.exports={unitPreset};
