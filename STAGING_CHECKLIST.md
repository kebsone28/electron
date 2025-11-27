# Staging checklist — MapManager migration

Before removing legacy code in production, follow these steps in staging:

1. Deploy branch to staging environment
2. Run automated tests (CI) — ensure all unit and E2E tests pass
   - npm test
   - npm run test:e2e
3. Manual QA scenarios:
   - Import a representative large CSV (e.g., 5k rows) and ensure import success and map markers render
   - Toggle heatmap and ensure UI updates correctly
   - Update household status and verify marker color update in map
   - Delete a household and check marker removed
   - Run migration helper and verify household counts
   - Exercise both MapManager (default) and legacy flows by toggling feature flag
4. Performance checks:
   - Verify map load time for large datasets (<3s ideally) and cluster responsiveness
5. Verify observability:
   - Check console for any warnings, check EventBus metrics (if available)
6. After manual sign-off and 2 successful deployment cycles, schedule removal of legacy code from `main.js`.

Notes:
- To force legacy behavior on staging for tests, set `window.APP_CONFIG.mapImplementation = 'legacy'` in a startup script prior to loading pages.

