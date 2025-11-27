# 🚀 Guide de Démarrage Rapide

## Nouvelle Architecture - Gestion Électrification Massive

### ✅ Ce qui a été fait

**40 fichiers créés** | **3 pages intégrées** | **Architecture DDD complète**

---

## 🎯 Utilisation Immédiate

### 1. Ouvrir une page

```bash
# Dashboard
file:///c:/Mes Sites Web/Gestion électrification massive - GOOGLE/index.html

# Gestion terrain
file:///c:/Mes Sites Web/Gestion électrification massive - GOOGLE/terrain.html

# Configuration
file:///c:/Mes Sites Web/Gestion électrification massive - GOOGLE/parametres.html
```

### 2. Vérifier l'initialisation (Console F12)

```javascript
// Vérifier que tout est chargé
console.log({
    projectService: !!window.projectService,
    simulationEngine: !!window.simulationEngine,
    householdService: !!window.householdService
});
// Devrait afficher: { projectService: true, simulationEngine: true, householdService: true }
```

### 3. Tester les fonctionnalités

#### Dans index.html
```javascript
// Créer un projet de démo
const project = await createDemoProject();

// Simulation Monte Carlo
const mc = simulationEngine.monteCarlo(project, {}, 100);
console.log('Durée estimée:', mc.analysis.duration.mean, 'jours');
```

#### Dans terrain.html
```javascript
// Diagnostics
terrainDiagnostics();

// Charger les ménages
const households = await loadAllHouseholds();
console.log(`${households.length} ménages`);
```

#### Dans parametres.html
```javascript
// Diagnostics
parametresDiagnostics();

// Estimer un budget
const budget = estimateProjectBudget(1000, 90, [
    { name: 'Zone A', houses: 500 },
    { name: 'Zone B', houses: 500 }
]);
console.log('Budget:', budget.total);
```

---

## 🎯 Fonctionnalités Principales

### Simulation Monte Carlo
```javascript
const result = simulationEngine.monteCarlo(project, config, 1000);
// Analyse statistique avec 1000 itérations
```

### Optimisation Génétique
```javascript
const strategy = new GeneticAlgorithmStrategy();
const allocation = strategy.optimize(zones, teams);
// Trouve la meilleure allocation
```

### Calcul de Coûts
```javascript
const estimation = costCalculationService.estimateBudget(1000, 90, zones);
// Budget détaillé avec décomposition
```

---

## 📚 Documentation

- **[walkthrough.md](file:///C:/Users/User/.gemini/antigravity/brain/548d5658-2678-4787-a296-4341095c6cc2/walkthrough.md)** - Guide complet
- **[ARCHITECTURE.md](file:///c:/Mes%20Sites%20Web/Gestion%20électrification%20massive%20-%20GOOGLE/ARCHITECTURE.md)** - Architecture détaillée
- **[integration_plan.md](file:///C:/Users/User/.gemini/antigravity/brain/548d5658-2678-4787-a296-4341095c6cc2/integration_plan.md)** - Plan d'intégration

---

## ✅ Checklist

- [x] Architecture DDD en 4 couches
- [x] 3 pages intégrées
- [x] Simulation Monte Carlo
- [x] Optimisation (3 algorithmes)
- [x] Logging multi-transport
- [x] Métriques de performance
- [x] Migration progressive

**🎉 Prêt pour la production !**
