import type {HazardId,Hazard} from './schema';
export const DATA_PAGE='https://disaportal.gsi.go.jp/hazardmap/copyright/opendata.html';
export const LEGEND='https://disaportal.gsi.go.jp/hazardmap/copyright/img/shinsui_legend3.png';
export const layers:Record<HazardId,{name:string;path:string;disaster:number;legend:string}>={
 flood:{name:'洪水（想定最大規模）',path:'01_flood_l2_shinsuishin_data',disaster:1,legend:LEGEND},
 debris:{name:'土砂・土石流',path:'05_dosekiryukeikaikuiki',disaster:2,legend:'https://disaportal.gsi.go.jp/hazardmap/copyright/img/keikai_dosekiryu.png'},
 steep:{name:'土砂・急傾斜地の崩壊',path:'05_kyukeishakeikaikuiki',disaster:2,legend:'https://disaportal.gsi.go.jp/hazardmap/copyright/img/keikai_kyukeisya.png'},
 landslide:{name:'土砂・地すべり',path:'05_jisuberikeikaikuiki',disaster:2,legend:'https://disaportal.gsi.go.jp/hazardmap/copyright/img/keikai_jisuberi.png'},
 surge:{name:'高潮',path:'03_hightide_l2_shinsuishin_data',disaster:3,legend:LEGEND},
 tsunami:{name:'津波',path:'04_tsunami_newlegend_data',disaster:5,legend:LEGEND}
};
// 公式凡例PNGの塗りつぶし色を採取。境界色・半透明画素は近似しない。
export const depthColors=[
 {rgb:[255,255,179],label:'0.3m未満',upper:0.3},{rgb:[247,245,169],label:'0.5m未満',upper:0.5},
 {rgb:[248,225,166],label:'0.5〜1m未満',upper:1},{rgb:[255,216,192],label:'0.5〜3m未満',upper:3},
 {rgb:[255,183,183],label:'3〜5m未満',upper:5},{rgb:[255,145,145],label:'5〜10m未満',upper:10},
 {rgb:[242,133,201],label:'10〜20m未満',upper:20},{rgb:[220,122,220],label:'20m以上',upper:undefined}
];
export const sedimentColors:Partial<Record<HazardId,{rgb:number[];label:string}[]>>={
 debris:[{rgb:[230,200,50],label:'警戒区域'},{rgb:[165,0,33],label:'特別警戒区域'},{rgb:[235,211,91],label:'警戒区域（指定予定）'},{rgb:[183,51,77],label:'特別警戒区域（指定予定）'}],
 steep:[{rgb:[250,230,0],label:'警戒区域'},{rgb:[250,40,0],label:'特別警戒区域'},{rgb:[251,235,51],label:'警戒区域（指定予定）'},{rgb:[251,83,51],label:'特別警戒区域（指定予定）'}],
 landslide:[{rgb:[255,153,0],label:'警戒区域'},{rgb:[180,0,40],label:'特別警戒区域'},{rgb:[255,173,51],label:'警戒区域（指定予定）'},{rgb:[195,51,83],label:'特別警戒区域（指定予定）'}]
};
export function classifyPixel(id:HazardId,rgba:number[]):Pick<Hazard,'status'|'label'|'upper'>{
 if(rgba[3]===0)return {status:'uncolored',label:'この画素は着色なし（安全の証明ではありません）'};
 if(rgba.length!==4||rgba[3]!==255)return {status:'unknown',label:'境界・半透明のため判定できません'};
 const colors=sedimentColors[id]??depthColors;
 const found=colors.find(c=>c.rgb.every((v,i)=>v===rgba[i]));
 if(!found)return {status:'unknown',label:'凡例にない色のため判定できません'};
 return {status:'colored',label:found.label,...('upper' in found&&typeof found.upper==='number'?{upper:found.upper}: {})};
}
export function tilePixel(lon:number,lat:number,z=17){
 const xx=(lon+180)/360*2**z,yy=(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*2**z;
 return {z,x:Math.floor(xx),y:Math.floor(yy),px:Math.floor((xx-Math.floor(xx))*256),py:Math.floor((yy-Math.floor(yy))*256)};
}
export function hazardUrl(id:HazardId,p:ReturnType<typeof tilePixel>){return `https://disaportaldata.gsi.go.jp/raster/${layers[id].path}/${p.z}/${p.x}/${p.y}.png`;}
