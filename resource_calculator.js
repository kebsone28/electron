/**
 * Calculateur Intelligent de Ressources - Sénégal
 * Gestion optimisée par zones et types de ménages
 */

const ResourceCalculator = {
    PRODUCTIVITY: {
        preparateurs: 8, livraison: 10, macons: 3, reseau: 4,
        interiorType1: 5, interiorType2: 3, controle: 8
    },

    SALARIES_DAILY: {
        preparateurs: 5000, livraison: 6000, macons: 8000, reseau: 10000,
        interiorType1: 9000, interiorType2: 11000, controle: 7000,
        superviseur: 15000, chauffeur: 6000, agentLivraison: 5500
    },

    PAYMENT_PER_TASK: {
        preparateurs: 600, livraison: 800, macons: 2500, reseau: 2000,
        interiorType1: 1500, interiorType2: 2200, controle: 800
    },

    SUBCONTRACTING_MASONRY: {
        model1_standard: {
            name: 'Mur 1,6m avec poteaux + potelet dessus',
            pricePerHouse: 45000
        },
        model2_chimney: {
            name: 'Mur cheminée 1,6m avec potelet dessous',
            pricePerHouse: 48000
        }
    },

    POTELET_COST: { galva4m: 8500 },
    SECONDARY_PANEL_COST: { standard: 12000 },

    LOGISTICS: {
        pmVehicle: { achat: 8000000, locationJour: 25000 },
        controllerVehicle: { achat: 6000000, locationJour: 20000 },
        networkVehicle: { achat: 5000000, locationJour: 18000 },
        deliveryTruck: { achat: 12000000, locationJour: 35000 },
        fuelPerDay: { pmVehicle: 15, controllerVehicle: 12, networkVehicle: 18, deliveryTruck: 25 },
        fuelPricePerLiter: 650
    },

    RATIOS: {
        superviseurPourEquipes: 10,
        chauffeurParCamion: 1,
        agentLivraisonPourMenages: 500,
        interiorType1Share: 0.7
    },

    calculateZoneAllocation: function (zones, targetDuration) {
        const allocation = {
            byZone: [],
            totalTeams: {
                preparateurs: 0, livraison: 0, macons: 0, reseau: 0,
                interiorType1: 0, interiorType2: 0, controle: 0
            }
        };

        zones.forEach(zone => {
            const houses = parseInt(zone.houses) || 0;
            if (houses <= 0) return;

            const type1 = Math.round(houses * this.RATIOS.interiorType1Share);
            const type2 = houses - type1;

            const zoneTeams = {
                zoneName: zone.name,
                houses: houses,
                type1Houses: type1,
                type2Houses: type2,
                teams: {
                    preparateurs: Math.max(1, Math.ceil(houses / (this.PRODUCTIVITY.preparateurs * targetDuration))),
                    livraison: Math.max(1, Math.ceil(houses / (this.PRODUCTIVITY.livraison * targetDuration))),
                    macons: Math.max(1, Math.ceil(houses / (this.PRODUCTIVITY.macons * targetDuration))),
                    reseau: Math.max(1, Math.ceil(houses / (this.PRODUCTIVITY.reseau * targetDuration))),
                    interiorType1: Math.max(1, Math.ceil(type1 / (this.PRODUCTIVITY.interiorType1 * targetDuration))),
                    interiorType2: type2 > 0 ? Math.max(1, Math.ceil(type2 / (this.PRODUCTIVITY.interiorType2 * targetDuration))) : 0,
                    controle: Math.max(1, Math.ceil(houses / (this.PRODUCTIVITY.controle * targetDuration)))
                }
            };

            allocation.byZone.push(zoneTeams);
            allocation.totalTeams.preparateurs += zoneTeams.teams.preparateurs;
            allocation.totalTeams.livraison += zoneTeams.teams.livraison;
            allocation.totalTeams.macons += zoneTeams.teams.macons;
            allocation.totalTeams.reseau += zoneTeams.teams.reseau;
            allocation.totalTeams.interiorType1 += zoneTeams.teams.interiorType1;
            allocation.totalTeams.interiorType2 += zoneTeams.teams.interiorType2;
            allocation.totalTeams.controle += zoneTeams.teams.controle;
        });

        return allocation;
    },

    calculateAuto: function (totalHouses, targetDuration, paymentModes, masonryModel, type1Houses, type2Houses, zones) {
        targetDuration = targetDuration || 180;
        paymentModes = paymentModes || {};
        masonryModel = masonryModel || 'model1_standard';

        // VALIDATION : Zones obligatoires
        if (!zones || !Array.isArray(zones) || zones.length === 0) {
            return {
                error: true,
                message: '⚠️ Configuration optimisée impossible',
                details: 'Veuillez d\'abord créer des zones et renseigner le nombre de ménages par zone.',
                action: 'Allez dans la section "Gestion des Zones" pour créer vos zones.'
            };
        }

        if (!totalHouses || totalHouses <= 0) return this.getEmptyConfig();

        const config = {};
        config.paymentModes = {
            preparateurs: paymentModes.preparateurs || 'daily',
            livraison: paymentModes.livraison || 'daily',
            macons: paymentModes.macons || 'daily',
            reseau: paymentModes.reseau || 'daily',
            interiorType1: paymentModes.interiorType1 || 'daily',
            interiorType2: paymentModes.interiorType2 || 'daily',
            controle: paymentModes.controle || 'daily'
        };
        config.masonryModel = masonryModel;

        if (type1Houses !== null && type2Houses !== null) {
            config.type1Houses = parseInt(type1Houses) || 0;
            config.type2Houses = parseInt(type2Houses) || 0;
        } else {
            config.type1Houses = Math.round(totalHouses * this.RATIOS.interiorType1Share);
            config.type2Houses = totalHouses - config.type1Houses;
        }

        config.zones = zones;
        config.zoneAllocation = this.calculateZoneAllocation(zones, targetDuration);
        config.prepTeams = config.zoneAllocation.totalTeams.preparateurs;
        config.deliveryTeams = config.zoneAllocation.totalTeams.livraison;
        config.masonTeams = config.zoneAllocation.totalTeams.macons;
        config.networkElectricianTeams = config.zoneAllocation.totalTeams.reseau;
        config.interiorElectricianType1Teams = config.zoneAllocation.totalTeams.interiorType1;
        config.interiorElectricianType2Teams = config.zoneAllocation.totalTeams.interiorType2;
        config.controllerTeams = config.zoneAllocation.totalTeams.controle;

        config.prepRate = this.PRODUCTIVITY.preparateurs;
        config.deliveryRate = this.PRODUCTIVITY.livraison;
        config.masonRate = this.PRODUCTIVITY.macons;
        config.networkRate = this.PRODUCTIVITY.reseau;
        config.interiorRateType1 = this.PRODUCTIVITY.interiorType1;
        config.interiorRateType2 = this.PRODUCTIVITY.interiorType2;
        config.interiorType1SharePercent = totalHouses > 0 ? Math.round((config.type1Houses / totalHouses) * 100) : 0;
        config.controlRate = this.PRODUCTIVITY.controle;

        const totalTeams = config.prepTeams + config.deliveryTeams + config.masonTeams +
            config.networkElectricianTeams + config.interiorElectricianType1Teams +
            config.interiorElectricianType2Teams + config.controllerTeams;
        config.supervisorCount = Math.max(1, Math.ceil(totalTeams / this.RATIOS.superviseurPourEquipes));
        config.deliveryAgentCount = Math.max(1, Math.ceil(totalHouses / this.RATIOS.agentLivraisonPourMenages));
        config.driverCount = config.deliveryTeams;

        config.pmVehicleCount = 1;
        config.pmVehicleAcquisition = 'location';
        config.pmVehiclePurchaseCost = this.LOGISTICS.pmVehicle.achat;
        config.pmVehicleRentPerDay = this.LOGISTICS.pmVehicle.locationJour;
        config.controllerVehicleCount = Math.max(1, Math.ceil(config.controllerTeams / 2));
        config.controllerVehicleAcquisition = 'location';
        config.controllerVehiclePurchaseCost = this.LOGISTICS.controllerVehicle.achat;
        config.controllerVehicleRentPerDay = this.LOGISTICS.controllerVehicle.locationJour;
        config.networkInstallerVehicleCount = config.networkElectricianTeams;
        config.networkInstallerVehicleAcquisition = 'location';
        config.networkInstallerVehiclePurchaseCost = this.LOGISTICS.networkVehicle.achat;
        config.networkInstallerVehicleRentPerDay = this.LOGISTICS.networkVehicle.locationJour;
        config.deliveryTruckCount = config.deliveryTeams;
        config.deliveryTruckAcquisition = 'location';
        config.deliveryTruckPurchaseCost = this.LOGISTICS.deliveryTruck.achat;
        config.deliveryTruckRentPerDay = this.LOGISTICS.deliveryTruck.locationJour;

        config.truckCapacity = 50;
        config.deliveryDelay = 1;
        config.resourceAvailability = 95;
        config.automationLevel = 50;
        config.averageDistance = 15;
        config.unforeseenRate = 10;
        config.dailyTeamCost = this.calculateDailyTeamCost(config);
        config.estimatedCosts = this.calculateCosts(config, targetDuration, totalHouses);

        return config;
    },

    calculateDailyTeamCost: function (config) {
        const modes = config.paymentModes || {};
        let totalSalary = 0;
        if (modes.preparateurs === 'daily') totalSalary += (config.prepTeams || 0) * this.SALARIES_DAILY.preparateurs;
        if (modes.livraison === 'daily') totalSalary += (config.deliveryTeams || 0) * this.SALARIES_DAILY.livraison;
        if (modes.macons === 'daily') totalSalary += (config.masonTeams || 0) * this.SALARIES_DAILY.macons;
        if (modes.reseau === 'daily') totalSalary += (config.networkElectricianTeams || 0) * this.SALARIES_DAILY.reseau;
        if (modes.interiorType1 === 'daily') totalSalary += (config.interiorElectricianType1Teams || 0) * this.SALARIES_DAILY.interiorType1;
        if (modes.interiorType2 === 'daily') totalSalary += (config.interiorElectricianType2Teams || 0) * this.SALARIES_DAILY.interiorType2;
        if (modes.controle === 'daily') totalSalary += (config.controllerTeams || 0) * this.SALARIES_DAILY.controle;
        totalSalary += (config.supervisorCount || 0) * this.SALARIES_DAILY.superviseur;
        totalSalary += (config.driverCount || 0) * this.SALARIES_DAILY.chauffeur;
        totalSalary += (config.deliveryAgentCount || 0) * this.SALARIES_DAILY.agentLivraison;
        const totalTeams = (config.prepTeams || 0) + (config.deliveryTeams || 0) + (config.masonTeams || 0) +
            (config.networkElectricianTeams || 0) + (config.interiorElectricianType1Teams || 0) +
            (config.interiorElectricianType2Teams || 0) + (config.controllerTeams || 0);
        return totalTeams > 0 ? Math.round(totalSalary / totalTeams) : 0;
    },

    calculateCosts: function (config, duration, totalHouses) {
        const costs = {};
        const modes = config.paymentModes || {};
        costs.labor = {};

        costs.labor.preparateurs = modes.preparateurs === 'per-task'
            ? totalHouses * this.PAYMENT_PER_TASK.preparateurs
            : (config.prepTeams || 0) * this.SALARIES_DAILY.preparateurs * duration;

        costs.labor.livraison = modes.livraison === 'per-task'
            ? totalHouses * this.PAYMENT_PER_TASK.livraison
            : (config.deliveryTeams || 0) * this.SALARIES_DAILY.livraison * duration;

        if (modes.macons === 'subcontract') {
            const model = this.SUBCONTRACTING_MASONRY[config.masonryModel] || this.SUBCONTRACTING_MASONRY.model1_standard;
            costs.labor.macons = totalHouses * model.pricePerHouse;
            costs.materials = { potelets: totalHouses * this.POTELET_COST.galva4m };
        } else if (modes.macons === 'per-task') {
            costs.labor.macons = totalHouses * this.PAYMENT_PER_TASK.macons;
            costs.materials = { potelets: totalHouses * this.POTELET_COST.galva4m };
        } else {
            costs.labor.macons = (config.masonTeams || 0) * this.SALARIES_DAILY.macons * duration;
            costs.materials = { potelets: totalHouses * this.POTELET_COST.galva4m };
        }

        costs.labor.reseau = modes.reseau === 'per-task'
            ? totalHouses * this.PAYMENT_PER_TASK.reseau
            : (config.networkElectricianTeams || 0) * this.SALARIES_DAILY.reseau * duration;

        const type1Houses = config.type1Houses || Math.round(totalHouses * this.RATIOS.interiorType1Share);
        const type2Houses = config.type2Houses || (totalHouses - type1Houses);

        costs.labor.interiorType1 = modes.interiorType1 === 'per-task'
            ? type1Houses * this.PAYMENT_PER_TASK.interiorType1
            : (config.interiorElectricianType1Teams || 0) * this.SALARIES_DAILY.interiorType1 * duration;
        costs.labor.interiorType2 = modes.interiorType2 === 'per-task'
            ? type2Houses * this.PAYMENT_PER_TASK.interiorType2
            : (config.interiorElectricianType2Teams || 0) * this.SALARIES_DAILY.interiorType2 * duration;

        if (!costs.materials) costs.materials = {};
        costs.materials.coffrets = type1Houses * this.SECONDARY_PANEL_COST.standard;

        costs.labor.controle = modes.controle === 'per-task'
            ? totalHouses * this.PAYMENT_PER_TASK.controle
            : (config.controllerTeams || 0) * this.SALARIES_DAILY.controle * duration;

        costs.labor.superviseurs = (config.supervisorCount || 0) * this.SALARIES_DAILY.superviseur * duration;
        costs.labor.chauffeurs = (config.driverCount || 0) * this.SALARIES_DAILY.chauffeur * duration;
        costs.labor.agentsLivraison = (config.deliveryAgentCount || 0) * this.SALARIES_DAILY.agentLivraison * duration;

        costs.laborTotal = Object.values(costs.labor).reduce((sum, val) => sum + val, 0);

        costs.logistics = {};
        costs.logistics.pmVehicles = config.pmVehicleAcquisition === 'achat'
            ? config.pmVehicleCount * this.LOGISTICS.pmVehicle.achat
            : config.pmVehicleCount * this.LOGISTICS.pmVehicle.locationJour * duration;
        costs.logistics.controllerVehicles = config.controllerVehicleAcquisition === 'achat'
            ? config.controllerVehicleCount * this.LOGISTICS.controllerVehicle.achat
            : config.controllerVehicleCount * this.LOGISTICS.controllerVehicle.locationJour * duration;
        costs.logistics.networkVehicles = config.networkInstallerVehicleAcquisition === 'achat'
            ? config.networkInstallerVehicleCount * this.LOGISTICS.networkVehicle.achat
            : config.networkInstallerVehicleCount * this.LOGISTICS.networkVehicle.locationJour * duration;
        costs.logistics.deliveryTrucks = config.deliveryTruckAcquisition === 'achat'
            ? config.deliveryTruckCount * this.LOGISTICS.deliveryTruck.achat
            : config.deliveryTruckCount * this.LOGISTICS.deliveryTruck.locationJour * duration;
        costs.logistics.fuel = (
            config.pmVehicleCount * this.LOGISTICS.fuelPerDay.pmVehicle +
            config.controllerVehicleCount * this.LOGISTICS.fuelPerDay.controllerVehicle +
            config.networkInstallerVehicleCount * this.LOGISTICS.fuelPerDay.networkVehicle +
            config.deliveryTruckCount * this.LOGISTICS.fuelPerDay.deliveryTruck
        ) * this.LOGISTICS.fuelPricePerLiter * duration;

        costs.logisticsTotal = Object.values(costs.logistics).reduce((sum, val) => sum + val, 0);
        costs.materialsTotal = costs.materials ? Object.values(costs.materials).reduce((sum, val) => sum + val, 0) : 0;
        costs.total = costs.laborTotal + costs.logisticsTotal + costs.materialsTotal;
        costs.costPerHouse = totalHouses > 0 ? Math.round(costs.total / totalHouses) : 0;

        return costs;
    },

    getEmptyConfig: function () {
        return {
            prepTeams: 0, deliveryTeams: 0, masonTeams: 0, networkElectricianTeams: 0,
            interiorElectricianType1Teams: 0, interiorElectricianType2Teams: 0, controllerTeams: 0,
            prepRate: 0, deliveryRate: 0, masonRate: 0, networkRate: 0,
            interiorRateType1: 0, interiorRateType2: 0, controlRate: 0,
            supervisorCount: 0, deliveryAgentCount: 0, driverCount: 0,
            pmVehicleCount: 0, controllerVehicleCount: 0, networkInstallerVehicleCount: 0, deliveryTruckCount: 0,
            pmVehicleAcquisition: 'location', controllerVehicleAcquisition: 'location',
            networkInstallerVehicleAcquisition: 'location', deliveryTruckAcquisition: 'location',
            pmVehiclePurchaseCost: 0, pmVehicleRentPerDay: 0,
            controllerVehiclePurchaseCost: 0, controllerVehicleRentPerDay: 0,
            networkInstallerVehiclePurchaseCost: 0, networkInstallerVehicleRentPerDay: 0,
            deliveryTruckPurchaseCost: 0, deliveryTruckRentPerDay: 0,
            truckCapacity: 0, deliveryDelay: 0, resourceAvailability: 0,
            automationLevel: 0, averageDistance: 0, unforeseenRate: 0, dailyTeamCost: 0,
            interiorType1SharePercent: 70, masonryModel: 'model1_standard',
            type1Houses: 0, type2Houses: 0, zones: null, zoneAllocation: null,
            paymentModes: {
                preparateurs: 'daily', livraison: 'daily', macons: 'daily',
                reseau: 'daily', interiorType1: 'daily', interiorType2: 'daily', controle: 'daily'
            }
        };
    }
};

if (typeof window !== 'undefined') window.ResourceCalculator = ResourceCalculator;
if (typeof module !== 'undefined' && module.exports) module.exports = ResourceCalculator;
