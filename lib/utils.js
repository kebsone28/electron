// Utilities for unit testing — extracted from main.js logic but kept independent
export function calculateProductivity(params) {
  const p = params || {};
  const interior = ((p.interiorElectricianType1Teams || 0) * (p.interiorRateType1 || 0)) + ((p.interiorElectricianType2Teams || 0) * (p.interiorRateType2 || 0));
  return Math.min(
    (p.prepTeams || 0) * (p.prepRate || 0),
    (p.deliveryTeams || 0) * (p.deliveryRate || 0),
    (p.masonTeams || 0) * (p.masonRate || 0),
    (p.networkElectricianTeams || 0) * (p.networkRate || 0),
    interior,
    (p.controllerTeams || 0) * (p.controlRate || 0)
  );
}

export function parseTeamKey(teamStr) {
  if (!teamStr || typeof teamStr !== 'string') return { type: 'unknown', id: teamStr };
  const parts = teamStr.split('-');
  const prefix = parts[0];
  const id = parts.slice(1).join('-') || null;
  const map = {
    prep: 'preparateurs',
    delivery: 'livraison',
    mason: 'macons',
    network: 'reseau',
    interior: 'interieur',
    control: 'controle'
  };
  return { type: map[prefix] || prefix, id: id ? `${prefix}-${id}` : prefix };
}

export function aggregateTerrainData(terrainData) {
  const agg = {};
  if (!Array.isArray(terrainData)) return agg;

  const ensure = (type, subteam) => {
    if (!agg[type]) agg[type] = { total: 0, byDate: {}, subteams: {} };
    if (subteam && !agg[type].subteams[subteam]) agg[type].subteams[subteam] = { total: 0, byDate: {} };
  };

  terrainData.forEach(entry => {
    const date = entry.date ? (new Date(entry.date)).toISOString().slice(0,10) : (new Date()).toISOString().slice(0,10);
    const teamStr = entry.team || 'unknown';
    const count = Number(entry.housesCount || entry.count || 0) || 0;
    const { type, id } = parseTeamKey(teamStr);

    ensure(type, id);

    agg[type].total += count;

    if (!agg[type].byDate[date]) agg[type].byDate[date] = { total: 0, entries: [] };
    agg[type].byDate[date].total += count;
    agg[type].byDate[date].entries.push(Object.assign({ originalTeam: teamStr }, entry));

    if (id) {
      agg[type].subteams[id].total += count;
      if (!agg[type].subteams[id].byDate[date]) agg[type].subteams[id].byDate[date] = 0;
      agg[type].subteams[id].byDate[date] += count;
    }
  });

  return agg;
}

export default { calculateProductivity, parseTeamKey, aggregateTerrainData };
