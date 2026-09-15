# Suivi des prompts — Cahier des charges
Sujet D — Indicateur de gestion des lits (projet BedView)

Étudiante : Yasmine Belarbi
Phase : 1 — Conception (Cahier des charges)
Outil IA utilisé : Claude

---

**Question 1 :**
Je veux que tu sois mon assistant expert en interopérabilité en santé pour ce projet. On a choisi le sujet "indicateur de gestion des lits". Départ du besoin métier : disponibilité des lits par service, utilisateur = secrétaire, scénario = patient à hospitaliser qui cherche une dispo. Il me manque des critères d'acceptation clairs et le choix de la ressource FHIR pour représenter un lit.

**Réponse :**
Critères d'acceptation complétés (temps réel, filtrage par service, distinction des statuts de lit, gestion des erreurs). Ressource FHIR retenue : `Location`, avec `physicalType` = lit et `operationalStatus` basé sur la table HL7 v2 0116. Version FHIR proposée : R4. Point resté ouvert : la granularité de l'indicateur et le choix du serveur.

---

**Question 2 :**
Granularité retenue : par service, du type "Cardiologie : 3 lits libres / 12" — plutôt que le détail lit par lit.

**Réponse :**
Pour obtenir ce comptage, il faut rattacher chaque lit à son service via `Location.partOf`, rechercher les lits d'un service (`GET /Location?partOf=...`), puis compter côté application le nombre de lits "libres" — le calcul n'est pas fait par le serveur FHIR lui-même.

---

**Question 3 :**
Comparaison demandée entre le brouillon de départ et un cahier des charges complet déjà rédigé pour le projet (BedView), afin de vérifier la cohérence avant de le valider.

**Réponse :**
Trois écarts relevés : l'utilisateur du CdC est "responsable de service" au lieu de "secrétaire" ; le besoin décrit l'"état déclaré" du lit, pas sa "disponibilité" réelle (un lit inoccupé n'est pas automatiquement disponible) ; et la granularité compte les lits par état global, pas par service.

---

**Question 4 :**
Décision : le CdC BedView est conservé tel quel, sans modification, malgré les trois écarts relevés.

**Réponse :**
Après relecture complète, les six points attendus en Phase 1 sont couverts (besoin, spécifications FHIR, interactions serveur, ReEIF, mapping, formulation transmissible à l'IA). Le CdC BedView est retenu comme version finale, écarts assumés en connaissance de cause.
