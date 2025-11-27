import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

let SimulationEngine;
let Zone;
let Team;
let Project;
let ProductivityRate;
let TeamType;

describe('SimulationEngine (unit)', () => {
    let engine;

    beforeEach(async () => {
        // ensure domain primitives and dependencies are available globally
        const E = await import('../../src/domain/entities/Entity.js');
        global.Entity = E.default || E.Entity || E;

        const PR = await import('../../src/domain/value-objects/ProductivityRate.js');
        ProductivityRate = PR.default || PR.ProductivityRate || PR;
        global.ProductivityRate = ProductivityRate;

        const enums = await import('../../src/shared/constants/enums.js');
        TeamType = enums.TeamType || (enums.default && enums.default.TeamType);
        global.TeamType = TeamType;
        // attach DEFAULT_PRODUCTIVITY and other constants used by value objects
        global.DEFAULT_PRODUCTIVITY = enums.DEFAULT_PRODUCTIVITY || (enums.default && enums.default.DEFAULT_PRODUCTIVITY);
        // make ProjectStatus available for Project entity
        global.ProjectStatus = enums.ProjectStatus || (enums.default && enums.default.ProjectStatus);
        // attach DEFAULT_PRODUCTIVITY and other constants used by value objects
        global.DEFAULT_PRODUCTIVITY = enums.DEFAULT_PRODUCTIVITY || (enums.default && enums.default.DEFAULT_PRODUCTIVITY);

        const T = await import('../../src/domain/entities/Team.js');
        Team = T.default || T.Team || T;

        const Z = await import('../../src/domain/entities/Zone.js');
        Zone = Z.default || Z.Zone || Z;

        const P = await import('../../src/domain/entities/Project.js');
        Project = P.default || P.Project || P;

        const SE = await import('../../src/domain/services/SimulationEngine.js');
        SimulationEngine = SE.default || SE.SimulationEngine || SE;

        engine = new SimulationEngine({ info: () => {} });
        // Make randomness deterministic by forcing normalRandom to 0 (no variation)
        engine.normalRandom = () => 0;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('applyUncertainty returns base value when normalRandom yields 0', () => {
        const value = 10;
        const factor = 0.2;
        const result = engine.applyUncertainty(value, factor);
        expect(result).toBe(10);
    });

    it('simulateZoneDay aggregates team completions correctly', () => {
        const zone = new Zone('z1', 'Zone 1', 100);

        const t1 = new Team('team-1', TeamType.RESEAU);
        const t2 = new Team('team-2', TeamType.MACONS);

        zone.assignTeam(TeamType.RESEAU, t1).assignTeam(TeamType.MACONS, t2);

        const productivityRates = {};
        productivityRates[TeamType.RESEAU] = new ProductivityRate(4, TeamType.RESEAU);
        productivityRates[TeamType.MACONS] = new ProductivityRate(3, TeamType.MACONS);

        const result = engine.simulateZoneDay(zone, productivityRates, {
            [TeamType.RESEAU]: 0,
            [TeamType.MACONS]: 0
        });

        // 4 + 3 = 7 houses completed when no variation and using floor()
        expect(result.completed).toBe(7);
        expect(result.teams).toHaveLength(2);
        expect(result.teams.map(t => t.actual)).toEqual([4, 3]);
    });

    it('simulateDay composes zone results into a dayResult', () => {
        const zone = new Zone('z2', 'Zone 2', 50);
        const t1 = new Team('team-3', TeamType.RESEAU);
        zone.assignTeam(TeamType.RESEAU, t1);

        const productivityRates = {};
        productivityRates[TeamType.RESEAU] = new ProductivityRate(10, TeamType.RESEAU);

        const project = new Project('p1', 'Project 1', 50, new Date(), [zone]);

        const dayResult = engine.simulateDay(project, new Date(), 0, productivityRates, {
            [TeamType.RESEAU]: 0
        });

        expect(dayResult.housesCompleted).toBe(10);
        expect(dayResult.teamProgress.length).toBe(1);
    });

    it('simulate completes project in expected number of days', () => {
        const zone = new Zone('z3', 'Zone 3', 12);
        const t1 = new Team('team-4', TeamType.RESEAU);
        zone.assignTeam(TeamType.RESEAU, t1);

        // project has 12 houses, team produces 6 houses/day -> 2 days
        const productivityRates = {};
        productivityRates[TeamType.RESEAU] = new ProductivityRate(6, TeamType.RESEAU);

        const startDate = new Date('2023-01-01');
        const project = new Project('p2', 'Project 2', 12, startDate, [zone]);

        const simulation = engine.simulate(project, { productivityRates, uncertaintyFactors: { [TeamType.RESEAU]: 0 } });

        expect(simulation.totalDuration).toBe(2);
        expect(simulation.completedHouses).toBeGreaterThanOrEqual(12);
        expect(simulation.days.length).toBe(2);
    });

    it('monteCarlo returns consistent analysis when simulate is deterministic', () => {
        const zone = new Zone('z4', 'Zone 4', 8);
        const t1 = new Team('team-5', TeamType.RESEAU);
        zone.assignTeam(TeamType.RESEAU, t1);

        const productivityRates = {};
        productivityRates[TeamType.RESEAU] = new ProductivityRate(8, TeamType.RESEAU);

        const project = new Project('p3', 'Project 3', 8, new Date(), [zone]);

        const mc = engine.monteCarlo(project, { productivityRates, uncertaintyFactors: { [TeamType.RESEAU]: 0 } }, 3);

        // Since simulate is deterministic in our tests, duration should be same each run
        expect(mc.results).toHaveLength(3);
        expect(mc.analysis.duration.stdDev).toBeCloseTo(0);
        expect(mc.analysis.duration.mean).toBe(1);

        const report = engine.generateReport(mc);
        // Risk should be 'Faible' because stdDev / mean = 0
        expect(report.summary.risk).toBe('Faible');
        expect(report.recommendations).toEqual([]);
    });
});
