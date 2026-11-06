import {chromium,expect} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {encodePlan} from '../src/core/share';
import {decide,estimate,makeRows} from '../src/core/rules';
import {templateWording} from '../src/core/wording';
import type {Plan} from '../src/core/schema';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:5174';
const out=process.env.DESIGN_OUTPUT||'verification/design';
const seed=JSON.parse(await readFile(`${out}/plan-data.json`,'utf8')) as Plan;
// Only the presentation fixture varies. All decisions and rows use the existing engine.
const variants=['leave','indoor','check','no-shelter','long-family'] as const;
const browser=await chromium.launch();const checks=[];const errors:string[]=[];
await mkdir(out,{recursive:true});
try{
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
 for(const variant of variants){
  const p=structuredClone(seed);
  if(variant==='indoor')p.conditions={...p.conditions,collapseOutside:'yes',roomAbove:'yes',supplies:'yes',otherHazardsChecked:'yes',upperRoom:'3階の寝室',supporter:'同居の私'};
  if(variant==='check')p.hazards=p.hazards.map(h=>({...h,status:'unavailable',label:'取得できませんでした（区域外とは判定しません）'}));
  if(variant==='no-shelter')p.shelters.candidates=[];
  if(variant==='long-family'){
   p.family.people=Array.from({length:8},(_,i)=>({...p.family.people[0],name:`家族${i+1}・長い呼び名`,residence:'同居'}));
   p.shelters.candidates[0].name='長い正式名称の避難場所・地域防災センター兼小学校体育館';
  }
  p.decision=decide(p.hazards,p.conditions);
  p.rows=makeRows(p.family,p.conditions,p.decision,p.shelters.candidates[0]);
  p.estimates=estimate(p.family,p.decision.kind==='indoor'?null:p.shelters.candidates[0]?.distanceM??null,p.conditions.readyMinutes);
  Object.assign(p,templateWording(p.rows));
  const hash=await encodePlan(p);
  for(const width of [390,1280]){
   await page.setViewportSize({width,height:844});await page.goto('about:blank');await page.goto(base+'/'+hash);
   await expect(page.getByRole('article',{name:'避難の1枚'})).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   const colors=await page.evaluate(()=>({l3:getComputedStyle(document.querySelector('.l3 .level-label')!).backgroundColor,l4:getComputedStyle(document.querySelector('.shared-level.l4 h3')!).backgroundColor,l5:getComputedStyle(document.querySelector('.shared-level.l5 h3')!).backgroundColor,action:getComputedStyle(document.querySelector('.main-action')!).fontSize,name:getComputedStyle(document.querySelector('.person-name')!).fontSize}));
   expect(colors).toEqual({l3:'rgb(255, 40, 0)',l4:'rgb(170, 0, 170)',l5:'rgb(0, 0, 0)',action:'28px',name:'40px'});
   if(variant==='indoor')await expect(page.locator('.family-promise').first()).toContainText('居室へ早めに移る');
   if(variant==='check')await expect(page.locator('.family-promise').first()).toContainText('自治体の地図・指示で危険な場所に当たる場合');
   if(variant==='no-shelter')await expect(page.locator('.destination-box')).toContainText('自治体に確認（未確定）');
   if(variant==='long-family')expect(await page.locator('.family-promise').count()).toBe(8);
   checks.push({variant,width,overflow:false,colorsAndType:true});
  }
 }
 await page.getByRole('button',{name:/家族へ送る/}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.getByLabel('共有リンク（住所・家族の情報が含まれます）')).toHaveCount(0);
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();
 expect(errors).toEqual([]);
 await writeFile(`${out}/design-checks.json`,JSON.stringify({checks,shareReview:true,escapeCloses:true,browserErrors:errors},null,2));
 console.log(JSON.stringify({checks:checks.length,passed:checks.length,shareReview:true,escapeCloses:true,browserErrors:errors}));
}finally{await browser.close();}
