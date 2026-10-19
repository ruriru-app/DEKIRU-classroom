const test=require('node:test');
const assert=require('node:assert/strict');
const Core=require('../practice-speech-core.js');
const normalize=require('../memorize-core.js').normalizeTokens;
const assess=(text,said)=>Core.assess(text,said,normalize);
test('missing and substituted words do not mark later words as missed',()=>{
 assert.deepEqual(assess('I like red apples.','I like apples').flags,[true,true,false,true]);
 assert.deepEqual(assess('I like red apples.','I like green apples').flags,[true,true,false,true]);
});
test('contractions, punctuation, and case keep equivalent words together',()=>{
 assert.equal(assess("I'm happy!",'I am happy').complete,true);
 assert.deepEqual(assess("I'm happy!",'I happy').flags,[false,true]);
});
test('word drills require the whole target and reject additional words',()=>{
 assert.equal(assess('blocks','block').complete,false);
 assert.equal(assess('blocks','blocks').complete,true);
 assert.equal(assess('blocks','two blocks').complete,false);
});
test('empty speech, reordered words, extra words and repeated words are distinguished',()=>{
 assert.deepEqual(assess('I like apples.','').flags,[false,false,false]);
 assert.equal(assess('I like apples.','apples like I').complete,false);
 assert.equal(assess('I like apples.','I really like apples').extra,true);
 assert.deepEqual(assess('Go go straight.','go straight').flags.filter(Boolean),[true,true]);
});

