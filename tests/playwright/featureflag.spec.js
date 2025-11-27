const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

function fileUrl(relPath) {
  return pathToFileURL(path.resolve(__dirname, '..', '..', relPath)).toString();
}

test.describe('Feature flag: MAP_IMPL behavior', () => {
  test('when APP_CONFIG.mapImplementation=legacy main.js should initialize legacy map', async ({ page }) => {
    // Set flag before page load using evaluateOnNewDocument
    await page.addInitScript(() => {
      window.APP_CONFIG = window.APP_CONFIG || {};
      window.APP_CONFIG.mapImplementation = 'legacy';
    });

    await page.goto(fileUrl('terrain.html'), { waitUntil: 'domcontentloaded' });

    // If app uses legacy initializeMap, it will set __map in main.js; check for global variable
    const usedLegacy = await page.evaluate(() => {
      // main.js uses a __map internal var; we have a public check: if window.mapManager does NOT exist we'll expect legacy to be used
      return (!window.mapManager && typeof initializeMap === 'function');
    });

    // This test asserts that when configured explicitly to legacy, main.js fallback is available
    expect(usedLegacy).toBeTruthy();
  });

  test('default behavior uses MapManager when available', async ({ page }) => {
    // Ensure default config (mapManager) and that mapManager is used
    await page.goto(fileUrl('terrain.html'), { waitUntil: 'domcontentloaded' });

    // MapManager is created by terrain_main on DOMContentLoaded; we wait a bit
    await page.waitForTimeout(300);
    const hasMapManager = await page.evaluate(() => !!window.mapManager);
    expect(hasMapManager).toBeTruthy();
  });
});
