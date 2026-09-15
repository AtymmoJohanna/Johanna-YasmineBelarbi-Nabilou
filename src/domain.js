import {SOURCE,PHYSICAL,TARGET} from './config.js';
export const mappings=[['O','OCCUPE','Occupé','Occupied'],['U','INOCCUPE','Inoccupé','Unoccupied'],['H','ENTRETIEN','Entretien','Housekeeping'],['C','FERME','Fermé','Closed'],['K','CONTAMINE','Contaminé','Contaminated'],['I','ISOLE','Isolé','Isolated']];
export const conceptMap={resourceType:'ConceptMap',url:'urn:bedview:conceptmap:etat-lit',version:'1.0.0',status:'active',group:[{source:SOURCE,sourceVersion:'2.2.0',target:TARGET,targetVersion:'1.0.0',element:mappings.map(([code,cible,display])=>({code,target:[{code:cible,display,equivalence:'equivalent'}]}))}]};
export function mapStatus(c){
 const unknown=(result)=>({state:'INCONNU',label:'Inconnu',result,warnings:[result]});
 if(!c?.code)return unknown('absent');
 if(c.system!==SOURCE)return unknown('systeme_non_pris_en_charge');
 if(c.version && c.version!=='2.2.0')return unknown('version_non_prise_en_charge');
 const target=conceptMap.group[0].element.find(e=>e.code===c.code)?.target[0];
 if(!target)return unknown('code_non_mappe');
 return {state:target.code,label:target.display,result:'equivalent',warnings:c.version?[]:['Version source non précisée']};
}
export function normalize(resources){
 let excluded=0;const dedup=new Map();const duplicates=new Set();
 for(const r of resources){if(!r?.id||r.resourceType!=='Location'||r.mode==='kind'||!r.physicalType?.coding?.some(c=>c.system===PHYSICAL&&c.code==='bd')){excluded++;continue;}if(dedup.has(r.id))duplicates.add(r.id);dedup.set(r.id,r);}
 const rows=[...dedup.values()].map(r=>{const m=mapStatus(r.operationalStatus);return {...m,id:r.id,name:r.name||r.id,admin:r.status||'',updated:r.meta?.lastUpdated||'',raw:r,warnings:[...m.warnings,...(!r.name?['Nom absent : identifiant utilisé']:[]),...(!r.mode?['Mode non précisé']:[]),...(!['active','suspended','inactive'].includes(r.status)?['Statut administratif absent ou inconnu']:[]),...(duplicates.has(r.id)?['Doublon : dernière occurrence conservée']:[])]};});
 return {rows:rows.sort((a,b)=>a.name.localeCompare(b.name,'fr',{numeric:true})),excluded};
}
export function filterRows(rows,query,state){const q=query.trim().toLocaleLowerCase('fr');return rows.filter(r=>(!state||r.state===state)&&(!q||`${r.name} ${r.id}`.toLocaleLowerCase('fr').includes(q)));}
export function counts(rows){return rows.reduce((a,r)=>{a[r.state]=(a[r.state]||0)+1;return a;},{});}
export function csvCell(v){let s=String(v??'');if(/^[\t\r\n]|^\s*[=+\-@]/.test(s))s="'"+s;return /[",\r\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;}
export function makeCsv(rows,base,date){const headers=['id_lit','nom_lit','statut_administratif','systeme_source','version_source','code_source','systeme_cible','code_cible','libelle_cible','resultat_mapping','avertissements','version_mapping','derniere_modification','date_recuperation','url_source'];return [headers,...rows.map(r=>[r.id,r.name,r.admin,r.raw.operationalStatus?.system,r.raw.operationalStatus?.version,r.raw.operationalStatus?.code,TARGET,r.state,r.label,r.result,[...r.warnings,...(/^[\t\r\n]|^\s*[=+\-@]/.test(r.name)?['Texte protégé contre les formules CSV']:[])].join('; '),'1.0.0',r.updated,date,`${base}/Location/${r.id}`])].map(a=>a.map(csvCell).join(',')).join('\r\n')+'\r\n';}
