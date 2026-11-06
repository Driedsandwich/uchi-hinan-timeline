import {samples} from '../src/core/samples';
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:5174';
await mkdir('verification',{recursive:true});
const browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844},locale:'ja-JP',permissions:['clipboard-read','clipboard-write']});
const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const records=[];
try{
 await page.goto(base);await expect(page.getByRole('heading',{name:/うちは、いつ動く/})).toBeVisible();await page.screenshot({path:'verification/mobile-home.png',fullPage:true});
 for(let i=0;i<3;i++){
  if(i)await page.getByRole('button',{name:'最初に戻る'}).click();
  await page.getByLabel('避難を考える家の住所',{exact:true}).fill(samples[i].address);
  await page.getByLabel('家族の様子',{exact:true}).fill(samples[i].family);
  await page.getByRole('button',{name:'入力を読む（AI は使いません）',exact:true}).click();
  await expect(page.getByRole('heading',{name:'この場所・この家族で合っていますか？'})).toBeVisible({timeout:30000});
  await page.getByLabel('調べる地点を確認しました',{exact:false}).check();await page.getByLabel('家族の読み取りを確認しました',{exact:false}).check();
  const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/timeline')&&r.request().postData()?.includes('"action":"plan"')===true,{timeout:55000});
  await page.getByRole('button',{name:'公的な地図で危険と避難先を見る'}).click();const response=await responsePromise;expect(response.status()).toBe(200);const p=await response.json();
  await page.getByRole('button',{name:'家族の約束の1枚を受け取る →',exact:true}).click();await expect(page.getByRole('article',{name:'避難の1枚'})).toBeVisible({timeout:10000});
  expect(p.decision.kind).toBe(i===2?'check':'leave');expect(p.shelters.candidates.length).toBeGreaterThan(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:`verification/mobile-plan-${i+1}.png`,fullPage:true});
  await page.pdf({path:`verification/plan-${i+1}.pdf`,format:'A4',printBackground:true,preferCSSPageSize:true});
  records.push({sample:i+1,decision:p.decision.kind,shelter:p.shelters.candidates[0].name,distanceM:p.shelters.candidates[0].distanceM,aiCalls:p.aiCalls,overflow:false});
 }
 await page.getByRole('button',{name:/家族へ送る/}).click();
 await page.getByRole('button',{name:'共有リンクを作る'}).click();const share=page.getByLabel('共有リンク（住所・家族の情報が含まれます）');await expect(share).toBeVisible();const url=await share.inputValue();expect(url).toContain('#plan=');
 const sharedPage=await context.newPage();const apiRequests:string[]=[];sharedPage.on('request',r=>{if(r.url().includes('/api/'))apiRequests.push(r.url());});await sharedPage.goto(url);await expect(sharedPage.getByText('家族が共有した計画です',{exact:true})).toBeVisible();await expect(sharedPage.getByRole('article',{name:'避難の1枚'})).toBeVisible();expect(apiRequests).toEqual([]);
 await writeFile('verification/share-summary.json',JSON.stringify({length:url.length,apiRequests:apiRequests.length,restored:true},null,2));
 await page.getByRole('button',{name:'閉じる',exact:true}).click();
 await page.getByRole('button',{name:'最初に戻る'}).click();await page.getByLabel('避難を考える家の住所',{exact:true}).fill('東京都千代田区九段南一丁目2番1号');await page.getByLabel('家族の様子',{exact:true}).fill('祖父 91歳 同居 車いす 薬が必要。私 27歳 同居 自力歩行 連絡係。');
 await page.getByRole('button',{name:'入力を読む（AI は使いません）'}).click();await expect(page.getByRole('heading',{name:'この場所・この家族で合っていますか？'})).toBeVisible({timeout:30000});await page.getByLabel('調べる地点を確認しました',{exact:false}).check();await page.getByLabel('家族の読み取りを確認しました',{exact:false}).check();await page.getByRole('button',{name:'公的な地図で危険と避難先を見る'}).click();await page.getByRole('button',{name:'家族の約束の1枚を受け取る →',exact:true}).click();await expect(page.getByRole('article',{name:'避難の1枚'})).toBeVisible({timeout:55000});await expect(page.locator('.estimate')).toContainText('祖父：計算できません');
 // 失敗時の案内と入力保持を確認。
 await page.getByRole('button',{name:'最初に戻る'}).click();await page.route('**/api/timeline',route=>route.request().method()==='POST'?route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({error:'公的な住所検索から情報を取れませんでした。'})}):route.continue());await page.getByLabel('避難を考える家の住所',{exact:true}).fill('東京都文京区本郷七丁目3番1号');await page.getByLabel('家族の様子',{exact:true}).fill('母 80歳');await page.getByRole('button',{name:'入力を読む（AI は使いません）'}).click();await expect(page.getByRole('alert')).toContainText('情報を取れません');await expect(page.getByRole('textbox',{name:'家族の様子',exact:true})).toHaveValue('母 80歳');
 expect(errors).toEqual([]);
 await writeFile('docs/results/ui.json',JSON.stringify({at:new Date().toISOString(),base,viewport:'390x844',samples:records,freshInput:true,shareNoAPI:true,errorRecovery:true,browserErrors:errors},null,2)+'\n');console.log(JSON.stringify({samples:records,freshInput:true,shareNoAPI:true,errorRecovery:true,browserErrors:errors},null,2));
}finally{await browser.close();}
