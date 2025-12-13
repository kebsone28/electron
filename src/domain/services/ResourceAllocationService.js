/**
 * Service d'allocation des ressources
 * Gère l'affectation des équipes aux zones
 */

// Imports dynamiques pour compatibilité
let _TeamType, _ProductivityRate, _ValidationError, _ConstraintViolationError;

try {
    if (typeof module !== 'undefined' && module.exports) {
        const enums = require('../../shared/constants/enums');
        _TeamType = enums.TeamType;
        _ProductivityRate = require('../value-objects/ProductivityRate');
        const errors = require('../../shared/errors/DomainErrors');
        _ValidationError = errors.ValidationError;
        _ConstraintViolationError = errors.ConstraintViolationError;
    }
} catch (e) {
    // ignore
}

if (!_TeamType && typeof window !== 'undefined') {
    _TeamType = window.TeamType;
}
if (!_ProductivityRate && typeof window !== 'undefined') {
    _ProductivityRate = window.ProductivityRate;
}
if (!_ValidationError && typeof window !== 'undefined') {
    _ValidationError = window.ValidationError;
}
if (!_ConstraintViolationError && typeof window !== 'undefined') {
    _ConstraintViolationError = window.ConstraintViolationError;
}

const TeamTypeLocal = _TeamType;
const ProductivityRateLocal = _ProductivityRate?.default || _ProductivityRate?.ProductivityRate || _ProductivityRate;
const ValidationErrorLocal = _ValidationError;
const ConstraintViolationErrorLocal = _ConstraintViolationError;

    class ResourceAllocationService {
        /**
         * Calcule l'allocation optimale des ressources
         */
        calculateAllocation(project, availableTeams, constraints = {}) {
            if (!project || !availableTeams) {
                throw new (ValidationErrorLocal || Error)('Project and teams are required');
            }

            this.validateConstraints(constraints);

            if (constraints.strategy === 'cost') {
                return this.optimizeForCost(project.zones, availableTeams, constraints.budget);
            } else if (constraints.strategy === 'balanced') {
                return new BalancedAllocationStrategy().optimize(project.zones, availableTeams, constraints);
            } else {
                return this.optimizeForDuration(project.zones, availableTeams, constraints.targetDuration || 90);
            }
        }

        /**
         * Calcule le nombre d'équipes requises pour une zone
         * @param {Zone} zone - La zone à traiter
         * @param {number} duration - Durée cible en jours
         * @param {Object} productivityRates - Taux de productivité par type d'équipe
         * @returns {Object} Nombre d'équipes par type
         */
        calculateRequiredTeams(zone, duration, productivityRates) {
            const required = {};
            const TT = TeamTypeLocal || window.TeamType;

            if (!TT || !productivityRates) {
                console.warn('TeamType or productivityRates not available');
                return required;
            }

            // Pour chaque type d'équipe, calculer le nombre nécessaire
            for (const teamType of Object.values(TT)) {
                const rate = productivityRates[teamType];
                if (rate && typeof rate.calculateRequiredTeams === 'function') {
                    const houses = zone.totalHouses || zone.houses || 0;
                    required[teamType] = Math.ceil(rate.calculateRequiredTeams(houses, duration));
                } else {
                    // Fallback: 1 équipe par défaut
                    required[teamType] = 1;
                }
            }

            return required;
        }

        /**
         * Valide les contraintes
         */
        validateConstraints(constraints) {
            if (constraints.budget && constraints.budget < 0) {
                throw new (ValidationErrorLocal || Error)('Budget must be positive');
            }
            if (constraints.targetDuration && constraints.targetDuration <= 0) {
                throw new (ValidationErrorLocal || Error)('Target duration must be positive');
            }
            if (constraints.maxTeamSize && constraints.maxTeamSize <= 0) {
                throw new (ValidationErrorLocal || Error)('maxTeamSize must be positive');
            }
        }

        /**
         * Valide une allocation
         */
        validateAllocation(allocation, constraints) {
            for (const [zone, teams] of allocation.entries()) {
                // Vérifier qu'il y a au moins une équipe de chaque type requis
                const teamTypes = new Set(teams.map(t => t.type));
                const TT = TeamTypeLocal || window.TeamType;

                if (TT) {
                    const requiredTypes = [
                        TT.PREPARATEURS,
                        TT.LIVRAISON,
                        TT.MACONS,
                        TT.RESEAU,
                        TT.INTERIEUR_TYPE1,
                        TT.CONTROLE
                    ];

                    for (const requiredType of requiredTypes) {
                        if (!teamTypes.has(requiredType)) {
                            throw new (ConstraintViolationErrorLocal || Error)(
                                `Zone ${zone.name} is missing required team type: ${requiredType}`
                            );
                        }
                    }
                }

                // Vérifier la taille maximale des équipes
                if (constraints.maxTeamSize && teams.length > constraints.maxTeamSize) {
                    throw new (ConstraintViolationErrorLocal || Error)(
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
                const TT = TeamTypeLocal || window.TeamType;
                if (TT) {
                    for (const teamType of Object.values(TT)) {
                        const PR = ProductivityRateLocal || window.ProductivityRate;
                        const rate = PR.fromDefaults(teamType);
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
                }

                allocation.set(zone, zoneTeams);
            }

            return allocation;
        }

        /**
         * Équilibre la charge de travail entre les équipes
         * @param {Zone[]} zones - Les zones à analyser
         * @param {Team[]} teams - Les équipes disponibles
         * @returns {Object[]} Suggestions de réallocation
         */
        balanceWorkload(zones, teams) {
            const suggestions = [];
            const TT = TeamTypeLocal || window.TeamType;

            if (!TT) {
                console.warn('TeamType not available for balanceWorkload');
                return suggestions;
            }

            // Calculer la charge actuelle par équipe en jours (workload = jours estimés)
            const teamWorkloads = new Map();
            for (const team of teams) {
                const assignedZones = zones.filter(z => z.teams && z.teams.has(team.type));
                const totalHouses = assignedZones.reduce((sum, z) => sum + (z.totalHouses || 0), 0);

                let housesPerDay = 50; // fallback
                try {
                    const PR = ProductivityRateLocal || window.ProductivityRate;
                    if (PR && typeof PR.fromDefaults === 'function') {
                        housesPerDay = PR.fromDefaults(team.type).housesPerDay;
                    }
                } catch (e) {
                    // keep fallback
                }

                const requiredDays = housesPerDay > 0 ? (totalHouses / housesPerDay) : Infinity;
                teamWorkloads.set(team, { houses: totalHouses, days: requiredDays, housesPerDay });
            }

            // Calculer la moyenne en jours
            const totalWorkloadDays = Array.from(teamWorkloads.values()).reduce((sum, w) => sum + w.days, 0);
            const averageWorkload = totalWorkloadDays / Math.max(1, teamWorkloads.size);

            // Identifier les équipes surchargées et sous-chargées
            const overloadedTeams = [];
            const underloadedTeams = [];

            for (const [team, info] of teamWorkloads) {
                const ratio = info.days / Math.max(1, averageWorkload);
                // mark overloaded if clearly above average OR if single-team required duration is excessively long
                if (ratio > 1.2 || info.days > 100) {
                    overloadedTeams.push({ team, workload: info.houses, days: info.days, housesPerDay: info.housesPerDay, ratio });
                } else if (ratio < 0.8) {
                    underloadedTeams.push({ team, workload: info.houses, days: info.days, housesPerDay: info.housesPerDay, ratio });
                }
            }

            // Générer des suggestions de réallocation
            for (const overloaded of overloadedTeams) {
                if (underloadedTeams.length > 0) {
                    for (const underloaded of underloadedTeams) {
                        if (overloaded.team.type === underloaded.team.type) {
                            const daysDiff = Math.max(0, overloaded.days - underloaded.days);
                            const additionalTeams = Math.max(1, Math.ceil(daysDiff / 30));
                            suggestions.push({
                                overloadedTeam: overloaded.team,
                                underloadedTeam: underloaded.team,
                                additionalTeams,
                                reason: `Workload imbalance: ${overloaded.days.toFixed(1)}d vs ${underloaded.days.toFixed(1)}d`
                            });
                        }
                    }
                } else {
                    // No underloaded teams to pair with; suggest adding teams to reduce duration
                    const additionalTeams = Math.max(1, Math.ceil(overloaded.days / 30));
                    suggestions.push({
                        overloadedTeam: overloaded.team,
                        additionalTeams,
                        reason: `Team requires ~${overloaded.days.toFixed(1)} days`,
                    });
                }
            }

            return suggestions;
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
                const TT = TeamTypeLocal || window.TeamType;
                if (TT) {
                    for (const teamType of Object.values(TT)) {
                        const teamsOfType = availableTeams.filter(t =>
                            t.type === teamType && !t.zone
                        );

                        if (teamsOfType.length > 0) {
                            // Prendre une seule équipe de chaque type
                            zoneTeams.push(teamsOfType[0]);
                        }
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
            const targetRatio = totalHouses / Math.max(1, availableTeams.length);

            for (const zone of zones) {
                const targetTeamCount = Math.ceil(zone.totalHouses / targetRatio);
                const zoneTeams = [];

                // Distribuer les équipes par type
                const TT = TeamTypeLocal || window.TeamType;
                if (TT) {
                    for (const teamType of Object.values(TT)) {
                        const teamsOfType = availableTeams.filter(t =>
                            t.type === teamType && !zoneTeams.includes(t)
                        );

                        const teamsNeeded = Math.max(1, Math.floor(targetTeamCount / 7)); // 7 types
                        const teamsToAssign = teamsOfType.slice(0, teamsNeeded);
                        zoneTeams.push(...teamsToAssign);
                    }
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

    // Export ES6 pour les tests
    if (typeof globalThis !== 'undefined') {
        globalThis.ResourceAllocationService = ResourceAllocationService;
        globalThis.BalancedAllocationStrategy = BalancedAllocationStrategy;
    }

    // Export ES6
    export { ResourceAllocationService, BalancedAllocationStrategy };
