import type {Family,Point,Conditions,Plan} from '../src/core/schema';
import {decide,estimate,makeRows} from '../src/core/rules';
import {layers} from '../src/core/hazards';
import {templateWording} from '../src/core/wording';
import {hazardsAt,sheltersAt} from './public-data';
import {CallBudget,createProvider} from './providers';
export async function buildPlan(point:Point,family:Family,conditions:Conditions,used=0,env=process.env,fetcher:typeof fetch=fetch):Promise<Plan>{
 const provider=createProvider(env,fetcher),budget=new CallBudget(used);
 const hazards=await hazardsAt(point,fetcher);
 // 雨の計画では津波を混ぜない。津波の避難先は別枠で照合する。
 const required=[...new Set(hazards.filter(h=>h.status==='colored'&&h.id!=='tsunami').map(h=>layers[h.id].disaster))];
 const [shelters,tsunamiShelters]=await Promise.all([sheltersAt(point,required.length?required:[1],fetcher),hazards.some(h=>h.id==='tsunami'&&h.status==='colored')?sheltersAt(point,[5],fetcher):Promise.resolve(undefined)]);
 const decision=decide(hazards,conditions),rows=makeRows(family,conditions,decision,shelters.candidates[0]);
 const ai=await provider.word(rows,budget),wording=ai?'verified-ai':'template';
 const estimates=estimate(family,decision.kind==='indoor'?null:shelters.candidates[0]?.distanceM??null,conditions.readyMinutes);
 const warnings=[
  '現在の警戒レベル・天気・避難場所の開設状況は取得していません。自治体の指示が優先です。',
  '位置は住所の代表点のことがあります。数メートルずれるだけで区域が変わります。自治体の地図でも確認してください。',
  '距離は直線です。道の安全・橋・坂・階段・バリアフリー・施設の受入れ条件は未確認です。',
  '移動時間は訓練前の仮の見積もりです。直線距離×1.5÷歩く速さ＋準備時間。雨や夜間の遅れは計算できません。',
  '家屋倒壊等氾濫想定区域・浸水継続時間・内水は自動取得していません。屋内安全確保の条件は自治体の資料で確認が必要です。',
  ...(estimates.some(e=>(e.minutes??0)>60)?['徒歩の見積もりが長くなっています。広域避難や移送の方法を、悪天候になる前に自治体・支援者と相談してください。']:[]),
  ...(!required.length?['着色から災害を確定できないため、避難先は洪水に対応する場所を参考表示しています。']:[]),
  ...(hazards.some(h=>h.status==='unavailable'||h.status==='unknown')?['未取得・判定不能の層があります。避難が不要とは言えません。']:[]),
  ...(shelters.failed?['避難場所の一部の配信が取得できませんでした。表示は取得できた範囲の候補です。']:[]),
  ...(!shelters.candidates.length?['条件に合う避難先を取得範囲の10km以内で見つけられませんでした。自治体に確認してください。']:[]),
  ...(family.people.some(p=>p.residence==='別居')?['別居の人の到着時間は計算しません。迎えを待たず動ける近くの支援者を決めてください。']:[])
 ];
 return {version:1,createdAt:new Date().toISOString(),point,family,conditions,hazards,shelters,tsunamiShelters,decision,rows,estimates,...(ai||templateWording(rows)),wording,aiCalls:budget.used,provider:provider.name,warnings};
}
