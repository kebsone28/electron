(async function () {
    'use strict';

    // Migration utility to copy legacy `menages` table into `households` table
    // Adds window.migrateMenagesToHouseholds() to the runtime

    async function migrate() {
        if (!window.db) throw new Error('DB instance not found on window.db');
        if (!db.menages) throw new Error('Legacy table `menages` not found on db');
        if (!db.households) {
            console.warn('`households` table not present — attempting to create via schema not possible at runtime. Proceed with menages copy into new table name `households` if available.');
        }

        const rows = await db.menages.toArray();
        if (!rows || rows.length === 0) return { migrated: 0, total: 0 };

        const converted = rows.map(r => ({
            // Keep id but use ++id optional: if households use incremental id, keep original id if string
            id: r.id,
            zoneId: r.zone || null,
            status: r.statut || r.statut_installation || r.status || null,
            gpsLat: r.gps_lat || r.gpsLat || null,
            gpsLon: r.gps_lon || r.gpsLon || null,
            owner: { name: r.nom_prenom_chef || r.name || '' },
            phone: r.telephone || r.phone || null,
            // keep original raw data
            legacy: r
        }));

        // Bulk put into households
        try {
            await db.households.bulkPut(converted);
        } catch (e) {
            console.error('Migration put error:', e);
            // fallback: if households doesn't exist, create a compatible table may not be possible from runtime
            throw e;
        }

        return { migrated: converted.length, total: rows.length };
    }

    window.migrateMenagesToHouseholds = async function () {
        try {
            const result = await migrate();
            console.log('Migration completed', result);
            return result;
        } catch (e) {
            console.error('Migration failed', e);
            throw e;
        }
    };

    console.log('Migration helper loaded: window.migrateMenagesToHouseholds()');
})();
