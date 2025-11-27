/**
 * Service de domaine pour le calcul des coûts
 * Gère la logique complexe de calcul des coûts du projet
 */
class CostCalculationService {
    constructor(pricingConfig = null) {
        this.pricing = pricingConfig || DEFAULT_COSTS;
    }

    /**
     * Calcule le coût total d'un projet
     */
    calculateProjectCost(project, duration) {
        if (!(project instanceof Project)) {
            throw new ValidationError('Parameter must be a Project instance');
        }

        let totalCost = Cost.zero();

        // Coûts de main d'œuvre
        const laborCost = this.calculateLaborCost(project.getAllTeams(), duration);
        totalCost = totalCost.add(laborCost);

        // Coûts de matériaux
        const materialCost = this.calculateMaterialCost(project.totalHouses);
        totalCost = totalCost.add(materialCost);

        // Coûts logistiques
        const logisticsCost = this.calculateLogisticsCost(project.zones, duration);
        totalCost = totalCost.add(logisticsCost);

        // Coûts de supervision
        const supervisionCost = this.calculateSupervisionCost(project.getAllTeams(), duration);
        totalCost = totalCost.add(supervisionCost);

        return {
            total: totalCost,
            breakdown: {
                labor: laborCost,
                materials: materialCost,
                logistics: logisticsCost,
                supervision: supervisionCost
            }
        };
    }

    /**
     * Calcule le coût de la main d'œuvre
     */
    calculateLaborCost(teams, duration) {
        let cost = Cost.zero();

        for (const team of teams) {
            const teamCost = this.calculateTeamCost(team, duration);
            cost = cost.add(teamCost);
        }

        return cost;
    }

    /**
     * Calcule le coût d'une équipe
     */
    calculateTeamCost(team, duration) {
        const dailyRate = this.getDailyRateForTeam(team.type);
        const totalDays = duration;
        const memberCount = team.members.length || 1;

        return new Cost(dailyRate * totalDays * memberCount);
    }

    /**
     * Obtient le taux journalier pour un type d'équipe
     */
    getDailyRateForTeam(teamType) {
        const rateMap = {
            [TeamType.PREPARATEURS]: this.pricing.DAILY_RATES.preparateur,
            [TeamType.LIVRAISON]: this.pricing.DAILY_RATES.livreur,
            [TeamType.MACONS]: this.pricing.DAILY_RATES.macon,
            [TeamType.RESEAU]: this.pricing.DAILY_RATES.reseau,
            [TeamType.INTERIEUR_TYPE1]: this.pricing.DAILY_RATES.interieur_type1,
            [TeamType.INTERIEUR_TYPE2]: this.pricing.DAILY_RATES.interieur_type2,
            [TeamType.CONTROLE]: this.pricing.DAILY_RATES.controleur
        };

        return rateMap[teamType] || 0;
    }

    /**
     * Calcule le coût des matériaux
     */
    calculateMaterialCost(totalHouses) {
        // Coût moyen par ménage (kits, câbles, poteaux, etc.)
        const costPerHouse = 150000; // 150,000 FCFA par ménage
        return new Cost(costPerHouse * totalHouses);
    }

    /**
     * Calcule les coûts logistiques
     */
    calculateLogisticsCost(zones, duration) {
        let cost = Cost.zero();

        // Coût des véhicules
        const vehicleCost = this.calculateVehicleCost(zones.length, duration);
        cost = cost.add(vehicleCost);

        // Coût du carburant
        const fuelCost = this.calculateFuelCost(zones, duration);
        cost = cost.add(fuelCost);

        return cost;
    }

    /**
     * Calcule le coût des véhicules
     */
    calculateVehicleCost(zoneCount, duration) {
        // Estimation : 1 véhicule par zone
        const vehiclesNeeded = zoneCount;
        const dailyRentCost = this.pricing.VEHICLES.delivery_rent_per_day;

        return new Cost(vehiclesNeeded * dailyRentCost * duration);
    }

    /**
     * Calcule le coût du carburant
     */
    calculateFuelCost(zones, duration) {
        // Estimation : 20 litres par jour par zone
        const litersPerDayPerZone = 20;
        const totalLiters = zones.length * litersPerDayPerZone * duration;

        return new Cost(totalLiters * this.pricing.FUEL_PER_LITER);
    }

    /**
     * Calcule les coûts de supervision
     */
    calculateSupervisionCost(teams, duration) {
        // 1 superviseur pour 10 équipes
        const supervisorsNeeded = Math.ceil(teams.length / CALCULATION_RATIOS.SUPERVISOR_PER_TEAMS);
        const dailyRate = this.pricing.DAILY_RATES.superviseur;

        return new Cost(supervisorsNeeded * dailyRate * duration);
    }

    /**
     * Calcule le coût par ménage
     */
    calculateCostPerHouse(totalCost, totalHouses) {
        if (totalHouses === 0) {
            return Cost.zero();
        }
        return totalCost.divide(totalHouses);
    }

    /**
     * Estime le budget nécessaire pour un projet
     */
    estimateBudget(totalHouses, targetDuration, zones) {
        // Créer un projet temporaire pour l'estimation
        const tempProject = new Project(
            'temp',
            'Estimation',
            totalHouses,
            new Date()
        );

        // Ajouter des zones
        for (const zoneData of zones) {
            const zone = new Zone(
                `zone-${zoneData.name}`,
                zoneData.name,
                zoneData.houses
            );
            tempProject.addZone(zone);
        }

        // Calculer le coût
        const costBreakdown = this.calculateProjectCost(tempProject, targetDuration);

        // Ajouter une marge de sécurité de 10%
        const margin = costBreakdown.total.multiply(0.1);
        const estimatedBudget = costBreakdown.total.add(margin);

        return {
            estimated: estimatedBudget,
            breakdown: costBreakdown.breakdown,
            margin,
            costPerHouse: this.calculateCostPerHouse(estimatedBudget, totalHouses)
        };
    }

    /**
     * Compare deux scénarios de coûts
     */
    compareScenarios(scenario1, scenario2) {
        const diff = scenario1.total.amount - scenario2.total.amount;
        const percentDiff = (diff / scenario2.total.amount) * 100;

        return {
            difference: new Cost(Math.abs(diff)),
            percentDifference: percentDiff,
            cheaper: diff < 0 ? 'scenario1' : 'scenario2',
            recommendation: this.getRecommendation(scenario1, scenario2)
        };
    }

    /**
     * Obtient une recommandation basée sur les scénarios
     */
    getRecommendation(scenario1, scenario2) {
        const diff = scenario1.total.amount - scenario2.total.amount;

        if (Math.abs(diff) < scenario2.total.amount * 0.05) {
            return 'Les deux scénarios sont équivalents en termes de coût';
        } else if (diff < 0) {
            return 'Le scénario 1 est plus économique';
        } else {
            return 'Le scénario 2 est plus économique';
        }
    }
}

// Export pour utilisation globale
if (typeof window !== 'undefined') {
    window.CostCalculationService = CostCalculationService;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CostCalculationService;
}
