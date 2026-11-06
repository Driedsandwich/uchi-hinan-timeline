import type {Family,Person,Conditions} from '../core/schema';
export function FamilyReview({family,onChange,conditions,onConditions}:{family:Family;onChange:(f:Family)=>void;conditions:Conditions;onConditions:(c:Conditions)=>void}){
 const set=(i:number,key:keyof Person,value:unknown)=>onChange({...family,people:family.people.map((p,j)=>i===j?{...p,[key]:value}:p)});
 const options={ageBand:['不明','子ども','成人','高齢'],mobility:['不明','自力歩行','杖・歩行器','車いす','歩行困難'],residence:['不明','同居','別居']};
 return <>
 <div className="notice"><strong>家族のことを確かめてください</strong><p>読み取りに違いがあれば、その場で直せます。不明なことは不明のまま進められます。</p>{family.questions.length>0&&<div className="question-list">{family.questions.map((q,i)=><div className="question-card" key={i}><span aria-hidden="true">{i+1}</span><p>{q}</p></div>)}</div>}</div>
 <div className="people">{family.people.map((p,i)=><fieldset className="person" key={i}><legend>{p.name||`家族 ${i+1}`}</legend>
 <label>呼び名<input value={p.name} maxLength={24} onChange={e=>set(i,'name',e.target.value)}/></label>
 {Object.entries(options).map(([key,values])=><label key={key}>{{ageBand:'年代',mobility:'歩くときの様子',residence:'住まい'}[key]}<select value={p[key as keyof Person] as string} onChange={e=>set(i,key as keyof Person,e.target.value)}>{values.map(v=><option key={v}>{v}</option>)}</select></label>)}
 {([['senses','聞こえ・見え'],['night','夜の様子'],['contactRole','連絡・支援の役']] as const).map(([key,label])=><label key={key}>{label}<input value={p[key]} maxLength={80} onChange={e=>set(i,key,e.target.value)}/></label>)}
 <label>必要な薬・機器（「、」で区切る）<input value={p.needs.join('、')} maxLength={200} onChange={e=>set(i,'needs',e.target.value.split(/[、,]/).map(s=>s.trim()).filter(Boolean).slice(0,8))}/></label>
 <small>入力された文：{p.evidence}</small>{family.people.length>1&&<button type="button" className="quiet" onClick={()=>onChange({...family,people:family.people.filter((_,j)=>j!==i)})}>この人を削除</button>}
 </fieldset>)}</div><button type="button" disabled={family.people.length>=8} onClick={()=>onChange({...family,people:[...family.people,{name:"家族",ageBand:"不明",mobility:"不明",senses:"不明",night:"不明",needs:[],contactRole:"不明",residence:"不明",evidence:"確認画面で追加"}]})}>読み取れなかった家族を追加（最大8人）</button>
 <fieldset className="home"><legend>家と、手伝う人の確認</legend>
 <label>近くで一緒に避難を手伝う人<input placeholder="例：同居の娘。未定なら空欄" value={conditions.supporter} maxLength={40} onChange={e=>onConditions({...conditions,supporter:e.target.value})}/></label>
 <label>準備に必要な時間（分・目安）<input type="number" min={0} max={180} value={conditions.readyMinutes} onChange={e=>onConditions({...conditions,readyMinutes:Number(e.target.value)})}/></label>
 <details><summary>上の階に留まれるか検討する場合</summary><p>階数だけでは決められません。自治体のハザードマップで次の条件を確認した場合に限り「確認した」を選んでください。</p>
 {([['collapseOutside','洪水で家が倒れたり流されたりするおそれのある区域（家屋倒壊等氾濫想定区域）の外である'],['roomAbove','洪水・高潮で予想される水の深さより高い部屋があり、全員が移れる'],['supplies','水がひくまでの期間、水・食料・薬と停電・断水・トイレへの備えが足りる'],['otherHazardsChecked','土砂など、雨による他の災害のおそれがないことを自治体の資料で確認した']] as const).map(([key,label])=><label key={key}>{label}<select value={conditions[key]} onChange={e=>onConditions({...conditions,[key]:e.target.value})}><option value="unknown">わからない・未確認</option><option value="yes">確認した（条件を満たす）</option><option value="no">条件を満たさない</option></select></label>)}
 <label>その部屋の呼び名<input placeholder="例：3階の寝室" maxLength={40} value={conditions.upperRoom} onChange={e=>onConditions({...conditions,upperRoom:e.target.value})}/></label>
 </details></fieldset>
 </>;
}
