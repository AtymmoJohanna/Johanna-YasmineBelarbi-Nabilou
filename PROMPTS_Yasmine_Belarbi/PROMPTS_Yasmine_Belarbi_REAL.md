# Suivi des prompts — Réalisation
Sujet D — Indicateur de gestion des lits (projet BedView)
Partie : Logique métier + mapping sémantique + données de démonstration

Étudiante : Yasmine Belarbi
Phase : 2 — Réalisation (2h)
Outil IA utilisé : Claude (assistance au développement)
Base : Cahier des charges BedView (Phase 1) + support de cours MCLB4 (interopérabilité sémantique)

## Contexte

Dans le partage des tâches du groupe, cette partie couvre la logique métier : normalisation des ressources FHIR reçues, application du mapping sémantique (ConceptMap), et préparation des données fictives sur HAPI (`src/domain.js`, `scripts/seed.mjs`). Chaque prompt cible une seule règle ou une seule fonction, avec le code réellement produit en résultat.

---

## Échange 1 — Filtrage des ressources de type lit

**Prompt :**
Parmi les ressources `Location` reçues, ne garde que celles dont `physicalType.coding` contient le système `location-physical-type` avec le code `bd`, conformément à la section 7.1 du CdC et au concept de `CodeableConcept` vu en cours MCLB4 (un code n'a de sens que rattaché à son système).

**Vérification faite :** vérifié que le filtre compare bien le couple système + code, pas seulement le code seul.

**Résultat :**
```javascript
if(!r?.id||r.resourceType!=='Location'||r.mode==='kind'||
   !r.physicalType?.coding?.some(c=>c.system===PHYSICAL&&c.code==='bd')){
  excluded++;continue;
}
```

---

## Échange 2 — Exclusion des ressources de type "kind"

**Prompt :**
Exclus les ressources dont `mode` vaut `kind` (elles décrivent un type de lieu générique, pas un lit réel), conformément à la section 7.1 du CdC.

**Vérification faite :** vérifié qu'une ressource sans champ `mode` du tout n'est pas exclue à tort, mais conservée avec un avertissement.

**Résultat :** intégré dans la même condition que l'échange 1 (`r.mode==='kind'`). L'avertissement pour `mode` absent est généré plus loin :
```javascript
...(!r.mode?['Mode non précisé']:[])
```

---

## Échange 3 — Déduplication par identifiant

**Prompt :**
Si plusieurs versions du même lit apparaissent dans les résultats, ne garde que la dernière occurrence reçue et signale-le comme avertissement, conformément à la section 10.4 du CdC.

**Vérification faite :** vérifié qu'un identifiant apparaissant deux fois ne garde que la dernière occurrence, avec avertissement sur la ligne concernée.

**Résultat :**
```javascript
const dedup=new Map();const duplicates=new Set();
for(const r of resources){
  // ...filtre de l'échange 1...
  if(dedup.has(r.id))duplicates.add(r.id);
  dedup.set(r.id,r);
}
// avertissement associé :
...(duplicates.has(r.id)?['Doublon : dernière occurrence conservée']:[])
```

---

## Échange 4 — Comptage des exclusions

**Prompt :**
Compte séparément les ressources exclues (mauvais type physique) sans les faire disparaître silencieusement, pour que le tableau de bord puisse afficher cette information de qualité (F03 du CdC).

**Vérification faite :** vérifié que total retenu + exclusions = nombre de ressources reçues, sans perte ni double comptage.

**Résultat :**
```javascript
export function normalize(resources){
  let excluded=0;const dedup=new Map();const duplicates=new Set();
  for(const r of resources){ /* ... */ }
  const rows=[...dedup.values()].map(r=>{ /* construction de chaque ligne */ });
  return {rows:rows.sort((a,b)=>a.name.localeCompare(b.name,'fr',{numeric:true})),excluded};
}
```

---

## Échange 5 — Structure du ConceptMap local

**Prompt :**
Construis l'objet ConceptMap conforme à la ressource FHIR R4 `ConceptMap` (vue en cours MCLB4 : group/element/target avec équivalence), avec les six correspondances définies en section 8.3 du CdC.

**Vérification faite :** structure comparée à une ressource `ConceptMap` réelle (system source, system cible, version, group/element/target).

**Résultat :**
```javascript
export const mappings=[
  ['O','OCCUPE','Occupé','Occupied'],
  ['U','INOCCUPE','Inoccupé','Unoccupied'],
  ['H','ENTRETIEN','Entretien','Housekeeping'],
  ['C','FERME','Fermé','Closed'],
  ['K','CONTAMINE','Contaminé','Contaminated'],
  ['I','ISOLE','Isolé','Isolated']
];

export const conceptMap={
  resourceType:'ConceptMap',
  url:'urn:bedview:conceptmap:etat-lit',
  version:'1.0.0',
  status:'active',
  group:[{
    source:SOURCE,sourceVersion:'2.2.0',
    target:TARGET,targetVersion:'1.0.0',
    element:mappings.map(([code,cible,display])=>(
      {code,target:[{code:cible,display,equivalence:'equivalent'}]}
    ))
  }]
};
```

---

## Échange 6 — Cas "code absent" du mapping

**Prompt :**
Dans la fonction de mapping, si l'état opérationnel du lit ou son code est absent, retourne l'état local "INCONNU" avec le résultat "absent", conformément à la section 8.4 du CdC.

**Vérification faite :** testé avec une ressource sans `operationalStatus` : le lit reste visible avec l'état "INCONNU".

**Résultat :**
```javascript
export function mapStatus(c){
  const unknown=(result)=>({state:'INCONNU',label:'Inconnu',result,warnings:[result]});
  if(!c?.code)return unknown('absent');
  // ... suite en échanges 7 et 8
}
```

---

## Échange 7 — Cas "système différent" et "code non reconnu"

**Prompt :**
Ajoute les deux règles suivantes : système différent → "systeme_non_pris_en_charge" ; code non reconnu → "code_non_mappe". Le libellé seul ne doit jamais servir à déterminer la correspondance (section 8.4 du CdC).

**Vérification faite :** testé avec un code "O" rattaché à un système différent de `v2-0116` : pas de traduction en "OCCUPE" malgré la coïncidence du code (critère T08 du CdC).

**Résultat :**
```javascript
if(c.system!==SOURCE)return unknown('systeme_non_pris_en_charge');
if(c.version && c.version!=='2.2.0')return unknown('version_non_prise_en_charge'); // échange 8
const target=conceptMap.group[0].element.find(e=>e.code===c.code)?.target[0];
if(!target)return unknown('code_non_mappe');
```

---

## Échange 8 — Cas "version non prise en charge"

**Prompt :**
Si la version source est explicitement renseignée mais différente de 2.2.0, retourne "INCONNU"/"version_non_prise_en_charge" ; si elle est absente, transforme quand même le code mais avec avertissement (section 8.4 : "la version source n'est jamais inventée dans l'export").

**Vérification faite :** version explicite "2.1.0" → INCONNU ; version absente sur code valide → transformation appliquée avec avertissement.

**Résultat (fonction complète assemblée des échanges 6 à 8) :**
```javascript
export function mapStatus(c){
  const unknown=(result)=>({state:'INCONNU',label:'Inconnu',result,warnings:[result]});
  if(!c?.code)return unknown('absent');
  if(c.system!==SOURCE)return unknown('systeme_non_pris_en_charge');
  if(c.version && c.version!=='2.2.0')return unknown('version_non_prise_en_charge');
  const target=conceptMap.group[0].element.find(e=>e.code===c.code)?.target[0];
  if(!target)return unknown('code_non_mappe');
  return {
    state:target.code,label:target.display,result:'equivalent',
    warnings:c.version?[]:['Version source non précisée']
  };
}
```

---

## Échange 9 — Script de préparation des dix lits fictifs

**Prompt :**
Écris un script qui crée sur HAPI les dix lits du jeu de démonstration défini en section 17 du CdC (3 occupés, 2 inoccupés, 1 entretien, 1 fermé, 1 contaminé, 1 isolé, 1 sans état), chacun avec le marqueur du groupe et le statut administratif "active".

**Vérification faite :** vérifié que chaque lit créé porte bien le tag du groupe (`meta.tag`) et le type physique "bd".

**Résultat :**
```javascript
const codes=['O','O','O','U','U','H','C','K','I',null];
for(let i=0;i<codes.length;i++){
  if(manifest.ids[i]){console.log('Déjà préparé',manifest.ids[i]);continue;}
  const resource={
    resourceType:'Location',
    meta:{tag:[{system:TAG_SYSTEM,code:DATASET}]},
    name:`BEDVIEW · Lit ${String(i+1).padStart(2,'0')} · FICTIF`,
    status:'active',
    mode:'instance',
    physicalType:{coding:[{system:PHYSICAL,code:'bd',display:'Bed'}]}
  };
  if(codes[i])resource.operationalStatus={system:SOURCE,version:'2.2.0',code:codes[i]};
  const response=await fetch(`${BASE}/Location`,{
    method:'POST',
    headers:{'Content-Type':'application/fhir+json',Accept:'application/fhir+json',Prefer:'return=representation'},
    body:JSON.stringify(resource),
    signal:AbortSignal.timeout(20000)
  });
  const body=await response.json();
  if(response.status!==201)throw new Error(JSON.stringify(body));
  manifest.ids[i]=body.id;
  await writeFile(file,JSON.stringify(manifest,null,2));
  console.log('Créé',i+1,body.id);
}
```

---

## Échange 10 — Manifeste et idempotence du script

**Prompt :**
Le script ne doit pas recréer des lits à chaque exécution : conserve les identifiants renvoyés par HAPI dans un fichier manifeste local, et réutilise-le pour ne compléter que les lits manquants.

**Vérification faite :** exécuté le script une deuxième fois : aucune nouvelle création déclenchée (section 11 du CdC).

**Correction :** la première version recréait les dix lits à chaque lancement, provoquant des doublons sur le serveur public partagé. Correction en lisant le manifeste avant toute création (`if(manifest.ids[i]){...continue;}` ci-dessus).

**Résultat :**
```javascript
import {readFile,writeFile} from 'node:fs/promises';
const file=new URL('./manifest.json',import.meta.url);
let manifest;
try{
  manifest=JSON.parse(await readFile(file,'utf8'));
}catch{
  manifest={dataset:DATASET,ids:[]};
}
```
```json
{
  "dataset": "bedview-20260915-01a0a4f3",
  "ids": [
    "138780670","138780671","138780672","138780673","138780674",
    "138780675","138780676","138780677","138780678","138780679"
  ]
}
```

---

## Synthèse — ma partie

J'ai livré la logique métier et la préparation des données en dix tâches distinctes, chacune vérifiée contre une règle précise du CdC (sections 7, 8, 11, 17) et rattachée aux concepts de terminologie et de ConceptMap vus en cours MCLB4. La principale correction a porté sur l'idempotence du script de seed, après avoir constaté des doublons lors d'une deuxième exécution. Cette couche reste indépendante du client FHIR et de l'interface : fonctions pures (`normalize`, `mapStatus`), facilement testables par le reste de l'équipe.
