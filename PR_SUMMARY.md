# PR: MapManager centralization + Migration + Tests

This PR centralizes map responsibilities into MapManager and provides a migration helper and comprehensive tests. It includes:

- MapManager API and enhancements
- Import improvements + import summary
- Migration helper and tests for menages → households
- Playwright E2E tests covering map behaviors and EventBus integration
- CI workflow for unit + E2E tests
- Docs: README + ARCHITECTURE + CHANGELOG + RELEASE_NOTES

## Checklist before merge
- [x] All unit tests pass
- [x] All E2E tests pass
- [x] Docs updated
- [x] CHANGELOG and RELEASE_NOTES included
- [ ] Manual staging verification (import a representative CSV)
- [ ] Communicate to team (announce default MapManager usage)

## Rollout
1. Merge into `main`.
2. Deploy to staging and perform manual checks.
3. After 2 successful staging cycles, schedule the final removal of `main.js` legacy map code (separate PR).

## Rollback plan
- toggle `window.APP_CONFIG.mapImplementation = 'legacy'` to fall back to legacy rendering while a fix is prepared and deployed.

*** End of PR summary