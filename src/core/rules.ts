import type {Conditions,Decision,Estimate,Family,Hazard,Point,Row,Shelter} from './schema';
export const GUIDELINE='https://www.bousai.go.jp/oukyu/hinanjouhou/r3_hinanjouhou_guideline/pdf/hinan_guideline_r8_3.pdf';
export const SPEED_SOURCE='https://www.bousai.go.jp/jishin/nankai/pdf/honbun_guideline2.pdf';
export const SHELTER_SOURCE='https://www.gsi.go.jp/bousaichiri/hinanbasho-help.html';
export const RULE_TABLE=[
 {id:'sediment',condition:'土砂の着色あり',result:'立ち退き避難を計画。屋内安全確保を選ばない',source:GUIDELINE},
 {id:'water',condition:'洪水・高潮の着色あり',result:'3条件と他の災害の確認がそろう時だけ屋内安全確保を候補にする',source:GUIDELINE},
 {id:'unknown',condition:'着色なし・取得不能・未知の色',result:'避難不要とは判定せず自治体のハザードマップを確認',source:'https://disaportal.gsi.go.jp/hazardmap/copyright/opendata.html'},
 {id:'level3',condition:'警戒レベル3 高齢者等避難',result:'危険な場所の時間を要する人と支援者が避難',source:GUIDELINE},
 {id:'level4',condition:'警戒レベル4 避難指示',result:'危険な場所から全員避難を完了',source:GUIDELINE},
 {id:'level5',condition:'警戒レベル5 緊急安全確保',result:'直ちに命を守る。ここまで待たない',source:GUIDELINE}
];
export function decide(h:Hazard[],c:Conditions):Decision{
 const hit=h.filter(x=>x.status==='colored');
 if(hit.some(x=>['debris','steep','landslide'].includes(x.id)))return {kind:'leave',title:'早めの立ち退き避難を計画',reasons:['土砂災害の区域に着色があります。上の階に留まる計画にはできません。']};
 if(hit.some(x=>['flood','surge'].includes(x.id))){
  if([c.collapseOutside,c.roomAbove,c.supplies,c.otherHazardsChecked].every(v=>v==='yes')&&c.upperRoom.trim())return {kind:'indoor',title:'屋内安全確保を候補にできます',reasons:['自治体の資料で確認した条件に基づく候補です。建物の安全をアプリが保証するものではありません。','津波の避難にはこの判断を使いません。']};
  return {kind:'leave',title:'早めの立ち退き避難を計画',reasons:['洪水・高潮の着色があります。屋内に留まる条件がそろっていません。']};
 }
 return {kind:'check',title:'自治体の地図で確認して計画',reasons:['調べた画素だけでは避難の要否を確定できません。無着色や未取得を安全とは扱いません。']};
}
export function distanceM(a:Pick<Point,'lat'|'lon'>,b:Pick<Point,'lat'|'lon'>){const r=Math.PI/180;const dlat=(b.lat-a.lat)*r,dlon=(b.lon-a.lon)*r;const t=Math.sin(dlat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dlon/2)**2;return 6371000*2*Math.atan2(Math.sqrt(t),Math.sqrt(Math.max(0,1-t)));}
export function selectShelters(all:Shelter[],point:Point,required:number[],max=10000){
 const seen=new Set<string>();return all.filter(s=>{const k=`${s.name}:${s.lat}:${s.lon}`;if(seen.has(k))return false;seen.add(k);return required.every(n=>s.disasters.includes(n));}).map(s=>({...s,distanceM:Math.round(distanceM(point,s))})).filter(s=>s.distanceM<=max).sort((a,b)=>a.distanceM-b.distanceM||a.name.localeCompare(b.name)).slice(0,3);
}
export function estimate(family:Family,distance:number|null,ready:number):Estimate[]{return family.people.filter(p=>p.residence!=='別居').map(p=>{
 const speed=p.mobility==='自力歩行'?(p.ageBand==='高齢'||p.ageBand==='子ども'?0.5:1):p.mobility==='杖・歩行器'?0.5:null;
 return {name:p.name,speed,minutes:distance===null||speed===null?null:Math.ceil(distance*1.5/speed/60)+ready,reason:speed===null?'歩行や支援の条件が不明なため計算しません':distance===null?'避難先が未確定のため計算しません':'公的資料の歩行速度を参考にした仮の見積もり。道のりは直線×1.5、準備時間を加算。'};
});}
export function makeRows(f:Family,c:Conditions,d:Decision,s:Shelter|undefined):Row[]{
 const residents=f.people.filter(p=>p.residence!=='別居'),names=residents.map(p=>p.name).join('・')||'家族';
 const slow=residents.filter(p=>p.ageBand!=='成人'||p.mobility!=='自力歩行'||(p.senses!==''&&p.senses!=='不明'&&p.senses!=='特になし'));
 const helper=c.supporter.trim()||'支援する人（要確認）';
 const carry=['薬・お薬手帳（必要な人）','携帯電話','水',...residents.flatMap(p=>p.needs)];
 const bag=[...new Set(carry)].join('・');
 const where=d.kind==='indoor'?(c.upperRoom||'浸水しない居室'):s?`${s.name}（開設・受入れ・経路を確認してから）。利用条件：${s.remarks||'自治体に確認'}`:'自治体に避難先を確認（未確定）';
 const prefix=d.kind==='check'?'自治体の地図・指示で危険な場所に当たる場合、':'';
 return [
  {id:'before',when:'夜になる前',who:`${names}・${helper}`,where:'自宅・電話で連絡',action:'悪天候が見込まれる日は、避難先の開設、道の安全、迎えと連絡方法を確認。暗くなる前の移動を相談する。',carry:bag},
  {id:'l3',when:'警戒レベル3 高齢者等避難',who:`${slow.map(p=>p.name).join('・')||'避難に時間がかかる人'}・${helper}`,where,action:prefix+(d.kind==='indoor'?'確認した浸水しない居室へ早めに移る。':'時間がかかる人と支援者は、危険な場所から避難する。別居家族の到着を待たない。'),carry:bag},
  {id:'l4',when:'警戒レベル4 避難指示',who:names,where,action:prefix+'危険な場所から全員の避難を完了する。連絡の役は安否を確認する。',carry:'持ち出しで避難を遅らせない'},
  {id:'l5',when:'警戒レベル5 緊急安全確保',who:names,where:'その場で少しでも命が助かる場所',action:'ここまで待たない。外への移動が危険なときは上階や崖から離れた部屋などで直ちに命を守る。安全を保証する行動ではありません。',carry:'持ち物より命を優先'}
 ];
}
