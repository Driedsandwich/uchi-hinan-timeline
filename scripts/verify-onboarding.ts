import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import samplePlans from '../src/data/sample-plans.json';
import {costMessage} from '../src/components/Journey';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:5174';
const out=process.env.ONBOARDING_OUTPUT||'verification/onboarding';
await mkdir(out,{recursive:true});
const browser=await chromium.launch();
const checks:object[]=[],screenshots:string[]=[],errors:string[]=[];
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:844},locale:'ja-JP',permissions:['clipboard-read','clipboard-write']});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const apiPosts:string[]=[],external:string[]=[];
  page.on('request',r=>{if(r.url().includes('/api/')&&r.method()==='POST')apiPosts.push(r.url());if(/^https?:/.test(r.url())&&!r.url().startsWith(base))external.push(r.url());});
  // Even when the server advertises paid AI, examples must never invoke it.
  await page.route('**/api/timeline',route=>route.request().method()==='GET'?route.fulfill({json:{provider:'openai',version:1}}):route.abort());
  async function shot(name:string){
   await page.evaluate(()=>window.scrollTo(0,0));await page.evaluate(()=>document.fonts.ready);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   for(const fullPage of [false,true]){const file=`${name}-${width}${fullPage?'-full':''}.png`;await page.screenshot({path:`${out}/${file}`,fullPage});screenshots.push(file);}
  }
  for(let i=0;i<3;i++){
   await page.goto(base);
   await expect(page.locator('.step-count')).toContainText('1 / 3');
   await expect(page.locator('.hero')).toContainText(costMessage);
   await expect(page.locator('.hero')).toContainText('ログイン・支払い情報の入力はありません。');
   const primary=page.getByRole('button',{name:'見本で試す',exact:true});
   const box=await primary.boundingBox();expect(box!.y+box!.height).toBeLessThanOrEqual(844);
   if(i===0)await shot('01-home');
   await (i===0?primary:page.locator('.samples button').nth(i)).click();
   await expect(page.getByRole('heading',{name:'この場所・この家族で合っていますか？'})).toBeVisible();
   await expect(page.locator('.step-count')).toContainText('1 / 3');
   const next=page.getByRole('button',{name:'この家の危険と避難先を見る →',exact:true});
   await expect(next).toBeDisabled();
   if(i===0)await shot('02-step1-review');
   await page.getByLabel('調べる地点を確認しました',{exact:false}).check();await expect(next).toBeDisabled();
   await page.getByLabel('家族の読み取りを確認しました',{exact:false}).check();await next.click();
   await expect(page.locator('.step-count')).toContainText('2 / 3');
   await expect(page.locator('.risk-box')).toBeVisible();await expect(page.locator('.destination-box')).toContainText(samplePlans[i].shelters.candidates[0].name);
   if(i===0)await shot('03-step2-hazards');
   await page.getByRole('button',{name:'入力の確認に戻る',exact:true}).click();await expect(page.locator('.step-count')).toContainText('1 / 3');await next.click();
   await page.getByRole('button',{name:'家族の約束の1枚を受け取る →',exact:true}).click();
   await expect(page.locator('.step-count')).toContainText('3 / 3');
   await expect(page.getByRole('article',{name:'避難の1枚'})).toBeVisible();
   if(i===0)await shot('04-step3-sheet');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   if(width===1280)await page.pdf({path:`${out}/sample-${i+1}.pdf`,format:'A4',printBackground:true,preferCSSPageSize:true});
   await page.getByRole('button',{name:'最初に戻る',exact:true}).click();await expect(page.locator('.step-count')).toContainText('1 / 3');
   expect(apiPosts).toEqual([]);expect(external).toEqual([]);
   checks.push({scenario:'offline-example',width,sample:i+1,stages:[1,2,3],back:true,apiPosts:0,externalRequests:0,overflow:false});
  }
  // A saved/shared sheet opens without an API request; its own-input button must work.
  await page.getByRole('button',{name:'見本で試す',exact:true}).click();
  await page.getByLabel('調べる地点を確認しました',{exact:false}).check();await page.getByLabel('家族の読み取りを確認しました',{exact:false}).check();
  await page.getByRole('button',{name:'この家の危険と避難先を見る →',exact:true}).click();await page.getByRole('button',{name:'家族の約束の1枚を受け取る →',exact:true}).click();
  await page.getByRole('button',{name:/家族へ送る/}).click();await expect(page.getByRole('dialog')).toContainText('3 / 3');
  await page.getByRole('button',{name:'共有リンクを作る',exact:true}).click();const link=await page.getByLabel('共有リンク（住所・家族の情報が含まれます）').inputValue();
  const requests:string[]=[];const shared=await context.newPage();shared.on('request',r=>{if(r.url().includes('/api/'))requests.push(r.url());});
  await shared.goto(link);await expect(shared.locator('.step-count')).toContainText('3 / 3');expect(requests).toEqual([]);
  await shared.route('**/api/timeline',r=>r.fulfill({json:{provider:'openai',version:1}}));
  await shared.getByRole('button',{name:'自分の入力で試す',exact:true}).click();await expect(shared.getByLabel('避難を考える家の住所',{exact:true})).toBeFocused();
  await expect(shared.getByLabel('避難を考える家の住所',{exact:true})).toHaveValue('');await expect(shared.getByRole('button',{name:'AI で読む（数秒かかります）',exact:true})).toBeEnabled();
  checks.push({scenario:'share-and-own-input',width,sharedAPIRequestsBeforeReset:0,blankInputFocused:true});await shared.close();
  // Check the AI-labelled path using local responses only: no paid AI or external input.
  await page.goto(base);
  await page.route('**/api/timeline',async route=>{
   if(route.request().method()==='GET')return route.fulfill({json:{provider:'openai',version:1}});
   const data=route.request().postDataJSON();
   const result=data.action==='geocode'?{points:[samplePlans[0].point]}:data.action==='extract'?{family:samplePlans[0].family,provider:'openai',token:'local-ui-response'}:samplePlans[0];
   return route.fulfill({json:result});
  });
  await page.getByRole('link',{name:'自分の住所と家族の様子を入れる ↓'}).click();await expect(page.getByLabel('避難を考える家の住所',{exact:true})).toBeFocused();
  await page.getByLabel('避難を考える家の住所',{exact:true}).fill(samplePlans[0].point.label);await page.getByLabel('家族の様子',{exact:true}).fill('母 82歳 同居 杖をつく。');
  await expect(page.locator('form')).toContainText(costMessage);await page.getByRole('button',{name:'AI で読む（数秒かかります）',exact:true}).click();
  await expect(page.locator('.step-count')).toContainText('1 / 3');
  await page.getByLabel('調べる地点を確認しました',{exact:false}).check();await page.getByLabel('家族の読み取りを確認しました',{exact:false}).check();
  const aiPlan=page.getByRole('button',{name:'AI で文章を整え、危険と避難先を見る（数秒かかります）',exact:true});
  await expect(aiPlan.locator('..').locator('..')).toContainText(costMessage);await aiPlan.click();await expect(page.locator('.step-count')).toContainText('2 / 3');
  await page.getByRole('button',{name:'家族の約束の1枚を受け取る →',exact:true}).click();await expect(page.locator('.step-count')).toContainText('3 / 3');
  await page.getByRole('button',{name:'自分の入力で試す',exact:true}).click();await expect(page.getByLabel('家族の様子',{exact:true})).toHaveValue('');
  checks.push({scenario:'AI-labelled-path-local-responses',width,paidAICalls:0,costNoticeAtBothActions:true});
  // The primary example remains available when the API cannot be reached.
  await page.route('**/api/timeline',r=>r.abort());await page.goto(base);await page.getByRole('button',{name:'見本で試す',exact:true}).click();
  await expect(page.getByRole('heading',{name:'この場所・この家族で合っていますか？'})).toBeVisible();
  checks.push({scenario:'API-unavailable-example-still-opens',width,passed:true});
  await context.close();
 }
 expect(errors).toEqual([]);
 await writeFile(`${out}/results.json`,JSON.stringify({checks,passed:checks.length,screenshots,browserErrors:errors},null,2)+'\n');
 console.log(JSON.stringify({passed:checks.length,screenshots:screenshots.length,browserErrors:errors}));
}finally{await browser.close();}
