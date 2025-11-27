/**
 * Service de domaine pour l'allocation des ressources
 * Gère la logique complexe d'assignation des équipes aux zones
 */
class ResourceAllocationService {
    constructor(optimizationStrategy = null) {
        this.strategy = optimizationStrategy || new BalancedAllocationStrategy();
    }

    /**
     * Alloue les équipes aux zones d'un projet
     */
    allocateTeamsToZones(project, availableTeams, constraints = {}) {
        if (!(project instanceof Project)) {
            throw new ValidationError('Parameter must be a Project instance');
        }

        // Valider les contraintes
        this.validateConstraints(constraints);

        // Utiliser la stratégie d'optimisation
        const allocation = this.strategy.optimize(
            project.zones,
            availableTeams,
            constraints
        );

        // Valider l'allocation
        this.validateAllocation(allocation, constraints);

        return allocation;
    }

    /**
     * Calcule le nombre d'équipes nécessaires par type
     */
    calculateRequiredTeams(zone, targetDuration, productivityRates) {
        const required = {};

        for (const [teamType, rate] of Object.entries(productivityRates)) {
            const teamsNeeded = rate.calculateRequiredTeams(
                zone.totalHouses,
                targetDuration
            );
            required[teamType] = Math.ceil(teamsNeeded);
        }

        return required;
    }

    /**
     * Équilibre la charge de travail entre les zones
     */
    balanceWorkload(zones, teams) {
        // Calculer la charge de travail par zone
        const workload = zones.map(zone => ({
            zone,
            houses: zone.totalHouses,
            teams: zone.getTotalTeamCount(),
            ratio: zone.totalHouses / Math.max(zone.getTotalTeamCount(), 1)
        }));

        // Trier par ratio (zones avec le plus de travail par équipe)
        workload.sort((a, b) => b.ratio - a.ratio);

        // Réallouer les équipes disponibles
        const reallocation = [];
        for (const item of workload) {
            if (item.ratio > 100) { // Seuil de surcharge
                const additionalTeamsNeeded = Math.ceil(item.houses / 100) - item.teams;
                if (additionalTeamsNeeded > 0) {
                    reallocation.push({
                        zone: item.zone,
                        additionalTeams: additionalTeamsNeeded,
                        reason: 'Workload balancing'
                    });
                }
            }
        }

        return reallocation;
    }

    /**
     * Valide les contraintes
     */
    validateConstraints(constraints) {
        if (constraints.maxBudget && !(constraints.maxBudget instanceof Cost)) {
            throw new ValidationError('maxBudget must be a Cost instance');
        }

        if (constraints.maxDuration && constraints.maxDuration <= 0) {
            throw new ValidationError('maxDuration must be positive');
        }

        if (constraints.maxTeamSize && constraints.maxTeamSize <= 0) {
            throw new ValidationError('maxTeamSize must be positive');
        }
    }

    /**
     * Valide une allocation
     */
    validateAllocation(allocation, constraints) {
        for (const [zone, teams] of allocation.entries()) {
            // Vérifier qu'il y a au moins une équipe de chaque type requis
            const teamTypes = new Set(teams.map(t => t.type));
            const requiredTypes = [
                TeamType.PREPARATEURS,
                TeamType.LIVRAISON,
                TeamType.MACONS,
                TeamType.RESEAU,
                TeamType.INTERIEUR_TYPE1,
                TeamType.CONTROLE
            ];

            for (const requiredType of requiredTypes) {
                if (!teamTypes.has(requiredType)) {
                    throw new ConstraintViolationError(
                        `Zone ${zone.name} is missing required team type: ${requiredType}`
                    );
                }
            }

            // Vérifier la taille maximale des équipes
            if (constraints.maxTeamSize && teams.length > constraints.maxTeamSize) {
                throw new ConstraintViolationError(
                    `Zone ${zone.name} exceeds maximum team size: ${teams.length} > ${constraints.maxTeamSize}`
                );
            }
        }
    }

    /**
     * Optimise l'allocation pour minimiser la durée
     */
    optimizeForDuration(zones, availableTeams, targetDuration) {
        const allocation = new Map();

        for (const zone of zones) {
            const zoneTeams = [];

            // Pour chaque type d'équipe
            for (const teamType of Object.values(TeamType)) {
                const rate = ProductivityRate.fromDefaults(teamType);
                const requiredTeams = rate.calculateRequiredTeams(
                    zone.totalHouses,
                    targetDuration
                );

                // Assigner les équipes disponibles
                const teamsOfType = availableTeams.filter(t =>
                    t.type === teamType && !t.zone
                );

                const teamsToAssign = teamsOfType.slice(0, Math.ceil(requiredTeams));
                zoneTeams.push(...teamsToAssign);
            }

            allocation.set(zone, zoneTeams);
        }

        return allocation;
    }

    /**
     * Optimise l'allocation pour minimiser le coût
     */
    optimizeForCost(zones, availableTeams, maxBudget) {
        const allocation = new Map();
        let remainingBudget = maxBudget;

        // Trier les zones par priorité (plus de ménages = plus prioritaire)
        const sortedZones = [...zones].sort((a, b) => b.totalHouses - a.totalHouses);

        for (const zone of sortedZones) {
            const zoneTeams = [];

            // Assigner le minimum d'équipes nécessaires
            for (const teamType of Object.values(TeamType)) {
                const teamsOfType = availableTeams.filter(t =>
                    t.type === teamType && !t.zone
                );

                if (teamsOfType.length > 0) {
                    // Prendre une seule équipe de chaque type
                    zoneTeams.push(teamsOfType[0]);
                }
            }

            allocation.set(zone, zoneTeams);
        }

        return allocation;
    }
}

/**
 * Stratégie d'allocation équilibrée
 */
class BalancedAllocationStrategy {
    optimize(zones, availableTeams, constraints) {
        const allocation = new Map();

        // Calculer le ratio ménages/équipe cible
        const totalHouses = zones.reduce((sum, z) => sum + z.totalHouses, 0);
        const targetRatio = totalHouses / availableTeams.length;

        for (const zone of zones) {
            const targetTeamCount = Math.ceil(zone.totalHouses / targetRatio);
            const zoneTeams = [];

            // Distribuer les équipes par type
            for (const teamType of Object.values(TeamType)) {
                const teamsOfType = availableTeams.filter(t =>
                    t.type === teamType && !zoneTeams.includes(t)
                );

                const teamsNeeded = Math.max(1, Math.floor(targetTeamCount / 7)); // 7 types
                const teamsToAssign = teamsOfType.slice(0, teamsNeeded);
                zoneTeams.push(...teamsToAssign);
            }

            allocation.set(zone, zoneTeams);
        }

        return allocation;
    }
}

// Export pour utilisation globale
if (typeof window !== 'undefined') {
    window.ResourceAllocationService = ResourceAllocationService;
    window.BalancedAllocationStrategy = BalancedAllocationStrategy;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ResourceAllocationService, BalancedAllocationStrategy };
}
