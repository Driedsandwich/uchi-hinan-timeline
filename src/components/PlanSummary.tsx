import type {Plan} from '../core/schema';

// The overview and the final sheet show the same existing plan data.
export function PlanSummary({plan:p}:{plan:Plan}){
 const primaryHazard=p.hazards.find(h=>h.status==='colored'&&h.id!=='tsunami')||p.hazards.find(h=>h.id==='flood'), destination=p.shelters.candidates[0];
 return <>
 <div className="summary-pair">
 <section className="summary-box risk-box"><h2>この家の危険</h2><div><p>{primaryHazard?.name||'洪水'}</p><strong className="risk-value">{primaryHazard?.status==='colored'?primaryHazard.label:'要確認'}</strong><p className="small">{primaryHazard?.status!=='colored'&&primaryHazard?.label}</p>{p.hazards.filter(h=>h.status==='colored'&&h.id!=='tsunami'&&h.id!==primaryHazard?.id).map(h=><p className="small" key={h.id}>{h.name}：{h.label}</p>)}<p className="small">地図が取れない・色がない場所も、安全とは限りません。</p></div></section>
 <section className="summary-box destination-box"><h2>{p.decision.kind==='indoor'?'移る場所':'避難先の候補'}</h2><div><strong className="destination-name">{p.decision.kind==='indoor'?p.conditions.upperRoom:destination?.name||'自治体に確認（未確定）'}</strong><p>{p.decision.kind!=='indoor'&&destination&&`直線 ${destination.distanceM} m`}</p><p className="small">{p.decision.kind==='indoor'?'確認した条件に基づく候補です。':p.estimates.map((e,i)=><span className="estimate-short" key={i}>{e.name}：{e.minutes===null?'時間は未計算':`準備込み 約${e.minutes}分`}</span>)}</p><p className="small">開いているか・受入れ条件・安全な道は要確認</p></div></section>
 </div>
 <div className={'decision no-print '+p.decision.kind}><strong>{p.decision.title}</strong></div>
 </>;
}
