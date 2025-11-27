/**
 * Point d'entrée pour toutes les entités du domaine
 */

// Importer les dépendances
if (typeof window === 'undefined') {
    // Node.js environment
    const Entity = require('./Entity');
    const Project = require('./Project');
    const Zone = require('./Zone');
    const Team = require('./Team');
    const Household = require('./Household');

    module.exports = {
        Entity,
        Project,
        Zone,
        Team,
        Household
    };
} else {
    // Browser environment - les scripts sont déjà chargés globalement
    console.log('Domain entities loaded');
}
