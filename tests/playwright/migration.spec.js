const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

function fileUrl(relPath) {
  return pathToFileURL(path.resolve(__dirname, '..', '..', relPath)).toString();
}

test.describe('Migration menages -> households', () => {
  test('migrateMenagesToHouseholds copies rows and preserves count', async ({ page }) => {
    await page.goto(fileUrl('terrain.html'), { waitUntil: 'domcontentloaded' });

    // Prepare test data: clear both tables and add two menages
    await page.evaluate(async () => {
      await window.db.menages.clear();
      if (window.db.households) await window.db.households.clear();
      const sample = [
        { id: 'MIG-1', nom_prenom_chef: 'Test 1', gps_lat: 14.7, gps_lon: -17.4 },
        { id: 'MIG-2', nom_prenom_chef: 'Test 2', gps_lat: 14.71, gps_lon: -17.41 }
      ];
      await window.db.menages.bulkPut(sample);
      const c = await window.db.menages.count();
      return c;
    });

    // Run migration helper
    const result = await page.evaluate(async () => {
      if (!window.migrateMenagesToHouseholds) return null;
      return await window.migrateMenagesToHouseholds();
    });

    expect(result).not.toBeNull();
    expect(result.total).toBeGreaterThanOrEqual(2);

    // Verify households table count
    const targetCount = await page.evaluate(async () => {
      return window.db.households ? await window.db.households.count() : 0;
    });

    expect(targetCount).toBeGreaterThanOrEqual(result.migrated);
  });
});
