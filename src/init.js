/**
 * Fichier d'initialisation principal pour la nouvelle architecture
 * Charge tous les modules dans le bon ordre
 * 
 * À inclure dans les pages HTML AVANT les autres scripts
 */

(function () {
    'use strict';

    console.log('🚀 Initializing new architecture...');

    // Vérifier que Dexie est chargé
    if (typeof Dexie === 'undefined') {
        console.error('❌ Dexie.js is required but not loaded');
        return;
    }

    // Configuration de la base de données améliorée
    const db = new Dexie('ElectrificationDB');

    // Schéma version 3 (nouvelle architecture + compatibilité legacy)
    db.version(3).stores({
        // Nouvelle architecture
        projects: '++id, name, status, startDate, endDate',
        zones: '++id, projectId, name, [projectId+name]',
        households: '++id, zoneId, status, [zoneId+status], gpsLat, gpsLon',
        teams: '++id, type, zoneId, [type+zoneId]',
        activities: '++id, date, teamId, householdId, type, [date+teamId]',
        costs: '++id, projectId, category, date',
        sync_queue: '++id, entity, action, timestamp, synced',
        audit_log: '++id, entity, entityId, action, userId, timestamp',
        // Tables legacy pour compatibilité avec terrain.html
        menages: 'id, zone, statut, [zone+statut], gps_lat, gps_lon, nom_prenom_chef, telephone, commune, quartier_village, statut_installation',
        activites_terrain: '++id, date, form_type, equipe_id, zone, menage_id, [date+zone], [date+equipe_id]',
        equipes: 'id, role, zone',
        progression: '++id, zone, metier, date',
        problemes: '++id, date, zone, equipe_id, statut',
        sync_logs: '++id, date, type, status, message'
    }).upgrade(async tx => {
        console.log('📦 Running database migration to v3...');

        // Migration des anciennes données si elles existent
        try {
            const oldMenages = await tx.table('menages').toArray();
            console.log(`Found ${oldMenages.length} old menages to migrate`);

            for (const menage of oldMenages) {
                await tx.table('households').add({
                    id: menage.id,
                    zoneId: menage.zone || 'default-zone',
                    status: menage.statut || 'En attente',
                    location: {
                        region: menage.region,
                        department: menage.departement,
                        commune: menage.commune,
                        village: menage.quartier_village,
                        coordinates: menage.gps_lat && menage.gps_lon ? {
                            latitude: menage.gps_lat,
                            longitude: menage.gps_lon,
                            precision: menage.gps_precision
                        } : null
                    },
                    owner: {
                        name: menage.nom_prenom_chef,
                        phone: menage.telephone,
                        cin: menage.cin
                    },
                    statusHistory: [],
                    assignedTeams: [],
                    scheduledDates: {},
                    actualDates: {},
                    notes: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }

            console.log('✅ Migration completed');
        } catch (error) {
            console.warn('⚠️ No old data to migrate or migration failed:', error.message);
        }
    });

    // Ouvrir la base de données
    db.open().then(() => {
        console.log('✅ Database opened successfully');

        // Initialiser les repositories
        window.projectRepository = new ProjectRepository(db);
        window.householdRepository = new HouseholdRepository(db);
        window.teamRepository = new TeamRepository(db);
        window.zoneRepository = new ZoneRepository(db);

        console.log('✅ Repositories initialized');

        // Initialiser le logger avec transport IndexedDB
        if (window.logger) {
            window.logger.addTransport(new IndexedDBTransport(db));
        }

        // Initialiser le gestionnaire d'erreurs
        window.errorHandler = new ErrorHandler(window.logger, window.eventBus);

        // Initialiser le service de métriques
        window.metricsService = new MetricsService(window.logger, window.eventBus);
        window.metricsService.startPeriodicCollection();

        console.log('✅ Monitoring services initialized');

        // Initialiser les services de domaine
        window.resourceAllocationService = new ResourceAllocationService();
        window.costCalculationService = new CostCalculationService();

        if (typeof SimulationEngine !== 'undefined') {
            window.simulationEngine = new SimulationEngine(window.logger);
        } else {
            console.error('❌ SimulationEngine class not found. Check script loading order.');
        }

        console.log('✅ Domain services initialized');

        // Initialiser les services applicatifs
        window.projectService = new ProjectService(
            window.projectRepository,
            window.zoneRepository,
            window.teamRepository,
            window.eventBus
        );

        window.householdService = new HouseholdService(
            window.householdRepository,
            window.eventBus
        );

        console.log('✅ Application services initialized');

        // Initialiser les stores
        window.projectStore = new ProjectStore(window.projectService);
        window.storeRegistry.register('project', window.projectStore);

        console.log('✅ Stores initialized');

        // Émettre un événement d'initialisation
        if (window.eventBus) {
            window.eventBus.emit('app.initialized', {
                timestamp: new Date()
            });
        }

        console.log('🎉 Architecture initialization complete!');
    }).catch(error => {
        console.error('❌ Failed to open database:', error);
    });

    // Exposer la base de données globalement
    window.db = db;

    // Fonction utilitaire pour charger un projet
    window.loadProject = async function (projectId) {
        try {
            const project = await window.projectRepository.findById(projectId);
            if (!project) {
                console.warn(`Project ${projectId} not found`);
                return null;
            }

            console.log('📂 Project loaded:', project.name);
            return project;
        } catch (error) {
            console.error('Error loading project:', error);
            throw error;
        }
    };

    // Fonction utilitaire pour créer un projet de démonstration
    window.createDemoProject = async function () {
        try {
            // Créer des zones
            const zone1 = new Zone('zone-1', 'Zone Nord', 500);
            const zone2 = new Zone('zone-2', 'Zone Sud', 500);

            // Créer le projet
            const project = new Project(
                'demo-project',
                'Projet Démonstration',
                1000,
                new Date()
            );

            project.addZone(zone1);
            project.addZone(zone2);

            // Sauvegarder
            await window.projectRepository.save(project);

            console.log('✅ Demo project created:', project.name);
            return project;
        } catch (error) {
            console.error('Error creating demo project:', error);
            throw error;
        }
    };

    // Fonction utilitaire pour obtenir des statistiques
    window.getAppStats = async function () {
        try {
            const stats = {
                projects: await window.projectRepository.count(),
                households: await window.householdRepository.count(),
                householdsByStatus: await window.householdRepository.getStats()
            };

            console.table(stats);
            return stats;
        } catch (error) {
            console.error('Error getting stats:', error);
            throw error;
        }
    };

})();
