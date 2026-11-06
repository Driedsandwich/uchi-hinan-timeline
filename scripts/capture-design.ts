import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {samples} from '../src/core/samples';
const out=process.env.DESIGN_OUTPUT||'verification/design';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:5174';
await mkdir(out,{recursive:true});
const browser=await chromium.launch();
const checks:{screen:string;width:number;overflow:boolean}[]=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844},locale:'ja-JP'});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 async function capture(screen:string,selector?:string){
  for(const width of [390,1280]){
   await page.setViewportSize({width,height:844});
   if(selector)await page.locator(selector).scrollIntoViewIfNeeded();else await page.evaluate(()=>window.scrollTo(0,0));
   await page.evaluate(()=>document.fonts.ready);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
   expect(overflow).toBe(false);checks.push({screen,width,overflow});
   await page.screenshot({path:`${out}/${screen}-${width}.png`});
   if(!selector)await page.screenshot({path:`${out}/${screen}-${width}-full.png`,fullPage:true});
  }
 }
 await page.goto(base);
 await capture('home');
 await page.getByLabel('避難を考える家の住所',{exact:true}).fill(samples[0].address);
 await page.getByLabel('家族の様子',{exact:true}).fill(samples[0].family);
 await capture('input','.input-card');
 await page.getByRole('button',{name:'入力を読む（AI は使いません）',exact:true}).click();
 await expect(page.getByRole('heading',{name:'この場所・この家族で合っていますか？'})).toBeVisible({timeout:30000});
 await capture('review');
 if(await page.locator('.question-list').count())await capture('questions','.question-list');
 await page.getByLabel('調べる地点を確認しました',{exact:false}).check();
 await page.getByLabel('家族の読み取りを確認しました',{exact:false}).check();
 const response=page.waitForResponse(r=>r.url().endsWith('/api/timeline')&&r.request().postData()?.includes('"action":"plan"')===true,{timeout:55000});
 await page.getByRole('button',{name:'公的な地図で危険と避難先を見る'}).click();
 const plan=await (await response).json();
 await writeFile(`${out}/plan-data.json`,JSON.stringify(plan,null,2));
 await capture('hazards');
 await page.getByRole('button',{name:'家族の約束の1枚を受け取る →',exact:true}).click();await expect(page.getByRole('article',{name:'避難の1枚'})).toBeVisible();
 await capture('result');
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:844});
  await page.locator('.sheet').screenshot({path:`${out}/sheet-${width}.png`});
 }
 await page.pdf({path:`${out}/a4.pdf`,format:'A4',printBackground:true,preferCSSPageSize:true});
 await page.getByRole('button',{name:/家族へ送る/}).click();
 await capture('share');
 expect(errors).toEqual([]);
 await writeFile(`${out}/capture-results.json`,JSON.stringify({checks,browserErrors:errors},null,2));
 console.log(JSON.stringify({screens:checks.length,checks,browserErrors:errors}));
}finally{await browser.close();}
