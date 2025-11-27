/**
 * Adaptateur pour la page paramètres
 * Intègre la nouvelle architecture avec la configuration de projet
 */

(function () {
    'use strict';

    console.log('⚙️ Loading parametres adapter...');

    // Attendre l'initialisation
    window.addEventListener('load', async () => {
        await new Promise(resolve => {
            if (window.projectService) {
                resolve();
            } else {
                window.eventBus?.once('app.initialized', resolve);
            }
        });

        console.log('✅ Parametres adapter ready');

        // Initialiser l'adaptateur
        initParametresAdapter();
    });

    /**
     * Initialise l'adaptateur paramètres
     */
    function initParametresAdapter() {
        // Créer des fonctions utilitaires
        createParametresUtilities();

        // Wrapper pour les fonctions existantes
        wrapExistingFunctions();

        // Écouter les événements
        setupEventListeners();
    }

    /**
     * Crée des fonctions utilitaires pour paramètres
     */
    function createParametresUtilities() {
        /**
         * Sauvegarde la configuration du projet
         */
        window.saveProjectConfiguration = async function (config) {
            try {
                window.metricsService?.startTimer('saveProjectConfiguration');

                // Créer ou mettre à jour le projet
                let project;

                if (config.projectId) {
                    // Mise à jour
                    project = await window.projectService.updateProject(config.projectId, {
                        name: config.name,
                        budget: config.budget ? new Cost(config.budget, 'FCFA') : null,
                        parameters: config.parameters
                    });
                } else {
                    // Création
                    project = await window.projectService.createProject({
                        name: config.name,
                        totalHouses: config.totalHouses,
                        startDate: config.startDate || new Date(),
                        zones: config.zones || [],
                        budget: config.budget ? new Cost(config.budget, 'FCFA') : null,
                        parameters: config.parameters
                    });
                }

                window.metricsService?.endTimer('saveProjectConfiguration');
                window.logger?.info('Project configuration saved', { projectId: project.id });

                return project;
            } catch (error) {
                window.logger?.error('Error saving project configuration', error);
                throw error;
            }
        };

        /**
         * Calcule automatiquement les ressources optimales
         */
        window.calculateOptimalResources = async function (projectData) {
            try {
                window.metricsService?.startTimer('calculateOptimalResources');

                const { totalHouses, duration, zones } = projectData;

                // Créer un projet temporaire pour les calculs
                const tempProject = new Project(
                    'temp-calc',
                    'Calcul Temporaire',
                    totalHouses,
                    new Date()
                );

                // Ajouter les zones
                for (const zoneData of zones) {
                    const zone = new Zone(
                        zoneData.id || `zone-${Math.random()}`,
                        zoneData.name,
                        zoneData.houses,
                        tempProject.id
                    );
                    tempProject.addZone(zone);
                }

                // Utiliser le service d'allocation
                const productivityRates = {};
                for (const teamType of Object.values(TeamType)) {
                    productivityRates[teamType] = ProductivityRate.fromDefaults(teamType);
                }

                // Calculer les équipes nécessaires pour chaque zone
                const allocation = {};
                for (const zone of tempProject.zones) {
                    const required = window.resourceAllocationService.calculateRequiredTeams(
                        zone,
                        duration,
                        productivityRates
                    );
                    allocation[zone.id] = required;
                }

                // Calculer le coût
                const costBreakdown = window.costCalculationService.calculateProjectCost(
                    tempProject,
                    duration
                );

                window.metricsService?.endTimer('calculateOptimalResources');

                return {
                    allocation,
                    cost: costBreakdown,
                    duration,
                    totalTeams: Object.values(allocation).reduce((sum, teams) => {
                        return sum + Object.values(teams).reduce((s, count) => s + count, 0);
                    }, 0)
                };
            } catch (error) {
                window.logger?.error('Error calculating optimal resources', error);
                throw error;
            }
        };

        /**
         * Optimise l'allocation avec une stratégie
         */
        window.optimizeAllocation = async function (projectData, strategy = 'genetic') {
            try {
                window.metricsService?.startTimer('optimizeAllocation');

                // Créer le projet
                const project = new Project(
                    'opt-project',
                    projectData.name,
                    projectData.totalHouses,
                    new Date()
                );

                // Ajouter les zones
                const zones = [];
                for (const zoneData of projectData.zones) {
                    const zone = new Zone(
                        zoneData.id,
                        zoneData.name,
                        zoneData.houses,
                        project.id
                    );
                    project.addZone(zone);
                    zones.push(zone);
                }

                // Créer des équipes fictives
                const teams = [];
                const teamCounts = projectData.teamCounts || {};

                for (const [teamType, count] of Object.entries(teamCounts)) {
                    for (let i = 0; i < count; i++) {
                        const team = new Team(
                            `${teamType}-${i}`,
                            teamType,
                            [{ id: `M-${i}`, name: `Member ${i}` }]
                        );
                        teams.push(team);
                    }
                }

                // Choisir la stratégie
                let optimizationStrategy;
                switch (strategy) {
                    case 'greedy':
                        optimizationStrategy = new GreedyOptimizationStrategy();
                        break;
                    case 'genetic':
                        optimizationStrategy = new GeneticAlgorithmStrategy({
                            populationSize: 50,
                            generations: 100
                        });
                        break;
                    case 'cost':
                        optimizationStrategy = new CostMinimizationStrategy();
                        break;
                    default:
                        optimizationStrategy = new GreedyOptimizationStrategy();
                }

                // Optimiser
                const allocation = optimizationStrategy.optimize(zones, teams, {
                    maxDuration: projectData.duration,
                    maxBudget: projectData.budget ? new Cost(projectData.budget, 'FCFA') : null
                });

                window.metricsService?.endTimer('optimizeAllocation');

                // Convertir en format utilisable
                const result = {};
                for (const [zone, assignedTeams] of allocation.entries()) {
                    result[zone.id] = {
                        zoneName: zone.name,
                        teams: assignedTeams.map(t => ({
                            id: t.id,
                            type: t.type
                        }))
                    };
                }

                return result;
            } catch (error) {
                window.logger?.error('Error optimizing allocation', error);
                throw error;
            }
        };

        /**
         * Estime le budget du projet
         */
        window.estimateProjectBudget = function (totalHouses, duration, zones) {
            try {
                const estimation = window.costCalculationService.estimateBudget(
                    totalHouses,
                    duration,
                    zones
                );

                return {
                    total: estimation.estimated.format(),
                    totalAmount: estimation.estimated.amount,
                    costPerHouse: estimation.costPerHouse.format(),
                    costPerHouseAmount: estimation.costPerHouse.amount,
                    breakdown: {
                        labor: estimation.breakdown.labor.format(),
                        materials: estimation.breakdown.materials.format(),
                        logistics: estimation.breakdown.logistics.format(),
                        supervision: estimation.breakdown.supervision.format()
                    },
                    margin: estimation.margin.format()
                };
            } catch (error) {
                window.logger?.error('Error estimating budget', error);
                throw error;
            }
        };

        /**
         * Simule le projet avec Monte Carlo
         */
        window.simulateProjectConfiguration = async function (projectData, iterations = 1000) {
            try {
                window.metricsService?.startTimer('simulateProject');

                // Créer le projet
                const project = new Project(
                    'sim-project',
                    projectData.name,
                    projectData.totalHouses,
                    new Date()
                );

                // Ajouter les zones
                for (const zoneData of projectData.zones) {
                    const zone = new Zone(
                        zoneData.id,
                        zoneData.name,
                        zoneData.houses,
                        project.id
                    );
                    project.addZone(zone);
                }

                // Simulation Monte Carlo
                const result = window.simulationEngine.monteCarlo(project, {
                    productivityRates: projectData.productivityRates || {},
                    uncertaintyFactors: {
                        [TeamType.PREPARATEURS]: 0.1,
                        [TeamType.LIVRAISON]: 0.1,
                        [TeamType.MACONS]: 0.15,
                        [TeamType.RESEAU]: 0.15,
                        [TeamType.INTERIEUR_TYPE1]: 0.1,
                        [TeamType.CONTROLE]: 0.1
                    }
                }, iterations);

                const report = window.simulationEngine.generateReport(result);

                window.metricsService?.endTimer('simulateProject');

                return report;
            } catch (error) {
                window.logger?.error('Error simulating project', error);
                throw error;
            }
        };

        console.log('✅ Parametres utilities created');
    }

    /**
     * Wrapper pour les fonctions existantes
     */
    function wrapExistingFunctions() {
        // Wrapper pour calculateAuto si elle existe
        if (typeof window.calculateAuto === 'function') {
            const originalCalculateAuto = window.calculateAuto;

            window.calculateAuto = async function () {
                // Essayer d'utiliser le nouveau service
                if (window.resourceAllocationService && window.projectStore) {
                    try {
                        const projectData = {
                            totalHouses: parseInt(document.getElementById('totalHouses')?.value) || 0,
                            duration: parseInt(document.getElementById('projectDuration')?.value) || 90,
                            zones: getZonesFromForm()
                        };

                        const result = await window.calculateOptimalResources(projectData);

                        // Afficher les résultats
                        displayOptimizationResults(result);

                        return result;
                    } catch (error) {
                        console.warn('New architecture failed, falling back:', error);
                    }
                }

                // Fallback sur l'ancienne fonction
                return originalCalculateAuto();
            };
        }

        console.log('✅ Existing functions wrapped');
    }

    /**
     * Configure les écouteurs d'événements
     */
    function setupEventListeners() {
        if (!window.eventBus) return;

        // Écouter la création de projet
        window.eventBus.on('project.created', (data) => {
            console.log('Project created:', data);
            showParametresNotification(
                'Projet créé',
                `Le projet ${data.name} a été créé avec succès`,
                'success'
            );
        });

        // Écouter les mises à jour
        window.eventBus.on('project.updated', (data) => {
            console.log('Project updated:', data);
        });

        console.log('✅ Parametres event listeners configured');
    }

    /**
     * Récupère les zones depuis le formulaire
     */
    function getZonesFromForm() {
        const zones = [];
        const zoneElements = document.querySelectorAll('[data-zone-id]');

        zoneElements.forEach(el => {
            zones.push({
                id: el.dataset.zoneId,
                name: el.querySelector('[data-zone-name]')?.value || '',
                houses: parseInt(el.querySelector('[data-zone-houses]')?.value) || 0
            });
        });

        return zones;
    }

    /**
     * Affiche les résultats d'optimisation
     */
    function displayOptimizationResults(result) {
        console.log('Optimization results:', result);

        // Mettre à jour l'UI si les éléments existent
        if (result.cost) {
            const totalCostEl = document.getElementById('totalProjectCost');
            if (totalCostEl) {
                totalCostEl.textContent = result.cost.total.format();
            }
        }

        if (result.totalTeams) {
            const totalTeamsEl = document.getElementById('totalTeams');
            if (totalTeamsEl) {
                totalTeamsEl.textContent = result.totalTeams;
            }
        }
    }

    /**
     * Affiche une notification
     */
    function showParametresNotification(title, message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(title, message, type);
            return;
        }

        const emoji = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        console.log(`${emoji[type] || 'ℹ️'} ${title}: ${message}`);
    }

    /**
     * Fonction de diagnostic
     */
    window.parametresDiagnostics = function () {
        console.log('🔍 Parametres Diagnostics:');
        console.log('- ProjectService:', !!window.projectService);
        console.log('- ResourceAllocationService:', !!window.resourceAllocationService);
        console.log('- CostCalculationService:', !!window.costCalculationService);
        console.log('- SimulationEngine:', !!window.simulationEngine);
        console.log('- OptimizationStrategies:', {
            Greedy: !!window.GreedyOptimizationStrategy,
            Genetic: !!window.GeneticAlgorithmStrategy,
            Cost: !!window.CostMinimizationStrategy
        });
    };

})();
