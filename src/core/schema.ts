import { z } from 'zod';
export const personSchema=z.object({
 name:z.string().trim().min(1).max(24), ageBand:z.enum(['子ども','成人','高齢','不明']),
 mobility:z.enum(['自力歩行','杖・歩行器','車いす','歩行困難','不明']),
 senses:z.string().max(80), night:z.string().max(80), needs:z.array(z.string().min(1).max(32)).max(8),
 contactRole:z.string().max(80), residence:z.enum(['同居','別居','不明']), evidence:z.string().max(300)
}).strict();
export const familySchema=z.object({people:z.array(personSchema).min(1).max(8),questions:z.array(z.string().min(1).max(120)).max(3)}).strict();
export type Person=z.infer<typeof personSchema>;export type Family=z.infer<typeof familySchema>;
export const pointSchema=z.object({lat:z.number().min(20).max(46),lon:z.number().min(122).max(154),label:z.string().min(1).max(180)}).strict();
export type Point=z.infer<typeof pointSchema>;
export const conditionsSchema=z.object({collapseOutside:z.enum(['yes','no','unknown']),roomAbove:z.enum(['yes','no','unknown']),supplies:z.enum(['yes','no','unknown']),otherHazardsChecked:z.enum(['yes','no','unknown']),upperRoom:z.string().max(40),supporter:z.string().max(40),readyMinutes:z.number().int().min(0).max(180)}).strict();
export type Conditions=z.infer<typeof conditionsSchema>;
export const defaultConditions:Conditions={collapseOutside:'unknown',roomAbove:'unknown',supplies:'unknown',otherHazardsChecked:'unknown',upperRoom:'',supporter:'',readyMinutes:20};
export const hazardIds=['flood','debris','steep','landslide','surge','tsunami'] as const;
export type HazardId=typeof hazardIds[number];
export type Hazard={id:HazardId;name:string;status:'colored'|'uncolored'|'unavailable'|'unknown';label:string;rgba?:number[];upper?:number;source:string;checkedAt:string;pixel?:{z:number;x:number;y:number;px:number;py:number};error?:string};
export type Shelter={name:string;address:string;remarks:string;lat:number;lon:number;disasters:number[];distanceM:number;source:string};
export type ShelterResult={candidates:Shelter[];required:number[];sources:string[];failed:number;total:number;checkedAt:string};
export type Decision={kind:'leave'|'indoor'|'check';title:string;reasons:string[]};
export type Row={id:string;when:string;who:string;where:string;action:string;carry:string};
export type Estimate={name:string;speed:number|null;minutes:number|null;reason:string};
export type Plan={version:1;createdAt:string;point:Point;family:Family;conditions:Conditions;hazards:Hazard[];shelters:ShelterResult;tsunamiShelters?:ShelterResult;decision:Decision;rows:Row[];estimates:Estimate[];lineText:string;printText:string;wording:'verified-ai'|'template';aiCalls:number;provider:string;warnings:string[]};
