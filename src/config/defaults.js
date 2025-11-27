// Default runtime configuration
window.APP_CONFIG = window.APP_CONFIG || {};
// Available values: 'mapManager' (default), 'legacy'
window.APP_CONFIG.mapImplementation = window.APP_CONFIG.mapImplementation || 'mapManager';

console.log('APP_CONFIG initialized', window.APP_CONFIG);