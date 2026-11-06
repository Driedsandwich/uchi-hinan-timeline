import type {Plan, Person} from '../core/schema';

// Display the participants and conditions from the existing plan rows.
// This component does not classify people, hazards, or evacuation destinations.
export function FamilyPromise({plan:p,person}:{plan:Plan;person:Person}){
 const early=(p.rows.find(r=>r.id==='l3')||p.rows[1]);
 const row=p.rows.find(r=>r.id===(('・'+early.who+'・').includes('・'+person.name+'・')?'l3':'l4'))||p.rows[2];
 const level=row.id==='l3'?3:4;
 const action=level===4?'避難を完了':p.decision.kind==='indoor'?'居室へ早めに移る':'早めに避難する';
 return <section className={`family-promise ${row.id}`} aria-label={`${person.name}の行動`}>
  <div className="level-label">{row.when}<span>発令時</span></div>
  <div className="promise-body"><h3 className="person-name">{person.name}</h3><div className="promise-content">
   {p.decision.kind==='check'&&<p className="condition">自治体の地図・指示で危険な場所に当たる場合</p>}
   <p className="main-action">{action}</p>
   {person.mobility!=='不明'&&<p className="person-detail no-print">{person.mobility}</p>}
   {person.senses&&person.senses!=='不明'&&person.senses!=='特になし'&&<p className="person-detail">声かけ：{person.senses}</p>}
   <p className="personal-carry">持ち物：{person.needs.length?person.needs.join('・'):'下の共通欄'}</p>
   {person.night&&person.night!=='不明'&&<p className="person-night">夜の様子：{person.night}</p>}
  </div></div>
 </section>;
}

export function FamilyPromises({plan:p}:{plan:Plan}){
 const l3=(p.rows.find(r=>r.id==='l3')||p.rows[1]),l4=p.rows.find(r=>r.id==='l4')||p.rows[2],l5=p.rows.find(r=>r.id==='l5')||p.rows[3];
 return <>
  <div className="family-promises">{p.family.people.filter(person=>person.residence!=='別居').map((person,i)=><FamilyPromise key={i} plan={p} person={person}/>)}</div>
  <div className="support-promise"><span>一緒に動く人</span><strong>{p.conditions.supporter.trim()||'支援する人（要確認）'}</strong><p>別居家族の到着を待たない。近くの支援者と相談する。</p></div>
  <p className="row-action no-print">{l3.action}</p>
  <section className="shared-level l4"><h3>{l4.when}<span>発令時</span></h3><div><p className="main-action">全員、危険な場所から避難</p>{p.decision.kind==='check'&&<p>自治体の地図・指示で危険な場所に当たる場合</p>}<p className="no-print">{l4.action}</p><p className="no-print">持ち物：{l4.carry}</p></div></section>
  <section className="shared-level l5"><h3>{l5.when}<span>発令時</span></h3><div><p className="main-action">命を守る行動</p><p>外への移動が危険なら、上階や崖から離れた部屋などで直ちに命を守る。</p><p className="no-print">{l5.where}。{l5.carry}。安全を保証する行動ではありません。</p></div></section>
  <p className="never-wait">レベル5を待たずに避難</p>
 </>;
}
