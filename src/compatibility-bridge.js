/**
 * Adaptateur de compatibilité
 * Fait le pont entre l'ancienne et la nouvelle architecture
 * Permet une migration progressive
 */

(function () {
    'use strict';

    console.log('🔄 Loading compatibility bridge...');

    // Attendre que tout soit initialisé
    window.addEventListener('load', async () => {
        // Attendre l'initialisation de la nouvelle architecture
        await new Promise(resolve => {
            if (window.projectService) {
                resolve();
            } else {
                window.eventBus?.once('app.initialized', resolve);
            }
        });

        console.log('✅ Compatibility bridge ready');

        // Créer un pont entre appState et ProjectStore
        if (window.appState && window.projectStore) {
            syncAppStateWithStore();
        }

        // Wrapper pour les anciennes fonctions
        createCompatibilityWrappers();
    });

    /**
     * Synchronise window.appState avec ProjectStore
     */
    function syncAppStateWithStore() {
        // Écouter les changements du store
        window.projectStore.subscribe((state) => {
            if (state.currentProject && window.appState) {
                // Mettre à jour appState avec les données du store
                window.appState.project = {
                    ...window.appState.project,
                    name: state.currentProject.name,
                    totalHouses: state.currentProject.totalHouses,
                    startDate: state.currentProject.startDate,
                    status: state.currentProject.status
                };

                // Déclencher un événement pour notifier les anciens composants
                window.dispatchEvent(new CustomEvent('appStateUpdated', {
                    detail: window.appState
                }));
            }
        });

        console.log('✅ AppState synchronized with ProjectStore');
    }

    /**
     * Crée des wrappers pour les anciennes fonctions
     */
    function createCompatibilityWrappers() {
        // Wrapper pour calculateCosts
        if (typeof window.calculateCosts === 'function') {
            const originalCalculateCosts = window.calculateCosts;

            window.calculateCosts = function () {
                // Essayer d'utiliser le nouveau service
                if (window.costCalculationService && window.projectStore) {
                    const project = window.projectStore.getCurrentProject();
                    if (project) {
                        const duration = window.appState?.project?.duration || 90;
                        const result = window.costCalculationService.calculateProjectCost(project, duration);

                        // Convertir au format attendu par l'ancien code
                        return {
                            total: result.total.amount,
                            labor: result.breakdown.labor.amount,
                            materials: result.breakdown.materials.amount,
                            logistics: result.breakdown.logistics.amount,
                            supervision: result.breakdown.supervision.amount
                        };
                    }
                }

                // Fallback sur l'ancienne fonction
                return originalCalculateCosts();
            };
        }

        // Wrapper pour simulateProject
        if (typeof window.simulateProject === 'function') {
            const originalSimulateProject = window.simulateProject;

            window.simulateProject = function (projectData) {
                // Essayer d'utiliser le nouveau moteur
                if (window.simulationEngine && window.projectStore) {
                    const project = window.projectStore.getCurrentProject();
                    if (project) {
                        const simulation = window.simulationEngine.simulate(project, {
                            productivityRates: window.appState?.productivityRates || {},
                            uncertaintyFactors: {
                                [TeamType.PREPARATEURS]: 0.1,
                                [TeamType.LIVRAISON]: 0.1,
                                [TeamType.MACONS]: 0.15,
                                [TeamType.RESEAU]: 0.15,
                                [TeamType.INTERIEUR_TYPE1]: 0.1,
                                [TeamType.CONTROLE]: 0.1
                            }
                        });

                        // Convertir au format attendu
                        return {
                            duration: simulation.totalDuration,
                            completedHouses: simulation.completedHouses,
                            bottlenecks: simulation.bottlenecks,
                            days: simulation.days
                        };
                    }
                }

                // Fallback
                return originalSimulateProject(projectData);
            };
        }

        console.log('✅ Compatibility wrappers created');
    }

    /**
     * Fonction utilitaire pour migrer les données existantes
     */
    window.migrateToNewArchitecture = async function () {
        if (!window.appState || !window.projectService) {
            console.error('Cannot migrate: missing appState or projectService');
            return;
        }

        try {
            console.log('🔄 Starting migration to new architecture...');

            // Créer le projet depuis appState
            const projectData = {
                id: 'migrated-project',
                name: window.appState.project?.name || 'Projet Migré',
                totalHouses: window.appState.project?.totalHouses || 0,
                startDate: window.appState.project?.startDate
                    ? new Date(window.appState.project.startDate)
                    : new Date(),
                zones: (window.appState.zones || []).map(z => ({
                    id: z.id || `zone-${z.name}`,
                    name: z.name,
                    totalHouses: z.houses || 0
                })),
                parameters: window.appState.project?.parameters || {}
            };

            // Créer le projet via le service
            const project = await window.projectService.createProject(projectData);

            // Charger dans le store
            await window.projectStore.loadProject(project.id);

            console.log('✅ Migration completed successfully');

            // Afficher une notification
            if (window.showNotification) {
                window.showNotification(
                    'Migration réussie',
                    'Les données ont été migrées vers la nouvelle architecture',
                    'success'
                );
            }

            return project;
        } catch (error) {
            console.error('❌ Migration failed:', error);
            if (window.showNotification) {
                window.showNotification(
                    'Erreur de migration',
                    error.message,
                    'error'
                );
            }
            throw error;
        }
    };

    /**
     * Fonction pour basculer vers la nouvelle architecture
     */
    window.switchToNewArchitecture = function () {
        console.log('🔄 Switching to new architecture...');

        // Désactiver les anciennes fonctions
        window.useNewArchitecture = true;

        // Recharger le dashboard avec les nouvelles données
        if (typeof window.updateDashboard === 'function') {
            const project = window.projectStore?.getCurrentProject();
            if (project) {
                window.updateDashboard();
            }
        }

        console.log('✅ Switched to new architecture');
    };

    /**
     * Fonction pour revenir à l'ancienne architecture
     */
    window.switchToLegacyArchitecture = function () {
        console.log('🔄 Switching to legacy architecture...');
        window.useNewArchitecture = false;
        console.log('✅ Switched to legacy architecture');
    };

})();
