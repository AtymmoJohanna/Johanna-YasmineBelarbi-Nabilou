# BEDVIEW — Prompts de conception — Nabilou

**Projet :** Indicateur de gestion des lits hospitaliers  
**Technologies / standards :** FHIR R4, HAPI FHIR, REST/HTTPS, JSON FHIR, CSV  
**Serveur FHIR :** `https://hapi.fhir.org/baseR4`

## Rôle de Nabilou

Nabilou prend en charge le **cadrage métier**, les **choix FHIR**, le **modèle de données `Location`**, les **interactions avec HAPI**, l’**architecture technique** et l’**analyse ReEIF**.

Les prompts ci-dessous sont conçus pour produire les éléments correspondants du cahier des charges BedView.

---

## Prompt N1 — Cadrage métier, utilisateur et périmètre

### Prompt

Je conçois **BedView**, une application web pédagogique d’interopérabilité en santé.

Le sujet imposé est : **Indicateur de gestion des lits hospitaliers**.  
Le format cible imposé est le **CSV**.  
Le serveur FHIR utilisé est :

`https://hapi.fhir.org/baseR4`

Je veux uniquement travailler la **conception**, sans générer de code.

À partir de ce contexte, formalise précisément :

1. la présentation du projet ;
2. le besoin métier ;
3. la question métier principale ;
4. l’utilisateur principal et ses responsabilités ;
5. le scénario principal d’utilisation ;
6. les fonctionnalités obligatoires ;
7. les éléments hors périmètre ;
8. les critères généraux d’acceptation.

Contraintes impératives :

- l’application doit utiliser de véritables données chargées depuis HAPI FHIR ;
- aucune donnée patient ne doit être utilisée ;
- les lits utilisés pour la démonstration sont fictifs ;
- l’interface utilisateur fonctionne en lecture seule ;
- les indicateurs concernent uniquement les lits chargés dans l’application ;
- les indicateurs ne doivent pas être présentés comme la capacité réelle de l’établissement ;
- une erreur réseau ne doit jamais être remplacée silencieusement par des données locales fictives ;
- le prototype doit rester réalisable dans le temps limité de l’évaluation.

Ne propose pas de fonctionnalités hors sujet.

### Résultat attendu selon le cahier des charges

- BedView permet à un responsable de service de consulter l’état déclaré des lits de son périmètre.
- Question métier : **« Quels sont les lits de mon périmètre, quels états sont renseignés et quelles informations puis-je exporter ? »**
- L’utilisateur peut consulter, rechercher, filtrer, actualiser et exporter les lits.
- Les fonctionnalités obligatoires correspondent aux exigences F01 à F09.
- Sont hors périmètre : patient, dossier patient, réservation, authentification hospitalière, multi-utilisateur, historique clinique et taux réglementaire d’occupation.

---

## Prompt N2 — Choix des standards et ressources FHIR

### Prompt

Pour BedView, je veux justifier les choix d’interopérabilité avant le développement.

Le serveur est :

`https://hapi.fhir.org/baseR4`

Définis précisément :

- la version FHIR retenue ;
- le protocole utilisé ;
- le format des échanges ;
- les en-têtes HTTP nécessaires ;
- les ressources FHIR utilisées ;
- le rôle exact de chaque ressource ;
- ce qui vient du serveur ;
- ce qui est local à l’application ;
- le choix entre ressource FHIR de base et profil FHIR formel ;
- le format cible d’échange.

Les ressources à analyser sont :

- `Location`
- `Bundle`
- `CapabilityStatement`
- `OperationOutcome`
- `ConceptMap`

Contraintes :

- le projet utilise FHIR R4 ;
- la version de référence est 4.0.1 ;
- les échanges passent par REST sur HTTPS ;
- le format est JSON FHIR ;
- utiliser `Accept: application/fhir+json` ;
- BedView utilise `Location` de base avec des contraintes locales explicites ;
- ne prétends pas qu’un profil FHIR formel est publié ;
- le format cible est un CSV local versionné.

### Résultat attendu selon le cahier des charges

- FHIR R4, version 4.0.1.
- API REST sur HTTPS.
- JSON FHIR.
- `Location` représente les lits.
- `Bundle` transporte les résultats de recherche et la pagination.
- `CapabilityStatement` est récupéré avec `GET /metadata`.
- `OperationOutcome` sert à expliquer certaines erreurs.
- `ConceptMap` est local et versionné.
- Contrat CSV BedView version 1.0.0.

---

## Prompt N3 — Modèle de données `Location`

### Prompt

Définis précisément comment BedView doit interpréter chaque ressource `Location`.

Les champs à traiter sont :

- `resourceType`
- `id`
- `meta.tag`
- `mode`
- `physicalType.coding`
- `name`
- `status`
- `operationalStatus`
- `meta.lastUpdated`

Règles BedView :

- `resourceType` doit être `Location` ;
- `id` identifie la ressource et sert à éviter les doubles comptages ;
- `meta.tag` permet de sélectionner les ressources du groupe ;
- `mode = instance` est attendu ;
- `mode = kind` entraîne l’exclusion ;
- si `mode` est absent, la ressource peut rester avec avertissement ;
- `physicalType.coding` doit contenir :
  - système : `http://terminology.hl7.org/CodeSystem/location-physical-type`
  - code : `bd`
- si `name` est absent, afficher l’identifiant et signaler le remplacement ;
- `status` peut être `active`, `suspended` ou `inactive` ;
- un `status` absent ou inconnu est signalé ;
- si `operationalStatus` est absent, le lit reste visible avec l’état local `INCONNU` ;
- si `meta.lastUpdated` est absent, afficher `non renseigné`.

Formalise une règle de décision :

- **retenu**
- **retenu avec avertissement**
- **exclu**

Précise aussi quelles exclusions doivent apparaître dans les informations de qualité.

### Résultat attendu selon le cahier des charges

- Une ressource reconnue comme lit est retenue.
- Une ressource `mode=kind` est exclue.
- Une ressource dont le type physique n’est pas `bd` est exclue des indicateurs.
- Un champ facultatif absent ne supprime pas automatiquement le lit.
- Les exclusions restent visibles dans les informations de qualité.
- `operationalStatus` absent donne `INCONNU`.

---

## Prompt N4 — Interactions avec HAPI, pagination et déduplication

### Prompt

Conçois les interactions réelles entre BedView et HAPI FHIR.

Serveur :

`https://hapi.fhir.org/baseR4`

Je veux définir les requêtes suivantes :

1. vérification des capacités ;
2. recherche des lits du groupe ;
3. lecture d’un lit précis ;
4. pagination ;
5. déduplication ;
6. gestion d’un échec de page.

Requêtes prévues :

`GET https://hapi.fhir.org/baseR4/metadata`

`GET https://hapi.fhir.org/baseR4/Location?_tag=urn:bedview:dataset|IDENTIFIANT-GROUPE&_count=100`

`GET https://hapi.fhir.org/baseR4/Location/IDENTIFIANT-LIT`

Contraintes :

- les paramètres doivent être correctement encodés ;
- la recherche principale ne doit pas filtrer sur la présence de `operationalStatus` ;
- la pagination doit suivre `Bundle.link` avec `relation = next` ;
- l’application ne doit pas reconstruire elle-même les URLs de pagination ;
- seules les destinations correspondant au serveur configuré sont acceptées ;
- les doublons sont supprimés selon `Location.id` ;
- si plusieurs occurrences du même lit apparaissent, produire un avertissement et conserver la dernière occurrence reçue ;
- si une page échoue, les données deviennent partielles et l’export doit être désactivé.

### Résultat attendu selon le cahier des charges

- `GET /metadata` vérifie les capacités du serveur.
- La recherche utilise `_tag` et `_count=100`.
- Les pages suivantes sont suivies depuis le Bundle.
- Les doublons ne sont comptés qu’une seule fois.
- Un chargement incomplet entraîne la mention **données partielles**.
- L’export est bloqué tant que le chargement n’est pas complet.

---

## Prompt N5 — Architecture technique et circulation des données

### Prompt

Conçois l’architecture technique de BedView.

Technologies retenues :

- HTML
- CSS
- JavaScript
- Vite
- Fetch
- HAPI FHIR

Il n’y a pas de base de données propre.

Je veux séparer les modules suivants :

- Client FHIR
- Contrôle des données
- Module de mapping
- Module d’indicateurs
- Module CSV
- Interface utilisateur
- Journal des échanges

Pour chaque module, indique :

- sa responsabilité ;
- ses entrées ;
- ses sorties ;
- ce qu’il ne doit pas faire.

Décris ensuite la circulation complète des données :

1. navigateur ;
2. HAPI ;
3. JSON FHIR reçu ;
4. contrôle des ressources ;
5. mapping ;
6. transformation en lignes métier ;
7. tableau ;
8. indicateurs ;
9. CSV ;
10. inspection du JSON source.

Contraintes :

- ne pas reconstruire le JSON FHIR à partir du tableau ;
- ne pas dupliquer la logique de transformation entre tableau et CSV ;
- ne pas disperser les appels HTTP dans l’interface ;
- vérifier le CORS ;
- si nécessaire, utiliser uniquement un proxy de développement limité à HAPI.

### Résultat attendu selon le cahier des charges

- Architecture modulaire.
- Les appels FHIR sont centralisés.
- Les contrôles qualité sont séparés du mapping.
- Le mapping alimente les indicateurs et le CSV.
- Le tableau, les compteurs et l’export utilisent les mêmes lignes métier.
- Les JSON sources restent disponibles pour inspection.

---

## Prompt N6 — Analyse ReEIF et limites d’une utilisation réelle

### Prompt

Analyse BedView selon les couches ReEIF suivantes :

- Infrastructure et sécurité
- Applications
- Information
- Métier et processus
- Organisation et gouvernance
- Juridique

Contexte :

- prototype pédagogique ;
- navigateur web ;
- communications HTTPS ;
- serveur public HAPI FHIR ;
- FHIR R4 ;
- lits fictifs ;
- aucune donnée patient ;
- ConceptMap local versionné ;
- CSV local ;
- aucune authentification hospitalière.

Pour chaque couche :

1. décris les choix réellement présents dans le projet ;
2. précise les risques ou limites ;
3. indique ce qui manquerait pour un déploiement hospitalier réel.

N’invente aucun mécanisme qui n’est pas prévu dans le cahier des charges.

### Résultat attendu selon le cahier des charges

- Infrastructure : navigateur, HTTPS, timeout, contrôle des destinations.
- Applications : REST FHIR R4, séparation des modules, CSV documenté.
- Information : conservation des codes source, mapping versionné et gestion explicite des absences.
- Métier : consultation et export, sans décision d’affectation patient.
- Gouvernance : responsabilité du groupe sur les données fictives et les transformations.
- Juridique : aucune donnée personnelle dans le prototype ; une mise en production nécessiterait sécurité, authentification, gouvernance et analyse juridique.

---

## Couverture du cahier des charges

| Sections du cahier des charges | Couverture |
|---|---|
| 1 à 5 | Prompt N1 |
| 6 et 7 | Prompts N2 et N3 |
| 10 | Prompt N4 |
| 12 | Prompt N5 |
| 13 | Prompt N6 |
