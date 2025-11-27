# Nouvelle Architecture - Guide de Démarrage

## 📁 Structure du Projet

```
src/
├── domain/                    # Logique métier pure
│   ├── entities/             # Entités (Project, Zone, Team, Household)
│   ├── value-objects/        # Value Objects (Location, Cost, ProductivityRate)
│   ├── services/             # Services de domaine
│   └── events/               # Événements de domaine
│
├── application/              # Services applicatifs
│   ├── services/            # Services d'application
│   ├── use-cases/           # Cas d'utilisation
│   └── state/               # Gestion d'état
│
├── infrastructure/          # Implémentations techniques
│   ├── repositories/        # Accès aux données
│   ├── adapters/            # Adaptateurs externes
│   ├── events/              # EventBus
│   └── database/            # Configuration DB
│
├── presentation/            # Interface utilisateur
│   ├── components/          # Composants UI
│   └── controllers/         # Contrôleurs
│
└── shared/                  # Code partagé
    ├── errors/              # Erreurs personnalisées
    ├── constants/           # Constantes et enums
    └── utils/               # Utilitaires
```

## 🚀 Démarrage Rapide

### 1. Tester l'Architecture

Ouvrez `test-architecture.html` dans votre navigateur pour tester tous les modules.

### 2. Inclure dans vos Pages HTML

```html
<!-- 1. Dexie.js (requis) -->
<script src="https://unpkg.com/dexie@3.2.4/dist/dexie.js"></script>

<!-- 2. Erreurs et constantes -->
<script src="src/shared/errors/DomainErrors.js"></script>
<script src="src/shared/constants/enums.js"></script>

<!-- 3. Infrastructure de base -->
<script src="src/infrastructure/events/EventBus.js"></script>

<!-- 4. Entités de base -->
<script src="src/domain/entities/Entity.js"></script>

<!-- 5. Value Objects -->
<script src="src/domain/value-objects/Location.js"></script>
<script src="src/domain/value-objects/Cost.js"></script>
<script src="src/domain/value-objects/ProductivityRate.js"></script>

<!-- 6. Entités du domaine -->
<script src="src/domain/entities/Household.js"></script>
<script src="src/domain/entities/Team.js"></script>
<script src="src/domain/entities/Zone.js"></script>
<script src="src/domain/entities/Project.js"></script>

<!-- 7. Repositories -->
<script src="src/infrastructure/repositories/ProjectRepository.js"></script>
<script src="src/infrastructure/repositories/HouseholdRepository.js"></script>

<!-- 8. Initialisation -->
<script src="src/init.js"></script>
```

## 📚 Exemples d'Utilisation

### Créer un Projet

```javascript
// Créer des zones
const zone1 = new Zone('zone-1', 'Zone Nord', 500);
const zone2 = new Zone('zone-2', 'Zone Sud', 500);

// Créer le projet
const project = new Project(
    'project-1',
    'Électrification Dakar',
    1000,
    new Date('2024-01-15')
);

// Ajouter les zones
project.addZone(zone1);
project.addZone(zone2);

// Définir le budget
project.setBudget(new Cost(50000000, 'FCFA'));

// Sauvegarder
await window.projectRepository.save(project);
```

### Gérer les Ménages

```javascript
// Créer une localisation
const coords = new Coordinates(14.6928, -17.4467);
const location = new Location('Dakar', 'Dakar', 'Plateau', 'Rue 10', coords);

// Créer un ménage
const household = new Household(
    'H001',
    location,
    { name: 'Amadou Diallo', phone: '771234567' }
);

// Mettre à jour le statut
household.updateStatus(
    HouseholdStatus.IN_PROGRESS,
    'admin',
    'Début des travaux'
);

// Assigner une équipe
household.assignTeam(TeamType.RESEAU, 'team-001');

// Sauvegarder
await window.householdRepository.save(household);
```

### Gérer les Équipes

```javascript
// Créer une équipe
const team = new Team(
    'team-001',
    TeamType.RESEAU,
    [
        { id: 'M1', name: 'Moussa Sow' },
        { id: 'M2', name: 'Fatou Ndiaye' }
    ]
);

// Assigner à une zone
team.assignToZone('zone-1');

// Enregistrer la progression quotidienne
team.recordDailyProgress(new Date(), 5, 8);

// Obtenir la productivité moyenne
const productivity = team.getAverageProductivity();
console.log(`Productivité: ${productivity} ménages/jour`);
```

### Utiliser l'EventBus

```javascript
// S'abonner à un événement
window.eventBus.on('household.status.changed', (data) => {
    console.log(`Ménage ${data.householdId}: ${data.oldStatus} → ${data.newStatus}`);
    
    // Mettre à jour la carte
    updateMapMarker(data.householdId, data.newStatus);
});

// Les événements sont automatiquement émis par les entités
household.updateStatus(HouseholdStatus.COMPLETED, 'admin');
// → Émet 'household.status.changed'
```

### Rechercher des Données

```javascript
// Rechercher des projets
const projects = await window.projectRepository.search({
    status: ProjectStatus.IN_PROGRESS,
    name: 'Dakar'
});

// Rechercher des ménages
const households = await window.householdRepository.search({
    zoneId: 'zone-1',
    status: HouseholdStatus.COMPLETED
});

// Obtenir des statistiques
const stats = await window.householdRepository.getStats('zone-1');
console.log(stats);
// {
//   total: 500,
//   byStatus: {
//     'En attente': 100,
//     'En cours': 200,
//     'Terminé': 180,
//     'Problème': 20
//   }
// }
```

## 🎯 Concepts Clés

### Entités vs Value Objects

**Entités** (ont une identité unique):
- `Project`, `Zone`, `Team`, `Household`
- Peuvent être modifiées
- Ont un cycle de vie
- Émettent des événements

**Value Objects** (définis par leurs valeurs):
- `Location`, `Cost`, `ProductivityRate`, `Coordinates`
- Immutables
- Pas d'identité
- Peuvent être remplacés mais pas modifiés

### Événements de Domaine

Les entités émettent automatiquement des événements lors de changements importants:

- `project.started` - Projet démarré
- `project.completed` - Projet terminé
- `zone.team.assigned` - Équipe assignée à une zone
- `household.status.changed` - Statut de ménage changé
- `team.progress.recorded` - Progression enregistrée

### Repositories

Les repositories gèrent la persistance:

- **Hydratation**: Données DB → Entités
- **Déshydratation**: Entités → Données DB
- **CRUD**: Create, Read, Update, Delete
- **Recherche**: Critères complexes

## 🔧 Fonctions Utilitaires Globales

```javascript
// Charger un projet
const project = await window.loadProject('project-1');

// Créer un projet de démonstration
const demo = await window.createDemoProject();

// Obtenir des statistiques
const stats = await window.getAppStats();
```

## 📊 Migration des Données

La base de données migre automatiquement les anciennes données:

- Table `menages` → `households`
- Conversion automatique des champs
- Préservation de toutes les données

## 🗺️ Cartographie & Migration

- Map rendering est maintenant centralisé dans la classe `MapManager` (fichier `map_manager.js`). MapManager est l'implémentation canonique pour l'affichage, le clustering, la heatmap et la gestion dynamique des marqueurs.
- `main.js` contient encore des fonctions legacy (initializeMap / renderHouseholdsOnMap), elles sont désormais dépréciées et délèguent à `MapManager` par défaut. Elles restent comme fallback pendant la transition mais l'objectif est de migrer complètement vers `MapManager`.
- Feature flag: si vous avez besoin de forcer le comportement legacy pour tests/rollbacks, définissez `window.APP_CONFIG.mapImplementation = 'legacy'` avant que les scripts ne s'exécutent.

## ⚠️ Points d'Attention

1. **Ordre de chargement**: Respecter l'ordre des scripts (voir ci-dessus)
2. **Validation**: Les entités valident automatiquement les données
3. **Immutabilité**: Les Value Objects ne peuvent pas être modifiés
4. **Événements**: Écouter les événements pour synchroniser l'UI
5. **Async/Await**: Toutes les opérations de repository sont asynchrones

## 🐛 Débogage

```javascript
// Activer les logs détaillés
window.eventBus.on('*', (data, event) => {
    console.log('Event:', event.name, data);
});

// Voir l'historique des événements
console.log(window.eventBus.getHistory());

// Statistiques de l'EventBus
console.log(window.eventBus.getStats());
```

## 📝 Prochaines Étapes

1. ✅ Architecture de base (TERMINÉ)
2. ⏳ Services applicatifs
3. ⏳ Intégration avec les pages existantes
4. ⏳ Tests unitaires
5. ⏳ Optimisation et monitoring

## 🆘 Aide

Pour toute question, consultez:
- `test-architecture.html` - Tests interactifs
- `implementation_plan.md` - Plan complet
- Console du navigateur - Messages de débogage
