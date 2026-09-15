import {readFile,writeFile} from 'node:fs/promises';
import {BASE,DATASET,TAG_SYSTEM,SOURCE,PHYSICAL} from '../src/config.js';
const file=new URL('./manifest.json',import.meta.url);let manifest;try{manifest=JSON.parse(await readFile(file,'utf8'));}catch{manifest={dataset:DATASET,ids:[]};}
const codes=['O','O','O','U','U','H','C','K','I',null];
for(let i=0;i<codes.length;i++){
 if(manifest.ids[i]){console.log('Déjà préparé',manifest.ids[i]);continue;}
 const resource={resourceType:'Location',meta:{tag:[{system:TAG_SYSTEM,code:DATASET}]},name:`BEDVIEW · Lit ${String(i+1).padStart(2,'0')} · FICTIF`,status:'active',mode:'instance',physicalType:{coding:[{system:PHYSICAL,code:'bd',display:'Bed'}]}};
 if(codes[i])resource.operationalStatus={system:SOURCE,version:'2.2.0',code:codes[i]};
 const response=await fetch(`${BASE}/Location`,{method:'POST',headers:{'Content-Type':'application/fhir+json',Accept:'application/fhir+json',Prefer:'return=representation'},body:JSON.stringify(resource),signal:AbortSignal.timeout(20000)});
 const body=await response.json();if(response.status!==201)throw new Error(JSON.stringify(body));manifest.ids[i]=body.id;await writeFile(file,JSON.stringify(manifest,null,2));console.log('Créé',i+1,body.id);
}
console.log('Jeu préparé sur HAPI :',DATASET);
