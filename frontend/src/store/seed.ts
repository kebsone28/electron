import { db } from './db';
import { GRAPPES_CONFIG, KIT_COMPOSITION } from '../utils/config';
import type { User } from '../utils/types';

export async function seedDatabase() {
    // 1. Check if already seeded (by checking organizations and households)
    const orgCount = await db.organizations.count();
    const householdsCount = await db.households.count();

    if (orgCount > 0 && householdsCount > 0) {
        console.log('Database already seeded.');
        return;
    }

    console.log('Seeding database with initial mock data...');

    // Only seed orgs/users/projects if they don't exist
    if (orgCount === 0) {

        console.log('Seeding database with initial mock data...');

        // 2. Organizations
        await db.organizations.add({ id: 'org_1', name: 'PROQUELEC' });

        // 3. Teams (from AdminUsers.tsx)
        const initialTeams: any[] = [
            { id: 'team_macons', organizationId: 'org_1', name: 'Équipe Maçons', type: 'macons', specialty: 'Génie Civil' },
            { id: 'team_reseau', organizationId: 'org_1', name: 'Équipe Réseau', type: 'reseau', specialty: 'HTA/BT' },
            { id: 'team_interieur', organizationId: 'org_1', name: 'Équipe Électricien', type: 'interieur', specialty: 'Installations' },
            { id: 'team_livraison', organizationId: 'org_1', name: 'Équipe Livreur', type: 'livraison', specialty: 'Logistique' },
            { id: 'team_controle', organizationId: 'org_1', name: 'Équipe Contrôle', type: 'controle', specialty: 'Audit/Vérification' },
        ];
        await db.teams.bulkAdd(initialTeams);

        // 4. Users (from AdminUsers.tsx / mockUsers.ts)
        const initialUsers: User[] = [
            {
                id: '1',
                email: 'admingem',
                password: '1995@PROQUELEC@2026',
                role: 'ADMIN_PROQUELEC',
                name: 'Administrateur PROQUELEC',
                active: true,
                createdAt: '2026-01-01',
                requires2FA: true,
                secret2FAQuestion: 'Quel est ton secret ?',
                secret2FAAnswer: 'coran'
            },
            {
                id: '2',
                email: 'dggem',
                password: 'GEMDG2026',
                role: 'DG_PROQUELEC',
                name: 'DG PROQUELEC',
                active: true,
                createdAt: '2026-01-01'
            },
            {
                id: '3',
                email: 'gemlse',
                password: 'LSEGEM2026',
                role: 'CLIENT_LSE',
                name: 'Client LSE',
                active: true,
                createdAt: '2026-01-15'
            },
            {
                id: '4',
                email: 'maçongem',
                password: 'GEMMA2026',
                role: 'CHEF_EQUIPE',
                name: 'Chef Maçons',
                active: true,
                createdAt: '2026-01-10',
                teamId: 'team_macons'
            },
            {
                id: '5',
                email: 'reseaugem',
                password: 'GEMRE2026',
                role: 'CHEF_EQUIPE',
                name: 'Chef Réseau',
                active: true,
                createdAt: '2026-01-10',
                teamId: 'team_reseau'
            },
            {
                id: '6',
                email: 'electriciengem',
                password: 'GEMELEC2026',
                role: 'CHEF_EQUIPE',
                name: 'Chef Électricien',
                active: true,
                createdAt: '2026-01-10',
                teamId: 'team_interieur'
            },
            {
                id: '7',
                email: 'livreurgem',
                password: 'gemliv2026',
                role: 'CHEF_EQUIPE',
                name: 'Chef Livreur',
                active: true,
                createdAt: '2026-01-20',
                teamId: 'team_livraison'
            },
        ];
        await db.users.bulkAdd(initialUsers as any);

        // 5. Default Project
        await db.projects.add({
            id: 'proj_1',
            organizationId: 'org_1',
            name: 'Electrification Massive',
            status: 'Active',
            version: 1,
            config: {
                grappesConfig: GRAPPES_CONFIG,
                kitComposition: KIT_COMPOSITION,
                logistics_workshop: {
                    kitsLoaded: 50
                }
            }
        });
    }

    // 6. Generate Mock Households
    const currentHouseholdsCount = await db.households.count();
    if (currentHouseholdsCount === 0) {
        console.log('Generating mock households...');
        const mockHouseholds = [];
        const regions = ['Dakar', 'Kaffrine', 'Tambacounda', 'Kédougou'];
        const statuses = ['Non débuté', 'Murs', 'Réseau', 'Intérieur', 'Terminé', 'Problème'];
        const centers: Record<string, [number, number]> = {
            'Dakar': [14.7167, -17.4677],
            'Kaffrine': [14.1059, -15.5508],
            'Tambacounda': [13.7689, -13.6672],
            'Kédougou': [12.5527, -12.1816]
        };

        for (let i = 1; i <= 300; i++) {
            const region = regions[Math.floor(Math.random() * regions.length)];
            const center = centers[region];
            const lat = center[0] + (Math.random() - 0.5) * 0.15;
            const lon = center[1] + (Math.random() - 0.5) * 0.15;
            const status = statuses[Math.floor(Math.random() * statuses.length)];

            mockHouseholds.push({
                id: `HH-${1000 + i}`,
                region: region,
                status: status,
                owner: `Client ${i}`,
                phone: `+221 77 ${Math.floor(100 + Math.random() * 900)} ${Math.floor(10 + Math.random() * 90)} ${Math.floor(10 + Math.random() * 90)}`,
                location: {
                    type: "Point",
                    coordinates: [lon, lat]
                },
                koboSync: status !== 'Non débuté' ? {
                    livreurDate: new Date().toISOString(),
                    maconOk: ['Murs', 'Réseau', 'Intérieur', 'Terminé'].includes(status),
                    reseauOk: ['Réseau', 'Intérieur', 'Terminé'].includes(status),
                    interieurOk: ['Intérieur', 'Terminé'].includes(status),
                    controleOk: status === 'Terminé'
                } : {}
            });
        }
        await db.households.bulkAdd(mockHouseholds as any);
    }

    console.log('Database successfully seeded.');
}
