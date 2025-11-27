// sync_manager.js - Gestion de la synchronisation KoboCollect

class SyncManager {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const koboInput = document.getElementById('koboFileInput');
        if (koboInput) {
            koboInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) this.handleJsonFile(e.target.files[0]);
            });
        }
    }

    async syncKoboData() {
        // Simulation d'un appel API (car pas de vrai endpoint configuré)
        console.log('🔄 Démarrage synchronisation API KoboCollect...');

        try {
            // Simuler un délai réseau
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Données simulées
            const mockData = this.generateMockData();
            await this.processSubmissions(mockData);

            this.logSync('API', 'success', `${mockData.length} entrées synchronisées`);
            alert('Synchronisation terminée avec succès !');
            this.updateUI();

        } catch (error) {
            console.error('Erreur sync:', error);
            this.logSync('API', 'error', error.message);
            alert('Erreur de synchronisation');
        }
    }

    async handleJsonFile(file) {
        console.log('📂 Lecture fichier JSON Kobo:', file.name);
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!Array.isArray(data)) throw new Error('Format invalide: doit être un tableau JSON');

            await this.processSubmissions(data);
            this.logSync('FILE', 'success', `${data.length} entrées importées depuis ${file.name}`);
            alert(`${data.length} entrées importées avec succès`);
            this.updateUI();

        } catch (error) {
            console.error('Erreur import JSON:', error);
            alert('Erreur lecture JSON: ' + error.message);
        }
    }

    async processSubmissions(submissions) {
        let count = 0;
        for (const sub of submissions) {
            // Transformation générique
            const activity = {
                date: sub.date || new Date().toISOString().split('T')[0],
                form_type: sub.form_type || 'unknown',
                equipe_id: sub.equipe_id || 'unknown',
                zone: sub.zone || 'unknown',
                menage_id: sub.menage_id || null,
                raw_data: sub
            };

            // Sauvegarde activité
            await db.activites_terrain.add(activity);

            // Mise à jour statut ménage si applicable
            if (activity.menage_id && activity.form_type === 'electricien_interieur') {
                await db.menages.where('id').equals(activity.menage_id).modify({
                    statut: 'Terminé',
                    date_installation: activity.date,
                    equipe_installation: activity.equipe_id
                });
            }
            count++;
        }
        return count;
    }

    generateMockData() {
        // Générer quelques données aléatoires pour la démo
        return [
            {
                date: new Date().toISOString().split('T')[0],
                form_type: 'electricien_interieur',
                equipe_id: 'INT-001',
                zone: 'Zone A',
                menage_id: 'MEN-000001',
                statut: 'Terminé'
            },
            {
                date: new Date().toISOString().split('T')[0],
                form_type: 'electricien_reseau',
                equipe_id: 'RES-001',
                zone: 'Zone B',
                poteaux: 3
            }
        ];
    }

    async logSync(type, status, message) {
        await db.sync_logs.add({
            date: new Date(),
            type,
            status,
            message
        });
        this.updateUI();
    }

    async updateUI() {
        const lastLog = await db.sync_logs.orderBy('date').last();
        if (lastLog) {
            const el = document.getElementById('lastSyncTime');
            if (el) el.textContent = lastLog.date.toLocaleString();
        }

        const count = await db.activites_terrain.count();
        const pendingEl = document.getElementById('pendingActivitiesCount');
        if (pendingEl) pendingEl.textContent = count;
    }
}

// Initialisation
window.syncManager = new SyncManager();
window.syncKoboData = () => window.syncManager.syncKoboData();
