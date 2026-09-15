# Suivi des prompts — Réalisation
Sujet D — Indicateur de gestion des lits (projet BedView)
Partie : Configuration + Client FHIR (connexion, pagination, sécurité)

Étudiant : Nabilou Anoir
Phase : 2 — Réalisation (2h)
Outil IA utilisé : Claude (assistance au développement)
Base : Cahier des charges BedView (Phase 1) + support de cours MCLB6 (HL7/FHIR) et MCLB8 (architecture ReEIF)

## Contexte

Dans le partage des tâches du groupe, j'ai pris en charge la couche de connexion au serveur : la configuration centralisée et le client FHIR (`src/config.js`, `src/api.js`). C'est la fondation sur laquelle s'appuient la logique métier et l'interface développées par les deux autres membres. Chaque prompt ci-dessous cible une seule tâche technique, avec son contexte et sa contrainte de vérification, plutôt que de demander le module entier d'un coup.

---

## Échange 1 — Fichier de configuration centralisé

**Prompt :**
Crée `src/config.js` avec l'URL du serveur HAPI (`https://hapi.fhir.org/baseR4`) et le tag du jeu de données du groupe, pour que les deux autres modules du projet importent ces valeurs sans les dupliquer.

**Vérification faite :** contrôle que l'URL de base n'apparaît qu'à un seul endroit du code.

**Résultat :** `BASE` et `DATASET` exportés depuis `config.js`.

---

## Échange 2 — Systèmes de terminologie dans la configuration

**Prompt :**
Ajoute au même fichier de config les identifiants des systèmes de terminologie utilisés par le projet : le système source des états de lit (`http://terminology.hl7.org/CodeSystem/v2-0116`, vu en cours MCLB4 sur la codification CodeSystem/ValueSet), le système cible local, et le système de type physique de lieu (`location-physical-type`), tous définis en section 8 du CdC.

**Vérification faite :** vérifié que ces identifiants correspondent exactement à ceux écrits dans le CdC, sans les reformuler (le cours MCLB4 insiste sur le fait qu'un code n'a de sens que rattaché à son système exact).

**Résultat :** `SOURCE`, `TARGET`, `PHYSICAL`, `TAG_SYSTEM` ajoutés à `config.js`.

---

## Échange 3 — Vérification des capacités du serveur

**Prompt :**
Avant toute recherche de lits, ajoute un appel à `GET /metadata` pour vérifier que le serveur annonce bien FHIR R4 version 4.0.1, conformément à la ressource `CapabilityStatement` vue en cours MCLB6 et à la section 10.1 du CdC.

**Vérification faite :** confirmé que l'application lève une erreur explicite si le serveur n'annonce pas la version attendue, plutôt que de continuer avec une hypothèse implicite.

**Résultat :** vérification `cap.fhirVersion === '4.0.1'` avant toute recherche.

---

## Échange 4 — Construction de la requête de recherche

**Prompt :**
Construis la requête de recherche des lits du groupe avec le paramètre `_tag` (système + valeur du dataset) et `_count=100`, en encodant correctement les paramètres dans l'URL, conformément à la section 10.2 du CdC.

**Vérification faite :** vérifié que `_tag` combine bien système et valeur avec le séparateur `|` attendu par FHIR (paramètre de recherche par token, vu en cours MCLB6), et que `URLSearchParams` encode correctement les caractères spéciaux.

**Résultat :** requête `GET /Location?_tag=urn:bedview:dataset|...&_count=100`.

---

## Échange 5 — Suivi de la pagination

**Prompt :**
Ajoute le suivi des pages suivantes : après chaque recherche, si le Bundle contient un lien `next`, relance la requête jusqu'à ce qu'il n'y en ait plus, conformément à la section 10.4 du CdC.

**Vérification faite :** vérifié que le type de Bundle est bien `searchset` avant de traiter ses entrées, comme l'exige la ressource `Bundle` vue en cours MCLB6.

**Résultat :** boucle `while(next)` qui accumule les ressources de chaque page.

---

## Échange 6 — Détection de boucle de pagination

**Prompt :**
Le lien `next` pourrait dans de rares cas reboucler sur une URL déjà vue. Ajoute une détection de boucle pour éviter un chargement infini.

**Vérification faite :** relu la logique une fois ajoutée : chaque URL appelée est stockée dans un `Set`, et une nouvelle occurrence lève une erreur explicite au lieu de boucler silencieusement.

**Correction :** cette protection était absente de la première version du client — ajoutée après relecture de la section 10.4 du CdC qui insiste sur la fiabilité du suivi de pagination.

**Résultat :** erreur explicite "Boucle de pagination détectée" en cas d'anomalie du serveur.

---

## Échange 7 — Contrôle de destination des liens de pagination

**Prompt :**
Avant de suivre un lien `next`, vérifie qu'il pointe bien vers le même serveur que celui configuré (même origine et même chemin de base), conformément à la couche infrastructure/sécurité du CdC (section 13.1, basée sur les couches ReEIF vues en cours MCLB8).

**Vérification faite :** testé mentalement le cas où un lien de pagination pointerait vers un autre domaine : la comparaison d'origine bloque bien la requête avant qu'elle ne parte.

**Résultat :** `request()` refuse tout appel dont l'origine ou le chemin ne correspond pas à `BASE`.

---

## Échange 8 — Timeout et journal des appels

**Prompt :**
Ajoute un timeout de 15 secondes par appel réseau (section 16.1 du CdC : "réseau indisponible ou appel dépassant 15 secondes") et un journal structuré (heure, méthode, URL, statut, durée, erreur éventuelle) pour l'onglet "Ressources FHIR" que le reste de l'équipe va construire.

**Vérification faite :** vérifié que le message d'erreur distingue bien un dépassement de délai ("le serveur ne répond pas après 15 secondes") d'une autre erreur réseau, pour que l'interface puisse afficher un message pertinent sans avoir à interpréter le détail technique.

**Résultat :** `AbortSignal.timeout(15000)` combiné au signal d'annulation, callback `log()` transmettant chaque entrée du journal.

---

## Synthèse — ma partie

J'ai livré la couche de connexion (config + client FHIR) en huit tâches distinctes, chacune vérifiée contre une section précise du CdC et, pour plusieurs, contre un concept du cours (CodeSystem, CapabilityStatement, Bundle, couches ReEIF). La principale correction a porté sur la détection de boucle de pagination, absente de la première version. Cette couche expose une interface simple (`loadBeds()`, callbacks `log`/`onProgress`) que le reste du groupe a pu consommer sans connaître les détails de sécurité réseau.
