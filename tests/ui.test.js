import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';import {build} from 'esbuild';import {SOURCE,PHYSICAL} from '../src/config.js';
const resources=['O','O','O','U','U','H','C','K','I',null].map((code,i)=>({resourceType:'Location',id:String(i+1),name:`Lit ${i+1}`,mode:'instance',status:'active',physicalType:{coding:[{system:PHYSICAL,code:'bd'}]},...(code?{operationalStatus:{system:SOURCE,version:'2.2.0',code}}:{})}));
const tick=()=>new Promise(r=>setTimeout(r,40));
test('interface React : chargement, filtre, JSON, mapping, CSV et erreur',async()=>{
 const bundle=await build({entryPoints:['src/main.jsx'],bundle:true,write:false,format:'iife',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"test"'}});let fail=false;let download=false;
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost:5173',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.fetch=async(url)=>{if(fail)throw new Error('Panne réseau simulée');return {ok:true,status:200,text:async()=>JSON.stringify(url.includes('/metadata')?{resourceType:'CapabilityStatement',fhirVersion:'4.0.1'}:{resourceType:'Bundle',type:'searchset',entry:resources.map(resource=>({resource}))})};};w.AbortSignal=AbortSignal;w.AbortController=AbortController;w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){download=this.download.endsWith('.csv');};}});
 try{dom.window.eval(bundle.outputFiles[0].text);const d=dom.window.document;const button=(name)=>[...d.querySelectorAll('button')].find(b=>b.textContent.trim()===name);for(let i=0;i<30&&!d.body.textContent.includes('Connexion HAPI établie');i++)await tick();assert.equal(d.querySelectorAll('tbody tr').length,10);
 const select=d.querySelector('[aria-label="Filtrer par état"]');select.value='OCCUPE';select.dispatchEvent(new dom.window.Event('change',{bubbles:true}));await tick();assert.equal(d.querySelectorAll('tbody tr').length,3);
 d.querySelector('[aria-label="Voir le JSON du lit 1"]').click();await tick();assert.ok(d.querySelector('pre').textContent.includes('"resourceType": "Location"'));
 button('Correspondances').click();await tick();assert.ok(d.body.textContent.includes('Un vocabulaire partagé'));assert.equal(d.querySelectorAll('.mapping-systems').length,1);
 button('Export CSV').click();await tick();assert.equal(d.querySelector('.csv-preview').textContent.trim().split('\n').length,4);button('Télécharger le CSV').click();assert.ok(download);
 fail=true;button('Actualiser').click();for(let i=0;i<30&&!d.querySelector('[role="alert"]');i++)await tick();assert.ok(d.querySelector('[role="alert"]'));assert.equal(button('Télécharger le CSV').disabled,true);
 }finally{dom.window.close();}
});
