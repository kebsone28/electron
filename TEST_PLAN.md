# Plan de tests — Gestion Électrification de Masse

But : fournir un plan de tests complet (manuel et automatisé) pour vérifier que l'application est prête pour la production. Ce document sert de référence pour QA, CI et développement.

## Vue d'ensemble
- Application type : Electron (UI HTML/JS) + pages statiques/JS dans le dossier racine.
- Pages principales : `index.html`, `parametres.html`, `simulation.html`, `rapports.html`, `terrain.html`, `aide.html`, `charges.html`.
- Runtime principal : Electron (`electron/main.js`) ; logique applicative centralisée dans `main.js`.

---

## Organisation du plan
1. Catégories de tests
   - Tests unitaires (fonctions pures, utilitaires de `main.js`)
   - Tests d'intégration (éléments UI <-> logique JS)
   - Tests end-to-end (Playwright — parcours utilisateur complet)
   - Tests de sécurité (Electron hardening, import de fichiers)
   - Tests accessibilité (axe-core / audits automatiques)
   - Tests de packaging (build, offline, ressources statiques)
2. Fixtures et données de test
3. Cas de test par page
4. Stratégie CI / critères d'entrée en production

---

## Fixtures recommandées
- fixtures/appstate-basic.json : état minimal du projet (1000 ménages, paramètres par défaut)
- fixtures/appstate-complex.json : état réaliste (travail de terrain, sous-équipes, données de `terrainData` et `households`) pour vérifier l'agrégation
- fixtures/terrain-valid.geojson / fixtures/terrain-invalid.geojson
- fixtures/terrain-valid.csv / fixtures/terrain-invalid.csv
- fixtures/backup-valid.json / fixtures/backup-broken.json
- mocks pour fonctions asynchrones (IDB, IndexedDB), et mocks pour document APIs en tests unit.

---

## Tests unitaires (Jest / vitest)
Cibles principales : fonctions pures dans `main.js`.
- calculateProductivity(params)
  - tests: valeurs cohérentes pour combinaisons de params; productivité minimale; cas avec 0 équipes → productivité 0 ou gestion d'erreur.
- calculateRisk(params)
  - tests: comportement monotone avec unseenRate / resourceAvailability, valeurs borne (0..100), validité numérique.
- calculateProjectDuration()
  - tests: durée > 0, résultat null si entrées manquantes, scénario extrême.
- calculateCosts()
  - tests: somme attendue (utiliser fixtures), gestion des acquisitions 'acheter' / 'louer'.
- aggregateTerrainData(terrainData)
  - tests: agrégation correcte, sous-équipes, dates, valeurs manquantes.
- buildTeamsFromData(parameters, terrainData)
  - tests: combiner params + agrégats, sortir structures attendues.
- parseTeamKey(teamStr)
  - tests: multiple formats, valeurs invalides.

Assertions : chaque fonction doit couvrir cas normal, cas bornes, cas erreurs.

---

## Tests d'intégration
Objectif : vérifier interaction DOM ↔ logique (fonctions exposées globalement)
- loadParameters()/saveParameters()
  - scenario: charger valeurs à partir d'un `appState` mocké puis vérifier que les champs du formulaire sont bien préremplis.
  - scenario: modifier champs dans DOM et appeler `saveParameters()`, vérifier `localStorage` et `appState` mis à jour.
- exportParameters()/importAppStateFile()
  - test d'export → créer un blob, validating JSON shape; import → merge prudent, gestion d'erreur si JSON invalide.
- updateAppState() + updateDashboard()
  - verifier que la reconstruction des équipes et des métriques correspond aux fixtures.
- UI event delegation
  - tester que boutons génériques (data-action) invoquent les fonctions attendues: save-parameters, reset-defaults, load-optimized, export-parameters, import-appstate

---

## Tests end-to-end (Playwright / Puppeteer)
Recommandé : Playwright (@playwright/test) — pour couverture cross-platform et headful/headless.
Stratégie : créer suites smoke + critical flows.

Suites proposées :
- Smoke suite (sur toutes les pages)
  - Lancer l'app (ou ouvrir fichier `index.html` dans chromium headless)
  - Vérifier navigation : cliquer sur nav → page charge → élément clé visible
  - Vérifier scripts chargés sans erreurs console

- Parameters page tests (`parametres.html`)
  - Test 1 (load/save persist): charger la page -> s'assurer que `loadParameters` a peuplé les champs -> modifier plusieurs champs -> déclencher save (bouton ou auto-save) -> recharger la page -> vérifier valeurs persistées.
  - Test 2 (import/export): cliquer `Exporter` → vérifier que le téléchargement est déclenché (ou mock) ; Import : simuler `backupFileInput` avec `fixtures/backup-valid.json` puis vérifier `appState` mis à jour et notification.
  - Test 3 (file import validations): uploader `terrain-valid.geojson` et `terrain-invalid.geojson` et vérifier traitement/erreur.

- Simulation page tests (`simulation.html`)
  - Remplir scénarios → exécuter simulation → vérifier résultat sensé (durée > 0, productivité non négative, risk entre 0 et 100)
  - Comparer scénario optimisé vs actuel

- Terrain page tests (`terrain.html`)
  - Import GeoJSON/CSV → vérifier parsing + agrégations → vérifier rendu carte (si présent) ou messages d'erreur

- Rapports page tests (`rapports.html`)
  - Générer rapport complet → vérifier présence d'éléments de synthèse, charts existants

- Electron smoke (optionnel)
  - Lancer `npm start` dans CI / runner avec Electron instalé → vérifier app boot, fenêtre ouverte, page chargée, aucune erreur critique au démarrage.

---

## Sécurité & import de fichiers
- Sanitize et valider JSON/CSV/GeoJSON en entrée.
  - Tests: importer fichier JSON malformé → vérifier message d'erreur et état inchangé
  - Tests: importer GeoJSON avec coordonnées hors bornes → gestion claire de l'erreur
- Electron hardening
  - vérifier contextIsolation=true, nodeIntegration=false (déjà true/false dans `electron/main.js`)
  - garantir que `preload.js` n'expose pas de méthodes dangereuses (limiter APIs)
  - tests: tentative d'accès à `window.require` depuis le renderer (doit être undefined)

---

## Accessibilité (axe-core)
- Ajouter tests automatiques axe pour pages critiques : `parametres.html`, `index.html`, `simulation.html`, `terrain.html`.
- Vérifier éléments suivants :
  - structure des titres (h1, h2…), labels `for` + id sur inputs
  - contrast ratio >= 4.5 pour texte normal
  - attributs `alt` pour images
  - focus order et keyboard navigation

---

## Packaging & offline
- Smoke tests après packaging (electron-builder): vérifier que l'app démarre même sans accès CDN.
  - Simuler offline : bloquer réseau → vérifier présence d'assets locaux (fonts, CSS) et que app ne casse pas.
- tests pour contenu distant : si CDNs sont utilisés, fournir fallback ou préparer bundling.

---

## CI / automatisation recommandée
- Stages suggestionnels :
  1. Install dependencies
  2. Run linter
  3. Run unit tests
  4. Run accessibility checks (axe)
  5. Run E2E via Playwright
  6. Build/package (electron-builder)
  7. Optional: Upload artifacts / sign / release

- Exemple d'outils
  - ESLint + Prettier
  - Jest (unit) ou Vitest
  - Playwright (E2E)
  - axe-core (a11y)

---

## Critères d'entrée en production (Gate)
- Tous les tests unitaires passent (couverture critique >= 85% des fonctions utilitaires)
- Smoke E2E passent sur runner -> pages critiques OK
- A11y : pas d'erreurs bloquantes (violations de niveau A/AA)
- Security scan : npm audit passed ou acceptés mitigations, Electron hardening vérifié
- Packaging : Windows installer buildé et fonctionnel sur runner

---

## Prochaines étapes suggérées (je peux vous aider)
1. Ajouter et configurer test runner (Playwright) + quelques tests smoke dans `tests/e2e/` — je peux le générer maintenant.
2. Ajouter `eslint` et tests unitaires pour fonctions utilitaires dans `main.js`.
3. Remplacer les scripts inline (si vous voulez appliquer une CSP plus stricte) — je peux proposer un patch.

---

Fin du plan de tests initial. Si vous souhaitez que je génère les tests automatiques (Playwright) et les scripts `package.json` correspondants, confirmez et je vais :
- installer les devDependencies nécessaires,
- ajouter un dossier `tests/playwright/` avec 3 tests smoke (`index`, `parametres`, `simulation`),
- ajouter des scripts `npm run test:e2e` et `npm run lint` dans `package.json`.
