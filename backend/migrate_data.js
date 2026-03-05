
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Data Migration...');

    const ORG_ID = 'org_test_2026';
    const PROJECT_ID = 'proj_test_2026';

    // 1. Fetch all legacy households
    const legacyHouseholds = await prisma.$queryRaw`SELECT * FROM households`;
    console.log(`📊 Found ${legacyHouseholds.length} legacy households.`);

    // 2. Prepare caches
    const zoneMap = new Map(); // Name -> ID

    let migratedCount = 0;
    let errorCount = 0;

    for (const h of legacyHouseholds) {
        try {
            // Determine Zone name from village/commune/region
            const zoneName = h.location?.village || h.location?.commune || h.location?.region || 'Zone Inconnue';

            let zoneId;
            if (zoneMap.has(zoneName)) {
                zoneId = zoneMap.get(zoneName);
            } else {
                // Create or find zone
                const zone = await prisma.zone.upsert({
                    where: { id: `zone_${zoneName.toLowerCase().replace(/[^a-z0-9]/g, '_')}` },
                    update: {},
                    create: {
                        id: `zone_${zoneName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
                        name: zoneName,
                        projectId: PROJECT_ID,
                        organizationId: ORG_ID
                    }
                });
                zoneId = zone.id;
                zoneMap.set(zoneName, zoneId);
            }

            // Parse status - ensure it matches our frontend expectations
            let status = h.status || 'Non débuté';
            if (status.includes('?')) status = 'Non débuté'; // Fix encoding issues if any

            // Parse location to GeoJSON [lon, lat]
            let coordinates = [0, 0];
            if (h.location?.coordinates?.longitude && h.location?.coordinates?.latitude) {
                coordinates = [h.location.coordinates.longitude, h.location.coordinates.latitude];
            } else if (h.longitude && h.latitude) {
                coordinates = [h.longitude, h.latitude];
            }

            // Prepare KoboData (simulated or legacy)
            const koboData = {
                legacy_id: h.kobo_id,
                village: h.location?.village,
                commune: h.location?.commune,
                region: h.location?.region,
                progression: h.progression || 0,
                assigned_teams: h.assigned_teams || []
            };

            // Execute Upsert
            await prisma.household.upsert({
                where: { id: h.id },
                update: {
                    status: status,
                    location: { type: 'Point', coordinates },
                    owner: { name: h.owner?.name || 'Inconnu', phone: h.owner?.phone || '' },
                    koboData: koboData,
                    updatedAt: new Date()
                },
                create: {
                    id: h.id,
                    zoneId: zoneId,
                    organizationId: ORG_ID,
                    status: status,
                    location: { type: 'Point', coordinates },
                    owner: { name: h.owner?.name || 'Inconnu', phone: h.owner?.phone || '' },
                    koboData: koboData,
                    version: 1
                }
            });

            migratedCount++;
            if (migratedCount % 100 === 0) console.log(`✅ Migrated ${migratedCount} households...`);

        } catch (e) {
            console.error(`❌ Error migrating household ${h.id}:`, e.message);
            errorCount++;
        }
    }

    console.log(`\n🎉 Migration finished!`);
    console.log(`✨ Success: ${migratedCount}`);
    console.log(`⚠️ Errors: ${errorCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
