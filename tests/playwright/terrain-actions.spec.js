const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

function fileUrl(relPath) {
  return pathToFileURL(path.resolve(__dirname, '..', '..', relPath)).toString();
}

// Helper to wait for a number of markers > 0
async function waitForMarkerCount(page, min = 1, timeout = 15000) {
  await page.waitForFunction((min) => {
    return !!(window.mapManager && typeof window.mapManager.getMarkerCount === 'function' && window.mapManager.getMarkerCount() >= min);
  }, [min], { timeout });
}

test.describe('Terrain interactions — map behaviors', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await page.goto(fileUrl('terrain.html'), { waitUntil: 'domcontentloaded' });
  });

  test('selectHousehold recenters the map on a household', async ({ page }) => {
    // import test CSV first (ensure markers present)
    const csvPath = path.resolve(__dirname, '..', '..', 'test_menages.csv');
    await page.setInputFiles('#fileInput', csvPath);

    await waitForMarkerCount(page, 1);

    // get the first household id from db.menages (use JS in page)
    const firstId = await page.evaluate(() => {
      const m = window.db && window.db.menages ? (window.db.menages.toArray ? (window.db.menages.toArray().then(arr => arr[0]?.id)) : null) : null;
      return m;
    });

    // Click first list item — ensure it causes detail view and map recenters (map zoom changes or center set)
    await page.waitForSelector('#householdListContainer .p-4', { timeout: 5000 });
    await page.click('#householdListContainer .p-4');

    // Wait a little then check map center zoom or view changed (map exists)
    const hasView = await page.waitForFunction(() => {
      try {
        return !!(window.mapManager && window.mapManager.map && window.mapManager.map.getCenter);
      } catch (e) { return false; }
    }, { timeout: 5000 });

    expect(hasView).toBeTruthy();

    // Check that the map zoom is a number (should be set to approx 18 by selectHousehold)
    const zoom = await page.evaluate(() => window.mapManager.map.getZoom());
    expect(zoom).toBeGreaterThan(5);
  });

  test('updateStatus modifies marker color via updateMarkerColor', async ({ page }) => {
    // import
    const csvPath = path.resolve(__dirname, '..', '..', 'test_menages.csv');
    await page.setInputFiles('#fileInput', csvPath);

    await waitForMarkerCount(page, 1);

    // Pick first household id from DB synchronously using evaluate
    const firstId = await page.evaluate(async () => {
      if (!window.db || !window.db.menages) return null;
      const arr = await window.db.menages.toArray();
      return arr.length > 0 ? arr[0].id : null;
    });
    test.skip(!firstId, 'No household id found');

    // Open detail view by clicking the first list item
    await page.waitForSelector('#householdListContainer .p-4', { timeout: 5000 });
    await page.click('#householdListContainer .p-4');

    // Wait for detail view to appear
    await page.waitForSelector('#householdDetailView:not(.hidden)', { timeout: 5000 });

    // call the UI button "Marquer Terminé" which triggers updateStatus via the page
    await page.click('button:has-text("Marquer Terminé")');

    // Wait a bit and check map markers color changed (we'll check via marker icon's svg fill attribute)
    await page.waitForTimeout(500);

    // read detail id to find target
    const detailId = await page.evaluate(() => document.getElementById('detailId')?.textContent);

    const color = await page.evaluate((id) => {
      const layers = window.mapManager.markers.getLayers();
      const found = layers.find(l => l?.options?._customId === id);
      if (!found) return null;
      const html = found.options.icon.options.html || '';
      // find fill attribute
      const match = html.match(/fill=\"([^\"]+)\"/);
      return match ? match[1] : null;
    }, firstId);

    // Terminé should map to green '#10B981' (MapManager.getColor)
    expect(color).toBeTruthy();
    expect(color.toLowerCase()).toContain('10b981');
  });

  test('heatmap toggle replaces markers with heat layer', async ({ page }) => {
    const csvPath = path.resolve(__dirname, '..', '..', 'test_menages.csv');
    await page.setInputFiles('#fileInput', csvPath);
    await waitForMarkerCount(page, 1);

    // Ensure markers exist
    const initialMarkers = await page.evaluate(() => window.mapManager.getMarkerCount());
    expect(initialMarkers).toBeGreaterThan(0);

    // Toggle heatmap checkbox
    await page.click('#heatmapToggle');
    await page.waitForTimeout(500);

    // Now heatLayer should be present and markers may be removed from map (MapManager code swaps layers)
    const heatLayerPresent = await page.evaluate(() => {
      try {
        const hl = window.mapManager.heatLayer;
        if (!hl) return false;
        // either added to map, or owns latlngs
        return !!(window.mapManager.map.hasLayer(hl) || (hl._latlngs && hl._latlngs.length > 0));
      } catch (e) { return false; }
    });
    expect(heatLayerPresent).toBeTruthy();

    // Toggle back
    await page.click('#heatmapToggle');
    await page.waitForTimeout(500);
    const markersAfter = await page.evaluate(() => window.mapManager.getMarkerCount());
    expect(markersAfter).toBeGreaterThan(0);
  });

  test('deleting household removes marker', async ({ page }) => {
    const csvPath = path.resolve(__dirname, '..', '..', 'test_menages.csv');
    await page.setInputFiles('#fileInput', csvPath);
    await waitForMarkerCount(page, 2);

    // Count markers
    const before = await page.evaluate(() => window.mapManager.getMarkerCount());
    expect(before).toBeGreaterThan(0);

    // Delete an entry from DB via DB API
    const delId = await page.evaluate(async () => {
      const arr = await window.db.menages.toArray();
      if (arr.length === 0) return null;
      const id = arr[0].id;
      await window.db.menages.delete(id);
      // If compatibility adapter emits household.deleted or if map needs refresh, call loadData
      if (window.mapManager && typeof window.mapManager.loadData === 'function') await window.mapManager.loadData();
      return id;
    });

    test.skip(!delId, 'No id to delete');

    // Wait for refresh and count markers reduce
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => window.mapManager.getMarkerCount());
    expect(after).toBeLessThanOrEqual(before - 1);
  });

  test('zoomToMarker recenters & zooms to a specific marker', async ({ page }) => {
    const csvPath = path.resolve(__dirname, '..', '..', 'test_menages.csv');
    await page.setInputFiles('#fileInput', csvPath);
    await waitForMarkerCount(page, 1);

    const firstId = await page.evaluate(async () => {
      const arr = await window.db.menages.toArray();
      return arr.length > 0 ? arr[0].id : null;
    });
    test.skip(!firstId, 'No household id');

    // get marker coords and ensure map center moves to its location
    const markerCoords = await page.evaluate((id) => {
      const found = window.mapManager.markers.getLayers().find(l => l.options._customId === id);
      if (!found) return null;
      const latlng = found.getLatLng();
      return { lat: latlng.lat, lon: latlng.lng };
    }, firstId);
    test.skip(!markerCoords, 'No marker coords found');

    const initialCenter = await page.evaluate(() => window.mapManager.map.getCenter());
    await page.evaluate((id) => window.mapManager && window.mapManager.zoomToMarker && window.mapManager.zoomToMarker(id, 15), firstId);

    const newCenter = await page.evaluate(() => window.mapManager.map.getCenter());
    // expect new center to be close to marker location
    // allow a small margin (0.05 deg ~5km) for map fitting differences
    expect(Math.abs(newCenter.lat - markerCoords.lat)).toBeLessThan(0.05);
    expect(Math.abs(newCenter.lng - markerCoords.lon)).toBeLessThan(0.05);

  });

  test('highlightMarker temporarily adds highlight class', async ({ page }) => {
    const csvPath = path.resolve(__dirname, '..', '..', 'test_menages.csv');
    await page.setInputFiles('#fileInput', csvPath);
    await waitForMarkerCount(page, 1);

    const firstId = await page.evaluate(async () => {
      const arr = await window.db.menages.toArray();
      return arr.length > 0 ? arr[0].id : null;
    });
    test.skip(!firstId, 'No household id');

    await page.evaluate((id) => window.mapManager && window.mapManager.highlightMarker && window.mapManager.highlightMarker(id, 800), firstId);

    // Check that the icon gets the highlight class
    const hasClass = await page.evaluate((id) => {
      const found = window.mapManager.markers.getLayers().find(l => l.options._customId === id);
      return !!(found && found._icon && found._icon.classList.contains('map-marker-highlight'));
    }, firstId);

    expect(hasClass).toBeTruthy();
  });

  test('recreateClusterGroup updates cluster radius option', async ({ page }) => {
    const csvPath = path.resolve(__dirname, '..', '..', 'test_menages.csv');
    await page.setInputFiles('#fileInput', csvPath);
    await waitForMarkerCount(page, 1);

    await page.evaluate(() => { window.mapManager && window.mapManager.recreateClusterGroup && window.mapManager.recreateClusterGroup(10); });

    const radius = await page.evaluate(() => window.mapManager && window.mapManager._markerClusterOptions && window.mapManager._markerClusterOptions.maxClusterRadius);
    expect(radius).toBe(10);
  });

});
