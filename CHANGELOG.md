# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

- Centralize map rendering in `MapManager` (canonical implementation)
- MapManager: complete API (addMarker, updateMarker, removeMarker, clear, getMarkerCount, diagnostics)
- Feature flag for map implementation: `window.APP_CONFIG.mapImplementation` (defaults to `mapManager`).
- UI: added map points counter, import summary and migration helper.
- Tests: Added E2E Playwright tests for import & map behaviors, EventBus integration and migration.
- CI: GitHub Actions workflow added to run unit and E2E tests.

## [2025-11-27] — Migration + Map Centralization

- Added migration helper `migrate_menages_to_households.js` and migration E2E tests.
- Added MapManager features: zoomToMarker, highlightMarker, recreateClusterGroup.
- Deprecated legacy map functions in `main.js` (now delegates to MapManager by default).
