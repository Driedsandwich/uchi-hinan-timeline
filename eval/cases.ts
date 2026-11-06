import type {Person} from '../src/core/schema';
const p=(name:string,ageBand:Person['ageBand'],mobility:Person['mobility'],rest:Partial<Person>={}):Person=>({name,ageBand,mobility,senses:'不明',night:'不明',needs:[],contactRole:'不明',residence:'不明',evidence:'',...rest});
// 人手で期待値を作成。evidenceと質問の言い回しは項目一致率の対象外。
export const cases:{id:string;text:string;expected:Person[]}[]=[
 {id:'c01',text:'母 82歳 同居 杖をつく 薬が必要。父 85歳 同居 耳が遠い 夜は21時に寝る。息子 45歳 別居 連絡係。',expected:[p('母','高齢','杖・歩行器',{residence:'同居',needs:['杖','薬']}),p('父','高齢','不明',{residence:'同居',senses:'耳が遠い',night:'夜は21時に寝る'}),p('息子','成人','不明',{residence:'別居',contactRole:'連絡係'})]},
 {id:'c02',text:'祖母 79歳 同居 歩行器を使う 補聴器が必要。娘 40歳 同居 自力歩行 付き添う。',expected:[p('祖母','高齢','杖・歩行器',{residence:'同居',needs:['歩行器','補聴器'],senses:'補聴器'}),p('娘','成人','自力歩行',{residence:'同居',contactRole:'付き添う'})]},
 {id:'c03',text:'父 76歳 同居 自分で歩ける 薬が必要。私 38歳 同居 自力歩行 連絡係。',expected:[p('父','高齢','自力歩行',{residence:'同居',needs:['薬']}),p('私','成人','自力歩行',{residence:'同居',contactRole:'連絡係'})]},
 {id:'c04',text:'妻 54歳 同居 車いす 酸素機器が必要。夫 56歳 同居 自力歩行 付き添う。',expected:[p('妻','成人','車いす',{residence:'同居',needs:['車いす','酸素機器']}),p('夫','成人','自力歩行',{residence:'同居',contactRole:'付き添う'})]},
 {id:'c05',text:'祖父 90歳 同居 歩けない 薬が必要。母 60歳 同居 自力歩行 連絡係。',expected:[p('祖父','高齢','歩行困難',{residence:'同居',needs:['薬']}),p('母','成人','自力歩行',{residence:'同居',contactRole:'連絡係'})]},
 {id:'c06',text:'娘 4歳 同居 自力歩行。私 32歳 同居 自力歩行 夜勤。',expected:[p('娘','子ども','自力歩行',{residence:'同居'}),p('私','成人','自力歩行',{residence:'同居',night:'夜勤'})]},
 {id:'c07',text:'兄 50歳 別居 電話で確認。母 80歳 同居 自力歩行 目が見えにくい 眼鏡が必要。',expected:[p('兄','成人','不明',{residence:'別居',contactRole:'電話で確認'}),p('母','高齢','自力歩行',{residence:'同居',senses:'目が見えにくい',needs:['眼鏡']})]},
 {id:'c08',text:'父 ６８歳 同居 普通に歩ける 夜は起きにくい。',expected:[p('父','高齢','自力歩行',{residence:'同居',night:'夜は起きにくい'})]},
 {id:'c09',text:'妹 24歳 別居 夜は不在 迎えに来る。',expected:[p('妹','成人','不明',{residence:'別居',night:'夜は不在',contactRole:'迎えに来る'})]},
 {id:'c10',text:'母 年齢は不明 同居。',expected:[p('母','不明','不明',{residence:'同居'})]},
 {id:'c11',text:'父 65歳 同居 自力歩行 インスリンを持つ。',expected:[p('父','高齢','自力歩行',{residence:'同居',needs:['インスリン']})]},
 {id:'c12',text:'息子 17歳 同居 自力歩行 難聴 補聴器が必要。',expected:[p('息子','子ども','自力歩行',{residence:'同居',senses:'難聴',needs:['補聴器']})]},
 {id:'c13-unseen',text:'祖父（74歳）は一緒に住んでいて、足腰が弱く休みながら歩く。',expected:[p('祖父','高齢','不明',{residence:'同居'})]},
 {id:'c14-negation',text:'母 70歳 同居 杖は不要で自力歩行。',expected:[p('母','高齢','自力歩行',{residence:'同居'})]}
];
