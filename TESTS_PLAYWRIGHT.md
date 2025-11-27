Playwright smoke tests — quick start

This project includes a small suite of Playwright smoke tests located in `tests/playwright/smoke.spec.js`.

Preconditions
- Node.js and npm installed locally
- From the repository root run the following to install dev dependencies and Playwright browsers:

PowerShell commands:

```powershell
# install dependencies (devDeps were added to package.json but must be installed locally)
npm install

# install Playwright browsers (required the first time you run tests)
npx playwright install
```

Run tests

```powershell
# run the smoke tests (default uses the 'test:smoke' script)
npm run test:smoke

# run the full Playwright test suite
npm run test:e2e

# run tests headed for debugging
npm run test:e2e:headed
```

Notes
- Tests open the local files using file:// URLs, so they exercise the same static HTML/JS pages as the desktop app.
- On CI, ensure playwright browsers are installed (run `npx playwright install` as part of your pipeline) and the runner has necessary display/runtime support.
- If you want the tests to run inside the Electron shell instead of plain Chromium, I can scaffold that next (it requires additional Playwright/Electron setup).
