import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {samples} from '../src/core/samples';
import {geocode,hazardsAt,boundedFetch} from '../server/public-data';
import {tilePixel} from '../src/core/hazards';
const out='tests/fixtures';await mkdir(out,{recursive:true});const records=[];
for(const sample of samples){
 const points=await geocode(sample.address),point=points[0];if(!point)throw new Error('地点が取得できません');const hazards=await hazardsAt(point);const files=[];
 for(const h of hazards){if(h.rgba){const data=await boundedFetch(h.source);const file=`${sample.id}-${h.id}.png`;await writeFile(`${out}/${file}`,data);files.push({hazard:h.id,file,sha256:createHash('sha256').update(data).digest('hex')});}}
 const t=tilePixel(point.lon,point.lat,10),url=`https://cyberjapandata.gsi.go.jp/xyz/skhb01/10/${t.x}/${t.y}.geojson`;
 const data=await boundedFetch(url);const shelterFile=`${sample.id}-shelters.geojson`;await writeFile(`${out}/${shelterFile}`,data);
 records.push({id:sample.id,address:sample.address,point,geocodeSource:`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(sample.address)}`,hazards,files,shelterFile,shelterSource:url,shelterSha256:createHash('sha256').update(data).digest('hex')});
 console.log(sample.id,point,hazards.map(h=>`${h.id}:${h.status}:${h.label}`).join(' / '));
}
await writeFile(`${out}/public-record.json`,JSON.stringify({recordedAt:new Date().toISOString(),records},null,2)+'\n');
