// Public regression helper: install Playwright, then run the three
// tests/alphabet-*.test.cjs scripts with Node. Uses an installed Chrome.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
async function setup(){
  const root=path.resolve(process.env.ALPHABET_TEST_ROOT||path.join(__dirname,'..'));
  process.env.ALPHABET_QA_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'dekiru-alphabet-qa-'));
  const server=http.createServer((req,res)=>{
    try{
      let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
      if(!file.startsWith(root+path.sep))throw Error('Outside site');
      if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
      const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.svg':'image/svg+xml','.png':'image/png'};
      res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
    }catch{res.writeHead(404);res.end('Not found');}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage();page.setDefaultTimeout(6000);
  return {browser,context,page,base:'http://127.0.0.1:'+server.address().port+'/',games:'games',grade:'grade34',close:async()=>{await browser.close();await new Promise(r=>server.close(r));}};
}
module.exports={setup};
