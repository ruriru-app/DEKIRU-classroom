// Integration check: real Unit rendering + shared CSS + physical browser clicks.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const app={innerHTML:'',insertAdjacentHTML(_,html){this.innerHTML+=html;},addEventListener(){},querySelectorAll:()=>[],querySelector:()=>({textContent:''})};
const context=vm.createContext({window:{DEKIRU_DATA:{cards:[],categoryLabels:{}},NheMigration:{isComplete:()=>true},NheSavedSets:{mount(){}},NhePractice:{mount:()=>({refresh(){}})},addEventListener(){},scrollTo(){}},document:{getElementById:()=>app},location:{hash:'#/unit/nh5/6'},localStorage:{getItem:()=>null},sessionStorage:{getItem:()=>null},navigator:{}});
for(const name of ['unit-config.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,'grade56',name),'utf8'),context);
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/grade56/fixture'){
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.end('<!doctype html><html lang="ja"><head><meta charset="utf-8"><link rel="stylesheet" href="/grade34/styles.css"><link rel="stylesheet" href="/grade56/styles.css"></head><body><main class="app-main">'+app.innerHTML+'</main></body></html>');return;
 }
 if(url.pathname==='/games/ruriru-restaurant.html'){res.end('GAME');return;}
 const target=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(target,(error,data)=>{
  if(error){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',target.endsWith('.pdf')?'application/pdf':target.endsWith('.css')?'text/css':'application/octet-stream');
  res.end(data);
 });
});
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
  await page.goto(base+'/grade56/fixture');
  await page.getByText('Activities',{exact:true}).click();
  const summary=page.locator('.restaurant-test-cards summary');
  await summary.scrollIntoViewIfNeeded();
  const box=await summary.boundingBox();
  await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  await page.waitForTimeout(100);
  assert.equal(new URL(page.url()).pathname,'/grade56/fixture','download toggle must not launch the game');
  assert.equal(await page.locator('.restaurant-test-cards').evaluate(el=>el.open),true);
  for(const count of [9,12]){
   // The fixture has the same relative URL base as the Unit page.
   const link=page.locator('.restaurant-test-cards a').filter({hasText:count===9?'９枚':'12枚'});
   const [download]=await Promise.all([page.waitForEvent('download'),link.click()]);
   const data=fs.readFileSync(await download.path());
   assert.deepEqual(data,fs.readFileSync(path.join(root,'grade56/downloads/restaurant-test-cards-'+count+'up.pdf')));
   assert.equal(new URL(page.url()).pathname,'/grade56/fixture');
  }
  await page.locator('a[href="../games/ruriru-restaurant.html"]').click();
  assert.equal(new URL(page.url()).pathname,'/games/ruriru-restaurant.html');
  console.log('PASS: toggle opens in place, both PDF downloads match, game link still works.');
 }finally{if(browser)await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
