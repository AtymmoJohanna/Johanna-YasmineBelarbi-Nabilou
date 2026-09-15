# Suivi des prompts — Réalisation
Sujet D — Indicateur de gestion des lits (projet BedView)
Partie : Interface (4 onglets) + export CSV + tests/vérification

Étudiante : Johanna Atymmo
Phase : 2 — Réalisation (2h)
Outil IA utilisé : Claude (assistance au développement)
Base : Cahier des charges BedView (Phase 1) + support de cours MCLB9 (théorie de l'intégration)

## Contexte

Dans le partage des tâches du groupe, cette partie couvre l'interface utilisateur, l'export CSV et la couverture de tests (`src/main.jsx`, `src/style.css`, `tests/`). Chaque prompt cible un seul écran ou une seule règle, vérifiée indépendamment contre le CdC, plutôt que de demander l'interface complète en une fois.

---

## Échange 1 — Tableau de bord : compteurs

**Prompt :**
Construis l'onglet tableau de bord avec les compteurs par état (occupé, inoccupé, en entretien, fermé, contaminé, isolé, inconnu) et le total de lits affichés, conformément à F03 du CdC.

**Vérification faite :** vérifié que les états inconnus apparaissent bien explicitement dans les compteurs et ne sont pas masqués parmi les autres catégories, comme l'exige F03 ("les états inconnus apparaissent explicitement").

**Résultat :** grille de métriques avec un compteur dédié par état.

---

## Échange 2 — Tableau de bord : liste des lits

**Prompt :**
Affiche pour chaque lit visible : identifiant, nom, état opérationnel, date de dernière modification, avertissements éventuels — les colonnes définies en F02 du CdC.

**Vérification faite :** vérifié qu'une date de dernière modification absente affiche bien "non renseigné" plutôt qu'une case vide ambiguë (section 7.1 du CdC).

**Résultat :** tableau avec badge d'état coloré et libellé textuel associé (accessibilité).

---

## Échange 3 — Recherche et filtres

**Prompt :**
Ajoute une recherche par nom ou identifiant et un filtre par état, appliqués aux mêmes lignes que celles utilisées pour l'export CSV, conformément à F04 et F07 du CdC.

**Vérification faite :** vérifié que changer le filtre sur le tableau de bord affecte bien l'aperçu CSV de l'onglet export — un seul état de filtre partagé, pas deux logiques séparées qui pourraient diverger.

**Résultat :** état de filtre (`query`, `state`) au niveau du composant racine, consommé par les deux onglets.

---

## Échange 4 — Onglet "Ressources FHIR" : JSON source

**Prompt :**
Affiche pour un lit sélectionné le JSON exact reçu du serveur, sans le reconstruire à partir des données du tableau, conformément à F05 du CdC.

**Vérification faite :** vérifié que le JSON affiché provient bien de la ressource brute stockée (`raw`), pas d'un objet recomposé à partir des champs déjà transformés pour le tableau — exigence explicite du CdC ("sans le reconstruire à partir du tableau métier").

**Résultat :** vue JSON avec lien direct vers la ressource sur HAPI et copie presse-papier.

---

## Échange 5 — Onglet "Ressources FHIR" : journal des échanges

**Prompt :**
Affiche le journal des 100 derniers appels au serveur (heure, requête, statut HTTP, durée), transmis par le client FHIR développé par ailleurs dans l'équipe, conformément à F08 et à la section 16.2 du CdC.

**Vérification faite :** vérifié que le journal affiche bien les appels en erreur avec leur message, pas seulement les appels réussis.

**Résultat :** tableau du journal trié du plus récent au plus ancien.

---

## Échange 6 — Onglet "Correspondances" : tableau de mapping

**Prompt :**
Affiche les six correspondances de référence du ConceptMap (code source, signification, code local, libellé), conformément à F06 et à la section 14.4 du CdC.

**Vérification faite :** vérifié que le tableau affiche le système source ET le système cible en en-tête, pas seulement les codes bruts — pour que la correspondance reste lisible même sans connaître les identifiants complets des systèmes (concept d'interopérabilité sémantique vu en cours).

**Résultat :** tableau des 6 correspondances + détail du ConceptMap consultable (JSON repliable).

---

## Échange 7 — Onglet "Correspondances" : transformations par lit

**Prompt :**
Pour chaque lit chargé, affiche le code source reçu, l'état cible obtenu après mapping, et le résultat ou avertissement de la transformation, conformément à la section 14.4 du CdC ("le détail de la transformation pour chaque lit").

**Vérification faite :** vérifié qu'un lit dont le mapping a échoué (code non reconnu, par exemple) affiche bien son avertissement à cet endroit, pas seulement dans le tableau de bord.

**Résultat :** tableau ligne par ligne reliant chaque lit à sa transformation.

---

## Échange 8 — Onglet "Export CSV" : aperçu

**Prompt :**
Affiche un aperçu du CSV correspondant aux lignes actuellement filtrées, avant le téléchargement, conformément à F07 du CdC ("consulter un aperçu puis télécharger").

**Vérification faite :** vérifié que l'aperçu et le fichier téléchargé utilisent exactement la même fonction de génération, pour qu'ils ne puissent jamais diverger.

**Résultat :** bloc de prévisualisation texte au-dessus du bouton de téléchargement.

---

## Échange 9 — Génération des 15 colonnes CSV

**Prompt :**
Génère le CSV avec exactement les 15 colonnes définies en section 15.2 du CdC (id_lit, nom_lit, statut_administratif, systeme_source, version_source, code_source, systeme_cible, code_cible, libelle_cible, resultat_mapping, avertissements, version_mapping, derniere_modification, date_recuperation, url_source), séparateur virgule, fin de ligne CRLF, encodage UTF-8.

**Vérification faite :** compté les colonnes produites contre la liste du CdC une par une — aucune colonne manquante ni ajoutée.

**Résultat :** `makeCsv()` avec l'ordre exact des colonnes du CdC.

---

## Échange 10 — Protection contre les formules et échappement CSV

**Prompt :**
Échappe les champs contenant une virgule, un guillemet ou un retour à la ligne, et neutralise les cellules commençant par `=`, `+`, `-` ou `@` pour éviter l'exécution de formules dans un tableur, en signalant cette protection (section 15.3 du CdC).

**Vérification faite :** testé avec un nom de lit contenant une virgule (doit être encadré de guillemets) et un nom commençant par `=` (doit être préfixé d'une apostrophe, avec mention dans la colonne avertissements). Les deux cas produisent le résultat attendu.

**Résultat :** `csvCell()` avec échappement et protection anti-formule combinés.

---

## Échange 11 — Blocage de l'export en cas de données incomplètes

**Prompt :**
Désactive le bouton de téléchargement tant que le chargement n'est pas complet ou en cas d'erreur en cours, conformément à la section 9 du CdC ("si le chargement est incomplet [...] l'export final est désactivé").

**Vérification faite :** vérifié les trois conditions de désactivation (chargement en cours, erreur active, chargement jamais terminé) sont bien toutes couvertes par la condition du bouton.

**Résultat :** `disabled={!complete||loading||!!error}` sur le bouton de téléchargement.

---

## Échange 12 — Tests de logique pure

**Prompt :**
Écris des tests sur les fonctions de logique (mapping, comptage, génération CSV) qui ne nécessitent pas de serveur, couvrant les critères d'acceptation T02, T03, T06, T08, T09 et T14 du CdC.

**Vérification faite :** croisé chaque test avec l'énoncé du critère correspondant dans le CdC (section 18), pour vérifier qu'aucun critère listé comme testable sans serveur n'a été oublié.

**Résultat :** 7 tests de logique passants (`tests/domain.test.js`).

---

## Échange 13 — Tests d'interaction et scénarios navigateur

**Prompt :**
Ajoute un test d'interface (filtres, téléchargement déclenché) exécutable avec jsdom, et des scénarios Playwright pour les cas nécessitant un vrai navigateur (petit écran, erreur réseau simulée), couvrant T04, T07, T11, T13.

**Vérification faite :** tenté d'exécuter les scénarios Playwright dans l'environnement de développement : le navigateur ne se lançait pas correctement (interruption au démarrage).

**Limite documentée :** plutôt que de masquer cette limite ou de prétendre une couverture non vérifiée, elle a été consignée explicitement dans le rapport de vérification, avec les scénarios fournis mais à exécuter en local par la suite.

**Résultat :** 1 test d'interface passant (jsdom), scénarios Playwright fournis avec leur limite d'exécution documentée dans `VERIFICATION.md`.

---

## Synthèse — ma partie

J'ai livré l'interface à quatre onglets, l'export CSV protégé et la suite de tests en treize tâches distinctes, chacune vérifiée contre une exigence précise du CdC (F02 à F09, sections 9, 14, 15, 18). La principale limite assumée concerne l'exécution des tests navigateur, non vérifiable dans l'environnement de développement utilisé mais documentée plutôt que masquée. Cette couche consomme les fonctions pures de la logique métier et les callbacks du client FHIR sans dupliquer leur logique.
