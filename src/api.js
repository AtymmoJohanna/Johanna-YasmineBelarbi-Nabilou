import {BASE,TAG_SYSTEM} from './config.js';
export async function request(url,{signal,log=()=>{},fetcher=fetch}={}){
 const target=new URL(url);const base=new URL(BASE);if(target.origin!==base.origin||!(target.pathname===base.pathname||target.pathname.startsWith(base.pathname+'/')))throw new Error('Lien de pagination hors du serveur autorisé.');
 const started=Date.now();let status='Réseau';let size=0;
 try{const timed=AbortSignal.timeout(15000);const combined=signal?AbortSignal.any([signal,timed]):timed;const response=await fetcher(url,{headers:{Accept:'application/fhir+json'},signal:combined});status=response.status;
 const text=await response.text();let data;try{data=JSON.parse(text);}catch{throw new Error(`Réponse JSON invalide (HTTP ${status}).`);}
 if(!response.ok||data.resourceType==='OperationOutcome'&&data.issue?.some(i=>['fatal','error'].includes(i.severity)))throw new Error(data.issue?.map(i=>i.diagnostics||i.details?.text||i.code).join(' · ')||`Erreur HTTP ${status}`);
 size=data.entry?.length||0;log({time:new Date().toISOString(),url,method:'GET',status,duration:Date.now()-started,size});return data;
 }catch(e){const error=e.name==='TimeoutError'?'Le serveur ne répond pas après 15 secondes.':e.message;log({time:new Date().toISOString(),url,method:'GET',status,duration:Date.now()-started,size,error});throw new Error(error,{cause:e});}
}
export async function loadBeds(dataset,{log,onProgress=()=>{},signal,fetcher}={}){
 const opts={log,signal,fetcher};const cap=await request(`${BASE}/metadata?_elements=fhirVersion`,opts);if(cap.resourceType!=='CapabilityStatement'||cap.fhirVersion!=='4.0.1')throw new Error('Le serveur doit annoncer FHIR R4 4.0.1.');
 // La recherche réelle ci-dessous vérifie la prise en charge de Location.
 let next=`${BASE}/Location?${new URLSearchParams({_tag:`${TAG_SYSTEM}|${dataset}`,_count:'100'})}`;const seen=new Set();let resources=[];let pages=0;
 while(next){if(seen.has(next))throw new Error('Boucle de pagination détectée.');seen.add(next);const bundle=await request(next,opts);if(bundle.resourceType!=='Bundle'||bundle.type!=='searchset')throw new Error('La recherche doit retourner un Bundle searchset.');resources.push(...(bundle.entry||[]).filter(e=>e.search?.mode!=='outcome').map(e=>e.resource));pages++;onProgress(resources,pages);next=bundle.link?.find(l=>l.relation==='next')?.url;if(next)next=new URL(next,BASE+'/').href;}
 return {resources,pages};
}
