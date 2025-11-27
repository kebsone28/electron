# Release Notes — Map Centralization & Migration (2025-11-27)

This release centralizes all map-related rendering into MapManager, adds a full MapManager API, improves import UX, introduces migration helpers, expands E2E test coverage and adds CI.

## Highlights

- MapManager: canonical map renderer (map_manager.js)
  - addMarker, updateMarker, updateMarkerColor, removeMarker, clear, getMarkerCount, diagnostics
  - additional features: zoomToMarker, highlightMarker, recreateClusterGroup
  - EventBus integration (household.created/updated/deleted)
- UI improvements: visible points counter, import summary
- Migration helper: `migrations/migrate_menages_to_households.js` and migration tests
- Tests: Playwright E2E tests added/expanded for map behavior and migration
- CI: GitHub Actions workflow now runs unit + E2E tests

## Rollout plan
1. Merge into main branch after review
2. Run CI to ensure all tests pass
3. Deploy to staging for manual verification (import a real CSV and test map behaviour)
4. Monitor metrics/logs and feedback
5. After 2 successful staging cycles, remove legacy map code from `main.js` and cleanup

## Rollback plan
- If critical issues appear after release, toggle `window.APP_CONFIG.mapImplementation = 'legacy'` until a fix is deployed.

## Files to review in PR
- `map_manager.js`
- `terrain_main.js`
- `import_manager.js`
- `main.js` (deprecated/modified)
- `migrations/migrate_menages_to_households.js`
- tests/playwright/*
- `.github/workflows/ci.yml`
- `CHANGELOG.md`, `RELEASE_NOTES.md`, README/ARCHITECTURE.md updates

*** End of notes
