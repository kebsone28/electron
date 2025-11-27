// dashboard_manager.js - Gestion du tableau de bord temps réel

class DashboardManager {
    constructor() {
        // Initialization is handled externally to ensure DB is ready
    }

    async init() {
        await this.updateKPIs();
        // Rafraîchir toutes les 30 secondes
        setInterval(() => this.updateKPIs(), 30000);
    }

    async updateKPIs() {
        try {
            // Use new repository if available, otherwise fallback to direct DB access
            let total = 0, termines = 0, enCours = 0, problemes = 0;

            if (window.householdRepository) {
                const stats = await window.householdRepository.getStats();
                total = await window.householdRepository.count();
                termines = stats['Terminé'] || 0;
                enCours = stats['En cours'] || 0;
                problemes = stats['Problème'] || 0;
            } else if (db.households) {
                const households = await db.households.toArray();
                total = households.length;
                termines = households.filter(h => h.status === 'Terminé').length;
                enCours = households.filter(h => h.status === 'En cours').length;
                problemes = households.filter(h => h.status === 'Problème').length;
            } else if (db.menages) {
                // Legacy fallback
                const menages = await db.menages.toArray();
                total = menages.length;
                termines = menages.filter(m => m.statut === 'Terminé').length;
                enCours = menages.filter(m => m.statut === 'En cours').length;
                problemes = menages.filter(m => m.statut === 'Problème').length;
            }

            // Mise à jour UI
            this.updateElement('totalMenagesDb', `${total.toLocaleString()} ménages en base`);

            // KPIs Avancement du Jour (basé sur activites_terrain ou activities)
            const today = new Date().toISOString().split('T')[0];
            let menagesToday = 0;
            let activeTeams = 0;
            let activitiesToday = [];

            if (db.activities) {
                activitiesToday = await db.activities
                    .where('date').equals(today)
                    .toArray();
                menagesToday = activitiesToday.length; // Assuming 1 activity = 1 household for simplicity or filter by type
                activeTeams = new Set(activitiesToday.map(a => a.teamId)).size;
            } else if (db.activites_terrain) {
                activitiesToday = await db.activites_terrain
                    .where('date').equals(today)
                    .toArray();
                menagesToday = activitiesToday.filter(a => a.form_type === 'electricien_interieur').length;
                activeTeams = new Set(activitiesToday.map(a => a.equipe_id)).size;
            }

            this.updateElement('todayHouses', menagesToday);
            this.updateElement('activeTeamsToday', activeTeams);

            // Mise à jour tableau avancement
            this.updateProgressTable(activitiesToday);

        } catch (error) {
            console.error('Erreur update dashboard:', error);
        }
    }

    updateElement(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    updateProgressTable(activities) {
        const tbody = document.getElementById('todayProgressTable');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (activities.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">Aucune activité aujourd\'hui</td></tr>';
            return;
        }

        activities.forEach(act => {
            // Handle both legacy and new activity structures
            const teamId = act.teamId || act.equipe_id || '-';
            const count = act.menages_traites?.length || 1;
            const status = 'Terminé'; // Default for now
            const comment = act.comment || act.raw_data?.observations || '-';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${teamId}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${count}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        ${status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${comment}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button class="text-indigo-600 hover:text-indigo-900">Détails</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
}

// Initialisation
window.dashboardManager = new DashboardManager();

// Wait for app initialization before starting dashboard updates
window.addEventListener('load', () => {
    if (window.householdRepository) {
        window.dashboardManager.init();
    } else if (window.eventBus) {
        window.eventBus.once('app.initialized', () => {
            window.dashboardManager.init();
        });
    } else {
        // Fallback for legacy mode or if eventBus is missing
        setTimeout(() => window.dashboardManager.init(), 1000);
    }
});
