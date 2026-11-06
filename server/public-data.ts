import { PNG } from 'pngjs';
import { z } from 'zod';
import { pointSchema, hazardIds, type Point, type Hazard, type Shelter, type ShelterResult } from '../src/core/schema';
import { classifyPixel,hazardUrl,layers,tilePixel } from '../src/core/hazards';
import { selectShelters } from '../src/core/rules';
export type Fetcher=typeof fetch;
export async function boundedFetch(url:string,fetcher:Fetcher=fetch,cap=4_000_000){
 const r=await fetcher(url,{signal:AbortSignal.timeout(9000),headers:{Accept:'application/json,image/png'}});
 if(!r.ok)throw new Error(`HTTP ${r.status}`);
 if(Number(r.headers.get('content-length'))>cap)throw new Error('応答が大きすぎます');
 const reader=r.body?.getReader();if(!reader)throw new Error('応答が空です');
 let size=0;const chunks:Uint8Array[]=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>cap)throw new Error('応答が大きすぎます');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
 return Buffer.concat(chunks);
}
export async function geocode(address:string,fetcher:Fetcher=fetch):Promise<Point[]>{
 const raw=JSON.parse((await boundedFetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(address)}`,fetcher)).toString());
 const schema=z.array(z.object({geometry:z.object({type:z.literal('Point'),coordinates:z.tuple([z.number(),z.number()])}),properties:z.object({title:z.string()})}));
 return schema.parse(raw).slice(0,8).map(f=>pointSchema.parse({label:f.properties.title,lon:f.geometry.coordinates[0],lat:f.geometry.coordinates[1]}));
}
export function readTile(buffer:Buffer,px:number,py:number){
 // PNGのIHDRを先に確認し、巨大なデコードを防ぐ。
 if(buffer.length<24||buffer.toString('hex',0,8)!=='89504e470d0a1a0a'||buffer.readUInt32BE(16)!==256||buffer.readUInt32BE(20)!==256)throw new Error('256px PNG ではありません');
 const png=PNG.sync.read(buffer,{checkCRC:true});const idx=(py*png.width+px)*4;return Array.from(png.data.subarray(idx,idx+4));
}
export async function hazardsAt(p:Point,fetcher:Fetcher=fetch):Promise<Hazard[]>{
 const pixel=tilePixel(p.lon,p.lat);return Promise.all(hazardIds.map(async id=>{
  const source=hazardUrl(id,pixel),base={id,name:layers[id].name,source,pixel,checkedAt:new Date().toISOString()};
  try{const data=await boundedFetch(source,fetcher,1_000_000);const rgba=readTile(data,pixel.px,pixel.py);return {...base,rgba,...classifyPixel(id,rgba)};}
  catch(e){
   // 地理院のハザードのタイルは、着色する区域が無い所の切れ端を置かない（404）。透明の切れ端と同じ「着色なし」に寄せる。それ以外の失敗は取得できずのまま。
   if(e instanceof Error&&e.message==='HTTP 404')return {...base,status:'uncolored' as const,label:'この地点の地図に着色なし（区域の指定が無いか未整備・安全の証明ではありません）'};
   return {...base,status:'unavailable' as const,label:'取得できませんでした（区域外とは判定しません）',error:e instanceof Error&&/^HTTP \d+$/.test(e.message)?e.message:'通信・画像の読み取りに失敗'};}
 }));
}
const featureSchema=z.object({geometry:z.object({type:z.literal('Point'),coordinates:z.tuple([z.number(),z.number()])}),properties:z.object({name:z.string(),address:z.string().nullish(),remarks:z.string().nullish()}).catchall(z.unknown())});
export function parseShelters(raw:unknown,source:string):Shelter[]{
 const collection=z.object({type:z.literal('FeatureCollection'),features:z.array(z.unknown()).max(20000)}).parse(raw);
 return collection.features.flatMap(f=>{const v=featureSchema.safeParse(f);if(!v.success)return [];const {geometry:g,properties:p}=v.data;
  if(!pointSchema.safeParse({lat:g.coordinates[1],lon:g.coordinates[0],label:p.name}).success)return [];
  return [{name:p.name.slice(0,160),address:(p.address||'').slice(0,200),remarks:(p.remarks||'').slice(0,500),lon:g.coordinates[0],lat:g.coordinates[1],disasters:[1,2,3,4,5,6,7,8].filter(n=>p[`disaster${n}`]===1),distanceM:0,source}];
 });
}
export async function sheltersAt(p:Point,required:number[],fetcher:Fetcher=fetch):Promise<ShelterResult>{
 const t=tilePixel(p.lon,p.lat,10),sources:string[]=[];const type=String(required[0]??1).padStart(2,'0');
 // 隣接8枚まで。境界の近くでも隣のタイルの候補を落とさない。
 for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)sources.push(`https://cyberjapandata.gsi.go.jp/xyz/skhb${type}/10/${t.x+dx}/${t.y+dy}.geojson`);
 const result=await Promise.allSettled(sources.map(async url=>parseShelters(JSON.parse((await boundedFetch(url,fetcher)).toString()),url)));
 return {candidates:selectShelters(result.flatMap(r=>r.status==='fulfilled'?r.value:[]),p,required),required,sources,failed:result.filter(r=>r.status==='rejected').length,total:sources.length,checkedAt:new Date().toISOString()};
}
