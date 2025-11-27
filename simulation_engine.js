/**
 * Moteur de Simulation de Flux (Flow Simulation Engine)
 * Simule le déroulement du projet jour par jour en gérant les stocks tampons entre les étapes.
 * Support de la simulation parallèle par zones avec allocation automatique ou manuelle des équipes.
 */

const LegacySimulationEngine = {
    /**
     * Exécute la simulation complète du projet
     * @param {Object} params - Les paramètres du projet (équipes, taux, zones, allocationMode, etc.)
     * @param {Number} totalHouses - Nombre total de ménages
     * @returns {Object} Résultats de la simulation (durée, logs journaliers, stats par métier, états par zone)
     */
    run: function (params, totalHouses) {
        // ... implementation remains the same ...
        const zones = params.zones && params.zones.length > 0 ? params.zones : [{ name: 'Global', houses: totalHouses }];
        const allocationMode = params.allocationMode || 'auto';

        // 1. Initialisation des stocks par zone
        let zoneStates = zones.map(z => {
            let zoneTeams;

            if (allocationMode === 'manual' && z.teams) {
                // Mode manuel : utiliser les équipes définies par zone
                zoneTeams = z.teams;
            } else {
                // Mode auto : répartition proportionnelle
                const zoneRatio = (parseInt(z.houses) || 0) / totalHouses;
                zoneTeams = {
                    preparateurs: Math.round((params.prepTeams || 0) * zoneRatio),
                    livraison: Math.round((params.deliveryTeams || 0) * zoneRatio),
                    macons: Math.round((params.masonTeams || 0) * zoneRatio),
                    reseau: Math.round((params.networkElectricianTeams || 0) * zoneRatio),
                    interiorType1: Math.round((params.interiorElectricianType1Teams || 0) * zoneRatio),
                    interiorType2: Math.round((params.interiorElectricianType2Teams || 0) * zoneRatio),
                    controle: Math.round((params.controllerTeams || 0) * zoneRatio)
                };
            }

            return {
                name: z.name,
                total: parseInt(z.houses) || 0,
                teams: zoneTeams,
                stocks: {
                    todo: parseInt(z.houses) || 0,
                    prep: 0,
                    livraison: 0,
                    maconnerie: 0,
                    reseau: 0,
                    interieur: 0,
                    fini: 0
                },
                metrics: {
                    productivity: [],      // Ménages terminés par jour
                    dailyProgress: [],     // Total cumulé de ménages finis
                    utilization: [],       // Taux d'utilisation des équipes (0-1)
                    days: []               // Numéros de jours pour graphiques
                },
                duration: 0,
                isComplete: false
            };
        });

        // Suivi global de l'activité
        let activity = {
            preparateurs: { days: 0, totalProd: 0 },
            livraison: { days: 0, totalProd: 0 },
            macons: { days: 0, totalProd: 0 },
            reseau: { days: 0, totalProd: 0 },
            interieur: { days: 0, totalProd: 0 },
            controle: { days: 0, totalProd: 0 }
        };

        let day = 0;
        const maxDays = 365 * 5;
        let dailyLogs = [];
        const globalTotal = zoneStates.reduce((acc, z) => acc + z.total, 0);

        // 2. Boucle de simulation jour par jour
        while (day < maxDays) {
            day++;
            let allComplete = true;

            let log = {
                day: day,
                stocks: { prep: 0, livraison: 0, maconnerie: 0, reseau: 0, interieur: 0, fini: 0 },
                production: { preparateurs: 0, livraison: 0, macons: 0, reseau: 0, interieur: 0, controle: 0 },
                zoneDetails: []
            };

            // CHAQUE ZONE PROGRESSE EN PARALLÈLE
            for (let zone of zoneStates) {
                if (zone.isComplete) {
                    log.zoneDetails.push({ name: zone.name, stocks: { ...zone.stocks }, complete: true });
                    continue;
                }

                allComplete = false;

                // --- Étape 1 : Préparation ---
                let capPrep = (zone.teams.preparateurs || 0) * (params.prepRate || 0);
                let prodPrep = Math.min(zone.stocks.todo, capPrep);
                zone.stocks.todo -= prodPrep;
                zone.stocks.prep += prodPrep;
                if (prodPrep > 0) activity.preparateurs.days++;
                activity.preparateurs.totalProd += prodPrep;
                log.production.preparateurs += prodPrep;

                // --- Étape 2 : Livraison ---
                let capLiv = (zone.teams.livraison || 0) * (params.deliveryRate || 0);
                let prodLiv = Math.min(zone.stocks.prep, capLiv);
                zone.stocks.prep -= prodLiv;
                zone.stocks.livraison += prodLiv;
                if (prodLiv > 0) activity.livraison.days++;
                activity.livraison.totalProd += prodLiv;
                log.production.livraison += prodLiv;

                // --- Étape 3 : Maçonnerie ---
                let capMac = (zone.teams.macons || 0) * (params.masonRate || 0);
                let prodMac = Math.min(zone.stocks.livraison, capMac);
                zone.stocks.livraison -= prodMac;
                zone.stocks.maconnerie += prodMac;
                if (prodMac > 0) activity.macons.days++;
                activity.macons.totalProd += prodMac;
                log.production.macons += prodMac;

                // --- Étape 4 : Réseau ---
                let capRes = (zone.teams.reseau || 0) * (params.networkRate || 0);
                let prodRes = Math.min(zone.stocks.maconnerie, capRes);
                zone.stocks.maconnerie -= prodRes;
                zone.stocks.reseau += prodRes;
                if (prodRes > 0) activity.reseau.days++;
                activity.reseau.totalProd += prodRes;
                log.production.reseau += prodRes;

                // --- Étape 5 : Installation Intérieure ---
                let capInt = ((zone.teams.interiorType1 || 0) * (params.interiorRateType1 || 0)) +
                    ((zone.teams.interiorType2 || 0) * (params.interiorRateType2 || 0));
                let prodInt = Math.min(zone.stocks.reseau, capInt);
                zone.stocks.reseau -= prodInt;
                zone.stocks.interieur += prodInt;
                if (prodInt > 0) activity.interieur.days++;
                activity.interieur.totalProd += prodInt;
                log.production.interieur += prodInt;

                // --- Étape 6 : Contrôle ---
                let capCtrl = (zone.teams.controle || 0) * (params.controlRate || 0);
                let prodCtrl = Math.min(zone.stocks.interieur, capCtrl);
                zone.stocks.interieur -= prodCtrl;
                zone.stocks.fini += prodCtrl;
                if (prodCtrl > 0) activity.controle.days++;
                activity.controle.totalProd += prodCtrl;
                log.production.controle += prodCtrl;

                // === TRACKING MÉTRIQUES QUOTIDIENNES ===
                const dailyOutput = prodCtrl; // Ménages terminés ce jour
                const previousFini = zone.metrics.dailyProgress.length > 0
                    ? zone.metrics.dailyProgress[zone.metrics.dailyProgress.length - 1]
                    : 0;

                // Productivité : ménages terminés ce jour
                zone.metrics.productivity.push(dailyOutput);

                // Progression cumulative
                zone.metrics.dailyProgress.push(zone.stocks.fini);

                // Taux d'utilisation : ratio output réel / capacité max
                const totalCapacity = (zone.teams.preparateurs || 0) * (params.prepRate || 0);
                const utilization = totalCapacity > 0 ? dailyOutput / totalCapacity : 0;
                zone.metrics.utilization.push(Math.min(utilization, 1));

                // Jour
                zone.metrics.days.push(day);

                // Vérifier si zone terminée
                if (zone.stocks.fini >= zone.total && !zone.isComplete) {
                    zone.isComplete = true;
                    zone.duration = day;
                }

                // Snapshot état zone
                log.zoneDetails.push({ name: zone.name, stocks: { ...zone.stocks }, complete: zone.isComplete });
            }

            // Agrégation des stocks pour le log global
            zoneStates.forEach(z => {
                log.stocks.prep += z.stocks.prep;
                log.stocks.livraison += z.stocks.livraison;
                log.stocks.maconnerie += z.stocks.maconnerie;
                log.stocks.reseau += z.stocks.reseau;
                log.stocks.interieur += z.stocks.interieur;
                log.stocks.fini += z.stocks.fini;
            });

            dailyLogs.push(log);

            if (allComplete) break;
        }

        const globalDuration = Math.max(...zoneStates.map(z => z.duration || day));
        const totalFinished = zoneStates.reduce((acc, z) => acc + z.stocks.fini, 0);

        return {
            duration: globalDuration,
            isComplete: totalFinished >= globalTotal,
            activity: activity,
            dailyLogs: dailyLogs,
            finalStocks: dailyLogs.length > 0 ? dailyLogs[dailyLogs.length - 1].stocks : null,
            zoneStates: zoneStates
        };
    },

    /**
     * Détecte les goulots d'étranglement basés sur les stocks moyens
     */
    detectBottlenecks: function (simulationResult) {
        if (!simulationResult || !simulationResult.dailyLogs) return [];

        let bottlenecks = [];
        const logs = simulationResult.dailyLogs;
        const avgStocks = {
            prep: 0, livraison: 0, maconnerie: 0, reseau: 0, interieur: 0
        };

        // Calculer les stocks moyens
        logs.forEach(log => {
            avgStocks.prep += log.stocks.prep;
            avgStocks.livraison += log.stocks.livraison;
            avgStocks.maconnerie += log.stocks.maconnerie;
            avgStocks.reseau += log.stocks.reseau;
            avgStocks.interieur += log.stocks.interieur;
        });

        const duration = simulationResult.duration;
        for (let key in avgStocks) {
            avgStocks[key] /= duration;
        }

        // Si un stock moyen est élevé, c'est que l'étape SUIVANTE est un goulot
        if (avgStocks.prep > 50) bottlenecks.push({ stage: 'Livraison', reason: 'Accumulation de kits préparés' });
        if (avgStocks.livraison > 50) bottlenecks.push({ stage: 'Maçonnerie', reason: 'Matériel livré en attente de pose' });
        if (avgStocks.maconnerie > 50) bottlenecks.push({ stage: 'Réseau', reason: 'Murs prêts en attente de raccordement' });
        if (avgStocks.reseau > 50) bottlenecks.push({ stage: 'Installation Intérieure', reason: 'Réseau prêt en attente d\'installation' });
        if (avgStocks.interieur > 50) bottlenecks.push({ stage: 'Contrôle', reason: 'Installations finies en attente de validation' });

        return bottlenecks;
    }
};

// Export pour utilisation globale (si pas de module system)
if (typeof window !== 'undefined') {
    window.LegacySimulationEngine = LegacySimulationEngine;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LegacySimulationEngine;
}
