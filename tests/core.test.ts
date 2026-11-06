import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {PNG} from 'pngjs';
import {classifyPixel,depthColors,sedimentColors,tilePixel} from '../src/core/hazards';
import {decide,estimate,makeRows,selectShelters,distanceM} from '../src/core/rules';
import {defaultConditions,type Hazard,type Family,type Shelter} from '../src/core/schema';
import {readTile,parseShelters,hazardsAt,geocode} from '../server/public-data';
import {mockExtract} from '../src/core/mock';
import {templateWording,verifyWording,wordingOptions} from '../src/core/wording';
import record from './fixtures/public-record.json';
const point={lat:35.7,lon:139.8,label:'試験点'};
const hazard=(id:Hazard['id'],status:Hazard['status']='colored'):Hazard=>({id,status,label:'試験',name:id,source:'https://disaportaldata.gsi.go.jp/test',checkedAt:new Date().toISOString()});
describe('公式凡例と固定タイル',()=>{
 it.each(depthColors)('浸水凡例 $label',c=>{expect(classifyPixel('flood',[...c.rgb,255])).toMatchObject({status:'colored',label:c.label});const png=PNG.sync.read(readFileSync('docs/shinsui_legend3.png'));let found=false;for(let i=0;i<png.data.length;i+=4)if(c.rgb.every((v,j)=>v===png.data[i+j])&&png.data[i+3]===255)found=true;expect(found).toBe(true);});
 for(const [id,colors] of Object.entries(sedimentColors))it.each(colors!)(`${id} $label`,c=>expect(classifyPixel(id as Hazard['id'],[...c.rgb,255])).toMatchObject({status:'colored',label:c.label}));
 it('透明は着色なし、半透明や未知の色は不明',()=>{expect(classifyPixel('flood',[0,0,0,0]).status).toBe('uncolored');expect(classifyPixel('flood',[255,183,183,254]).status).toBe('unknown');expect(classifyPixel('debris',[0,0,132,255]).status).toBe('unknown');});
 for(const sample of record.records)for(const file of sample.files)it(`${sample.id}/${file.hazard} 固定の実タイル`,()=>{const h=sample.hazards.find(h=>h.id===file.hazard)!;const rgba=readTile(readFileSync('tests/fixtures/'+file.file),h.pixel.px,h.pixel.py);expect(rgba).toEqual(h.rgba);expect(classifyPixel(h.id as Hazard['id'],rgba).label).toBe(h.label);});
 it('Web Mercatorの原点と固定点',()=>{expect(tilePixel(0,0)).toEqual({z:17,x:65536,y:65536,px:0,py:0});const h=record.records[0].hazards[0];expect(tilePixel(record.records[0].point.lon,record.records[0].point.lat)).toEqual(h.pixel);});
 it('異常な画像は拒否',()=>expect(()=>readTile(Buffer.alloc(100),0,0)).toThrow());
});
describe('判定の決まり',()=>{
 for(let mask=0;mask<16;mask++)it(`屋内条件4項目の組合せ ${mask}`,()=>{const c={...defaultConditions,upperRoom:'3階居室'};(['collapseOutside','roomAbove','supplies','otherHazardsChecked'] as const).forEach((k,i)=>c[k]=(mask>>i)&1?'yes':'unknown');expect(decide([hazard('flood')],c).kind).toBe(mask===15?'indoor':'leave');});
 it('土砂があれば条件がyesでも立退き',()=>expect(decide([hazard('debris')],{...defaultConditions,collapseOutside:'yes',roomAbove:'yes',supplies:'yes',otherHazardsChecked:'yes',upperRoom:'3階'}).kind).toBe('leave'));
 it('洪水が不明/無着色なら避難不要と言わない',()=>{expect(decide([hazard('flood','uncolored')],defaultConditions).kind).toBe('check');expect(decide([hazard('flood','unavailable')],defaultConditions).kind).toBe('check');});
 it('高潮も屋内条件がなければ立退き',()=>expect(decide([hazard('surge')],defaultConditions).kind).toBe('leave'));
 it('津波を雨の警戒レベルに混ぜない',()=>expect(decide([hazard('tsunami')],defaultConditions).kind).toBe('check'));
});
describe('避難先と時間',()=>{
 const s=(name:string,lat:number,disasters:number[]):Shelter=>({name,lat,lon:139.8,disasters,address:'',remarks:'2階以上',distanceM:0,source:'https://cyberjapandata.gsi.go.jp/test'});
 it('すべての必要な災害に対応する候補を距離順・重複なし',()=>{const all=[s('近いが洪水だけ',35.7001,[1]),s('対応A',35.701,[1,2]),s('対応B',35.702,[1,2]),s('対応A',35.701,[1,2]),s('遠すぎる',36,[1,2])];expect(selectShelters(all,point,[1,2]).map(s=>s.name)).toEqual(['対応A','対応B']);});
 it('緯度1度は約111km',()=>expect(distanceM({lat:0,lon:0},{lat:1,lon:0})).toBeCloseTo(111195,0));
 it('公的GeoJSONのdisasterフラグと利用条件を読む',()=>{const sample=record.records[0];const all=parseShelters(JSON.parse(readFileSync('tests/fixtures/'+sample.shelterFile,'utf8')),sample.shelterSource);expect(all.length).toBeGreaterThan(10);expect(all.every(s=>s.disasters.includes(1))).toBe(true);expect(all.some(s=>s.remarks.length>0)).toBe(true);});
 it('準備20分、道のり1.5倍、杖0.5m/秒なら1000mは70分',()=>expect(estimate(mockExtract('母 82歳 同居 杖をつく。'),1000,20)[0].minutes).toBe(70));
 it('成人自力歩行1m/秒で45分',()=>expect(estimate(mockExtract('私 30歳 同居 自力歩行。'),1000,20)[0].minutes).toBe(45));
 it('車いす・不明・避難先なしを勝手に計算しない',()=>{expect(estimate(mockExtract('母 82歳 同居 車いす。'),1000,20)[0].minutes).toBeNull();expect(estimate(mockExtract('母 82歳 同居 自力歩行。'),null,20)[0].minutes).toBeNull();});
 it('別居の迎えを計算に含めない',()=>expect(estimate(mockExtract('息子 30歳 別居 自力歩行。'),1000,20)).toEqual([]));
});
describe('文章の事実照合',()=>{
 const f:Family=mockExtract('母 82歳 同居 杖をつく。');const rows=makeRows(f,defaultConditions,decide([hazard('flood')],defaultConditions),undefined);
 const output=()=>{const blocks=wordingOptions(rows).map(o=>({id:o.id,text:o.texts[0]}));return {line:blocks.map(b=>({...b})),print:blocks.map(b=>({...b}))};};
 it('許可された言い回しが通る',()=>expect(templateWording(rows).lineText).toContain('自治体の指示が優先'));
 it('数を変えたら拒否',()=>{const v=output();v.line[1].text=v.line[1].text.replace('レベル3','レベル4');expect(verifyWording(v,rows)).toBeNull();});
 it('場所を変えたら拒否',()=>{const v=output();v.print[1].text=v.print[1].text.replace('自治体に避難先を確認','山田小学校');expect(verifyWording(v,rows)).toBeNull();});
 it('根拠のない時刻と安全の断言を拒否',()=>{const v=output();v.line[0].text+='18:00には安全です。';expect(verifyWording(v,rows)).toBeNull();});
 it('行の省略と順の変更を拒否',()=>{const v=output();v.line.reverse();expect(verifyWording(v,rows)).toBeNull();});
 it('レベル5で遠くの指定避難場所へ出発させない',()=>{expect(rows[3].where).not.toContain('小学校');expect(rows[3].action).toContain('外への移動が危険');});
});
describe('公的APIの失敗',()=>{
 it('404（地理院が区域の無い所の切れ端を置かない）は着色なしに寄せ、避難不要とは言わない',async()=>{const fetcher=(async()=>new Response('',{status:404})) as typeof fetch;const results=await hazardsAt(point,fetcher);expect(results).toHaveLength(6);expect(results.every(h=>h.status==='uncolored')).toBe(true);expect(decide(results,defaultConditions).kind).toBe('check');});
 it('404 以外の失敗は取得できずのまま',async()=>{const fetcher=(async()=>new Response('',{status:503})) as typeof fetch;const results=await hazardsAt(point,fetcher);expect(results.every(h=>h.status==='unavailable'&&h.error==='HTTP 503')).toBe(true);});
 it('住所なしは候補なし、異常形式は拒否',async()=>{expect(await geocode('住所',async()=>new Response('[]'))).toEqual([]);await expect(geocode('住所',async()=>new Response('{}'))).rejects.toThrow();});
});

describe('追加の公的タイル実物',()=>{
 const extra=JSON.parse(readFileSync('tests/fixtures/extra-record.json','utf8')) as {id:Hazard['id'];file:string;pixel:{px:number;py:number};rgba:number[]}[];
 for(const item of extra)it(`${item.id}の着色したz17画素を検査`,()=>{const rgba=readTile(readFileSync('tests/fixtures/'+item.file),item.pixel.px,item.pixel.py);expect(rgba).toEqual(item.rgba);expect(classifyPixel(item.id,rgba).status).toBe('colored');});
});

describe('凡例画像の各段の色と区分を独立照合',()=>{
 const expected:[number,number,string][]=[[10,10,'20m以上'],[10,29,'10〜20m未満'],[10,48,'5〜10m未満'],[10,67,'3〜5m未満'],[10,86,'0.5〜3m未満'],[30,105,'0.5〜1m未満'],[10,124,'0.5m未満'],[30,143,'0.3m未満']];
 it.each(expected)('公式画像 (%i,%i) は %s',(x,y,label)=>{const png=PNG.sync.read(readFileSync('docs/shinsui_legend3.png'));const i=(y*png.width+x)*4;expect(classifyPixel('flood',Array.from(png.data.subarray(i,i+4))).label).toBe(label);});
 const legends=[['debris','keikai_dosekiryu.png'],['steep','keikai_kyukeisya.png'],['landslide','keikai_jisuberi.png']] as const;
 for(const [id,file] of legends)it(`${id} 凡例の4区画`,()=>{const png=PNG.sync.read(readFileSync('docs/'+file));for(const [x,y,label] of [[100,60,'特別警戒区域'],[100,130,'警戒区域'],[170,60,'特別警戒区域（指定予定）'],[170,130,'警戒区域（指定予定）']] as const){const i=(y*png.width+x)*4;expect(classifyPixel(id,Array.from(png.data.subarray(i,i+4))).label).toBe(label);}});
});
