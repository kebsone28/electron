// data.js removed: mock/demo data eliminated per project requirement.
// All runtime data MUST come from user `parametres` and `terrain` inputs (localStorage / IndexedDB).
// Keep a tiny no-op export to avoid module resolution errors in environments that import this file.

'use strict';

const dataUtils = {
    // Intentionally no demo dataset available. Use parameters and terrain pages only.
    getDemoData: function() { return null; },
    calculateKPIs: function() { return null; }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { dataUtils };
}