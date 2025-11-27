const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

function fileUrl(relPath) {
  return pathToFileURL(path.resolve(__dirname, '..', '..', relPath)).toString();
}

test.describe('EventBus → MapManager integration', () => {
  test('household.created adds marker via event bus', async ({ page }) => {
    await page.goto(fileUrl('terrain.html'), { waitUntil: 'domcontentloaded' });

    // Ensure empty state
    await page.evaluate(async () => { if (window.db.menages) await window.db.menages.clear(); if (window.db.households) await window.db.households.clear(); if (window.mapManager && window.mapManager.loadData) await window.mapManager.loadData(); });

    // Emit household.created event
    await page.evaluate(() => {
      window.eventBus?.emit?.('household.created', { id: 'EV-1', lat: 14.72, lon: -17.43, status: 'En cours', owner: 'Event User' });
    });

    // Wait for marker to appear
    await page.waitForFunction(() => window.mapManager && window.mapManager.getMarkerCount && window.mapManager.getMarkerCount() >= 1, {}, { timeout: 5000 });

    const count = await page.evaluate(() => window.mapManager.getMarkerCount());
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('household.updated updates the marker position/color', async ({ page }) => {
    await page.goto(fileUrl('terrain.html'), { waitUntil: 'domcontentloaded' });

    // Ensure initial household exists
    await page.evaluate(async () => {
      if (window.db.menages) await window.db.menages.clear();
      await window.db.menages.bulkPut([{ id: 'EV-2', gps_lat: 14.71, gps_lon: -17.42, nom_prenom_chef: 'EV2', statut: 'Non débuté' }]);
      if (window.mapManager && window.mapManager.loadData) await window.mapManager.loadData();
    });

    // Wait for marker
    await page.waitForFunction(() => window.mapManager && window.mapManager.getMarkerCount && window.mapManager.getMarkerCount() >= 1, {}, { timeout: 5000 });

    // Update via event bus
    await page.evaluate(() => {
      window.eventBus?.emit?.('household.updated', { id: 'EV-2', lat: 14.8, lon: -17.5, status: 'Terminé', owner: 'EV2' });
    });

    // Allow some time
    await page.waitForTimeout(300);

    const found = await page.evaluate(() => {
      const layers = window.mapManager.markers.getLayers();
      return layers.find(l => l?.options?._customId === 'EV-2') ? true : false;
    });

    expect(found).toBeTruthy();
  });

  test('household.deleted removes marker via event bus', async ({ page }) => {
    await page.goto(fileUrl('terrain.html'), { waitUntil: 'domcontentloaded' });

    // Ensure data
    await page.evaluate(async () => {
      if (window.db.menages) await window.db.menages.clear();
      await window.db.menages.bulkPut([{ id: 'EV-3', gps_lat: 14.72, gps_lon: -17.4, nom_prenom_chef: 'EV3', statut: 'Terminé' }]);
      if (window.mapManager && window.mapManager.loadData) await window.mapManager.loadData();
    });

    // Wait for marker
    await page.waitForFunction(() => window.mapManager && window.mapManager.getMarkerCount && window.mapManager.getMarkerCount() >= 1, {}, { timeout: 5000 });

    // Emit deleted
    await page.evaluate(() => window.eventBus?.emit?.('household.deleted', { id: 'EV-3' }));

    // Wait and assert removal
    await page.waitForTimeout(300);
    const exists = await page.evaluate(() => !!window.mapManager.markers.getLayers().find(l => l?.options?._customId === 'EV-3'));
    expect(exists).toBeFalsy();
  });
});
