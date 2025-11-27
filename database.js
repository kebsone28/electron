// database.js - Gestion de la base de données locale avec Dexie.js

// Initialisation de la base de données
// Si window.db existe déjà (créé par init.js), on l'utilise
let db;

if (window.db) {
    console.log('♻️ Using existing database instance from init.js (v3 schema)');
    db = window.db;
} else {
    console.warn('⚠️ init.js not loaded yet - creating legacy database instance');
    console.warn('⚠️ This may cause issues with the new architecture');
    db = new Dexie('ElectrificationDB');

    // Définition du schéma legacy (seulement si nouvelle instance)
    db.version(1).stores({
        menages: `
            id, 
            region, departement, commune, quartier_village,
            nom_prenom_chef, telephone, cin,
            gps_lat, gps_lon, gps_precision,
            equipe_reseau, equipe_interieur,
            date_prevue_livraison, date_effective_livraison,
            date_prevue_installation, date_realisation_installation,
            prevision_raccordement,
            statut_installation, statut_reception, facturation_statut,
            date_visite_controle, resultat_reception,
            zone, statut
        `,
        activites_terrain: '++id, date, form_type, equipe_id, zone, menage_id',
        equipes: 'id, role, zone',
        progression: '++id, zone, metier, date',
        problemes: '++id, date, zone, equipe_id, statut',
        sync_logs: '++id, date, type, status, message'
    });

    db.version(2).stores({
        menages: 'id, zone, statut, [zone+statut]',
        activites_terrain: '++id, date, form_type, equipe_id, zone, menage_id, [date+zone], [date+equipe_id]'
    });

    // Add version 3 schema to match init.js (nouvelle architecture + compatibilité legacy)
    db.version(3).stores({
        // Nouvelle architecture
        projects: '++id, name, status, startDate, endDate',
        zones: '++id, projectId, name, [projectId+name]',
        households: '++id, zoneId, status, [zoneId+status], gpsLat, gpsLon',
        teams: '++id, type, zoneId, [type+zoneId]',
        activities: '++id, date, teamId, householdId, type, [date+teamId]',
        costs: '++id, projectId, category, date',
        sync_queue: '++id, entity, action, timestamp, synced',
        audit_log: '++id, entity, entityId, action, userId, timestamp',
        // Tables legacy pour compatibilité avec terrain.html
        menages: 'id, zone, statut, [zone+statut], gps_lat, gps_lon, nom_prenom_chef, telephone, commune, quartier_village, statut_installation',
        activites_terrain: '++id, date, form_type, equipe_id, zone, menage_id, [date+zone], [date+equipe_id]',
        equipes: 'id, role, zone',
        progression: '++id, zone, metier, date',
        problemes: '++id, date, zone, equipe_id, statut',
        sync_logs: '++id, date, type, status, message'
    });
}

// Classe utilitaire pour les opérations DB
class DatabaseManager {
    static async init() {
        if (!db.isOpen()) {
            await db.open();
            console.log('✅ Base de données locale initialisée');
        }
        return db;
    }

    static async getStats() {
        const menagesCount = await db.menages.count();
        const activitesCount = await db.activites_terrain.count();
        const lastSync = await db.sync_logs.orderBy('date').last();

        return {
            menages: menagesCount,
            activites: activitesCount,
            lastSync: lastSync ? lastSync.date : null
        };
    }

    static async clearAll() {
        await db.transaction('rw', db.tables, async () => {
            // Clear new architecture tables
            await db.households.clear();
            await db.projects.clear();
            await db.zones.clear();
            await db.teams.clear();
            await db.activities.clear();
            await db.costs.clear();
            await db.sync_queue.clear();
            await db.audit_log.clear();

            // Clear legacy tables explicitly
            if (db.menages) await db.menages.clear();
            if (db.activites_terrain) await db.activites_terrain.clear();
            if (db.equipes) await db.equipes.clear();
            if (db.progression) await db.progression.clear();
            if (db.problemes) await db.problemes.clear();
            if (db.sync_logs) await db.sync_logs.clear();
        });
        console.log('🗑️ Base de données vidée');
    }
}

// Export pour utilisation globale
window.db = db;
window.DatabaseManager = DatabaseManager;
