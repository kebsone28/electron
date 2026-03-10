# Architecture Frontend - Proquelec GEM SaaS

## 1. Module de Simulation (Planificateur Stratégique)
La page **Simulation** permet d'estimer les coûts et de modéliser le déploiement. Elle est architecturée autour des composants suivants :

- `SimulationConfig` / `ParameterEditor` : Interfaces pour ajuster le ratio urbain/rural, le coût au km de câble, et la répartition des Kobo kits (Maçonnerie vs Réseau).
- `ScenarioBuilder` : Moteur local de composition permettant d'ajouter des filtres sur des zones et de forcer des modèles économiques.
- `SimulationResults` : Tableau de bord qui réceptionne le payload de l'API (`/api/simulation/run`). Ce composant utilise `framer-motion` pour l'animation des métriques de retour (Taux de Rentabilité, Igpp).
- Les données de l'API sont mises en cache dans le hook personnalisé `useSimulation` ou utilisées via des states locaux dans le composant principal `Simulation.tsx`.

### Flow Typique
1. L'utilisateur configure les variables dans le Sidebar de Simulation.
2. Le `Payload` est formé et envoyé via Axios.
3. Le retour (jobId / results) est parser par `SimulationResults` avec des jauges de rentabilité (ROI).

## 2. Module de Rapports (Reporting & Analytics)
La page **Rapports Globaux et Analytique** offre des exports structurés et synthétiques de la progression du projet.

- `ReportGenerator` : Formulaire central permettant de sélectionner les KPIs, la plage de dates et le type de rapport (Financier, Logistique, Avancement Terrain).
- Appels via le client axios connecté à `/api/kpi` et `/api/monitoring/performance` pour les données en direct.
- Export PDF via `jspdf` et `jspdf-autotable`. L'intégration prévoit un export complet structuré en tableaux.
- Export Excel via `xlsx` (création de Workbooks virtuels basés sur les données brutes manipulées par Dexie ou des exports directs du backend via JSON-to-Sheet).

Le module se veut un outil d'aide à la décision permettant d'auditer l'état des ménages, et d'assurer le "reporting Senelec" directement dans un format professionnel.
