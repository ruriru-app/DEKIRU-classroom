const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{execFileSync}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
async function setup(){
 const root=path.resolve(__dirname,'..');
 const server=http.createServer((req,res)=>{
  const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+rel);
  if(!file.startsWith(root+path.sep)){res.writeHead(404);return res.end();}
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf'};
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){
   // Sparse checkouts can omit committed pictures. Read their actual Git bytes.
   if(/^\/(?:grade34\/)?assets\//.test(rel))try{
    const bytes=execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,'show','HEAD:'+rel.slice(1)],{maxBuffer:8*1024*1024,stdio:['ignore','pipe','ignore']});
    res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');return res.end(bytes);
   }catch{}
   res.writeHead(404);return res.end();
  }
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage();page.setDefaultTimeout(20000);
 return {page,base:'http://127.0.0.1:'+server.address().port+'/',grade:'grade34',senior:'grade56',close:async()=>{await browser.close();await new Promise(r=>server.close(r));}};
}
module.exports={setup};
