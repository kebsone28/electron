const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

function fileUrl(relPath) {
  return pathToFileURL(path.resolve(__dirname, '..', '..', relPath)).toString();
}

test.describe('Terrain page — import & map markers', () => {
  test.setTimeout(120000);

  test('Import test_menages.csv populates DB and map markers are shown', async ({ page }) => {
    await page.goto(fileUrl('terrain.html'), { waitUntil: 'domcontentloaded', timeout: 120000 });

    // Attendre que la zone d'import soit visible (le input file est caché dans l'UI)
    await expect(page.locator('#dropZone')).toBeVisible();

    // Prepare to accept alert dialogs that import_manager may show
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    const csvPath = path.resolve(__dirname, '..', '..', 'test_menages.csv');
    // Déposer le fichier sur l'input caché (Playwright supporte setInputFiles même si l'input est hidden)
    await page.setInputFiles('#fileInput', csvPath);

    // Wait until the DB counter text updates (or for mapManager to have markers)
    await page.waitForFunction(() => {
      try {
        const el = document.getElementById('totalMenagesDb');
        if (el && /menages en base/i.test(el.textContent)) return true;
        return !!(window.mapManager && typeof window.mapManager.getMarkerCount === 'function' && window.mapManager.getMarkerCount() > 0);
      } catch (e) { return false; }
    }, { timeout: 20000 });

    // Finally assert there's at least one marker on the map manager
    const markers = await page.evaluate(() => {
      return (window.mapManager && typeof window.mapManager.getMarkerCount === 'function') ? window.mapManager.getMarkerCount() : 0;
    });

    expect(markers).toBeGreaterThan(0);
  });
});
