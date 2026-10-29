const test=require('node:test'),assert=require('node:assert/strict');
test('ordering and price exchanges use interchangeable products and prices',()=>{
 const P=require('../restaurant-phrases.js');
 assert.deepEqual(P.exchange('hamburger','juice',940),{orderQuestion:'What would you like?',orderAnswer:"I'd like a hamburger and juice.",priceQuestion:'How much is it?',priceAnswer:"It's 940 yen."});
 assert.equal(P.exchange('omelet','tea',500).orderAnswer,"I'd like an omelet and tea.");
 assert.equal(P.exchange('rice','',1).orderAnswer,"I'd like rice.");
 assert.equal(P.exchange('cookie','milk',1200).priceAnswer,"It's 1200 yen.");
 assert.throws(()=>P.exchange('hamburger','juice',-1));
});
