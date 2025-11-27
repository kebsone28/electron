import { describe, it, expect } from 'vitest';
import { calculateProductivity, parseTeamKey, aggregateTerrainData } from '../../lib/utils';

describe('utils.calculateProductivity', () => {
  it('returns minimum production across teams', () => {
    const params = {
      prepTeams: 2, prepRate: 50,
      deliveryTeams: 2, deliveryRate: 30,
      masonTeams: 3, masonRate: 10,
      networkElectricianTeams: 1, networkRate: 20,
      interiorElectricianType1Teams: 0, interiorRateType1: 0,
      interiorElectricianType2Teams: 0, interiorRateType2: 0,
      controllerTeams: 1, controlRate: 15
    };
    // values: prep 100, delivery 60, mason 30, network 20, interior 0, controller 15 => min is 0
    expect(calculateProductivity(params)).toBe(0);
  });

  it('calculates interior contribution', () => {
    const params = {
      prepTeams: 1, prepRate: 50,
      deliveryTeams: 1, deliveryRate: 50,
      masonTeams: 1, masonRate: 50,
      networkElectricianTeams: 1, networkRate: 50,
      interiorElectricianType1Teams: 2, interiorRateType1: 10,
      interiorElectricianType2Teams: 1, interiorRateType2: 20,
      controllerTeams: 1, controlRate: 50
    };
    // interior = 2*10 + 1*20 = 40; others produce 50 -> min should be 40
    expect(calculateProductivity(params)).toBe(40);
  });
});

describe('utils.parseTeamKey', () => {
  it('parses common keys', () => {
    expect(parseTeamKey('prep-1').type).toBe('preparateurs');
    expect(parseTeamKey('mason-x').type).toBe('macons');
    expect(parseTeamKey('unknownstring').type).toBe('unknownstring');
    expect(parseTeamKey(null).type).toBe('unknown');
  });
});

describe('utils.aggregateTerrainData', () => {
  it('aggregates simple terrain array', () => {
    const data = [
      { date: '2025-01-01', team: 'mason-A', housesCount: 2 },
      { date: '2025-01-01', team: 'mason-A', housesCount: 1 },
      { date: '2025-01-02', team: 'mason-B', housesCount: 3 }
    ];

    const agg = aggregateTerrainData(data);
    expect(agg.macons.total).toBe(6);
    const aSub = agg.macons.subteams['mason-A'];
    expect(aSub.total).toBe(3);
    expect(Object.keys(agg.macons.byDate).length).toBe(2);
  });
});
