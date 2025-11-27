// reports.js — attach event listeners and small page-specific initialization for rapports.html
/* global loadReportData, initializeCharts, generateReport, clearAllData */

document.addEventListener('DOMContentLoaded', function () {
  try {
    // Attach clear data handler in a testable way
    const clearBtn = document.getElementById('clearAllButton');
    if (clearBtn) {
      // ensure button has type=button to avoid accidental form submits
      if (!clearBtn.hasAttribute('type')) clearBtn.setAttribute('type', 'button');
      clearBtn.addEventListener('click', function (e) {
        // call existing clearAllData implementation if available
        if (typeof clearAllData === 'function') {
          try { clearAllData(); } catch (err) { console.warn('clearAllData failed', err); }
        }
      });
    }

    // Wire report generation buttons (data-report-type)
    const reportButtons = document.querySelectorAll('[data-report-type]');
    reportButtons.forEach(btn => {
      btn.setAttribute('type', 'button');
      btn.addEventListener('click', (ev) => {
        const t = btn.dataset.reportType;
        if (typeof generateReport === 'function') {
          try { generateReport(t); } catch (err) { console.warn('generateReport failed', err); }
        }
      });
    });

    // Initialize page data and charts if functions exist
    if (typeof loadReportData === 'function') {
      try { loadReportData(); } catch (err) { console.warn('loadReportData failed', err); }
    }
    if (typeof initializeCharts === 'function') {
      try { initializeCharts(); } catch (err) { console.warn('initializeCharts failed', err); }
    }
  } catch (e) {
    // Keep page resilient
    console.error('reports.js DOMContentLoaded handler failed', e);
  }
});

// Expose a tiny helper to assist tests
window.__reports = {
  generateReportIfPresent: function (t) { if (typeof generateReport === 'function') return generateReport(t); return null; }
};
