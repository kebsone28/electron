// import_manager.js - Gestion de l'import Excel

class ImportManager {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');

        if (dropZone && fileInput) {
            // Drag & Drop events
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('bg-indigo-50', 'border-indigo-500');
            });

            dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropZone.classList.remove('bg-indigo-50', 'border-indigo-500');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('bg-indigo-50', 'border-indigo-500');
                const files = e.dataTransfer.files;
                if (files.length > 0) this.handleFile(files[0]);
            });

            // File input change
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) this.handleFile(e.target.files[0]);
            });
        }
    }

    async handleFile(file) {
        console.log('📂 Traitement du fichier:', file.name);
        this.showProgress(0);
        document.getElementById('importStatus').classList.remove('hidden');

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(sheet);

            console.log(`📊 ${jsonData.length} lignes trouvées`);
            this.showProgress(30);

            await this.processMenages(jsonData);

            this.showProgress(100);
            setTimeout(() => {
                alert(`Succès ! ${jsonData.length} ménages importés.`);
                document.getElementById('importStatus').classList.add('hidden');
                this.updateStats();
            }, 500);

        } catch (error) {
            console.error('Erreur import:', error);
            alert('Erreur lors de l\'import: ' + error.message);
            document.getElementById('importStatus').classList.add('hidden');
        }
    }

    async processMenages(data) {
        const batchSize = 500;
        const total = data.length;
        let processed = 0;

        // Nettoyage et transformation
        const menages = data.map((row, index) => ({
            // Identifiants
            id: row.ID || row.id || `MEN-${String(index + 1).padStart(6, '0')}`,

            // Localisation
            region: row.Region || row.REGION || row.region || '',
            departement: row.Departement || row.DEPARTEMENT || row.departement || '',
            commune: row.Commune || row.COMMUNE || row.commune || '',
            quartier_village: row['Quartier ou Village'] || row.Quartier || row.Village || row.VILLAGE || row.quartier || '',
            zone: row.zone || row.ZONE || 'Non assigné',

            // Identité
            nom_prenom_chef: row.Nom || row.NOM || row.nom_prenom || '',
            telephone: row.Telephone || row.TEL || row.telephone || '',
            obs_telephone: row.Obs_Tel || row.OBS_TEL || '',
            cin: row.CIN || row.cin || '',

            // Coordonnées
            // Coordonnées (gestion des virgules et points)
            gps_lat: this.parseCoordinate(row.latitude || row.GPS_LAT || row.lat),
            gps_lon: this.parseCoordinate(row.longitude || row.GPS_LON || row.lon),
            gps_precision: parseFloat(String(row.precision || row.PRECISION || 0).replace(',', '.')),

            // Équipes
            equipe_reseau: row.Equipe_Reseau || '',
            equipe_interieur: row.Equipe_Interieur || '',

            // Planning & Réalisation
            date_prevue_livraison: row.Date_Prevue_Livraison || '',
            date_effective_livraison: row.Date_Effective_Livraison || '',
            date_prevue_installation: row.Date_Prevue_Installation || '',
            date_realisation_installation: row.Date_Realisation_Installation || '',
            prevision_raccordement: row.Prevision_Raccordement || '',

            // Statuts
            statut_installation: row.Statut_Installation || 'Non débuté',
            statut_reception: row.Statut_Reception || 'Non réceptionné',
            facturation_statut: row.Facturation || 'Non facturé',

            // Contrôle & Réception
            date_visite_controle: row.Date_Visite_Controle || '',
            resultat_reception: row.Resultat_Reception || '',
            prescription_ns_01_001: row.Prescription_NS_01_001 || '',
            prescription_nf_c14_100: row.Prescription_NF_C14_100 || '',
            valeur_terre: row.Valeur_Terre || '',

            // Champs système
            statut: row.Statut || row.Statut_Installation || 'En attente',
            date_import: new Date().toISOString()
        }));

        if (menages.length > 0) {
            console.log('📥 [ImportManager] Exemple de ménage parsé:', menages[0]);
            console.log(`📥 [ImportManager] Lat: ${menages[0].gps_lat}, Lon: ${menages[0].gps_lon}`);
        }

        // Keep stats for import summary
        let ignoredCount = 0;
        let insertedCount = 0;

        // Normalize menages: treat invalid coords as null and count them
        // Mark invalid coords as null and compute ignored
        const normalizedMenages = menages.map(m => {
            const hasValidCoords = m.gps_lat && m.gps_lon && !isNaN(parseFloat(m.gps_lat)) && !isNaN(parseFloat(m.gps_lon)) && parseFloat(m.gps_lat) !== 0 && parseFloat(m.gps_lon) !== 0;
            if (!hasValidCoords) {
                ignoredCount++;
                return { ...m, gps_lat: null, gps_lon: null };
            }
            insertedCount++;
            return m;
        });

        for (let i = 0; i < normalizedMenages.length; i += batchSize) {
            const batch = normalizedMenages.slice(i, i + batchSize);
            await db.menages.bulkPut(batch);
            processed += batch.length;

            const progress = 30 + Math.round((processed / total) * 70);
            this.showProgress(progress);
        }

        // Save summary info for UI
        this._lastImportSummary = { total, inserted: insertedCount, ignored: ignoredCount };
    }

    showProgress(percent) {
        const bar = document.getElementById('importProgressBar');
        const text = document.getElementById('importProgressText');
        if (bar && text) {
            bar.style.width = `${percent}%`;
            text.textContent = `${percent}%`;
        }
    }

    parseCoordinate(value) {
        if (!value) return 0;
        // Nettoyage : supprimer espaces, remplacer virgule par point
        let strVal = String(value).trim().replace(',', '.');

        // Gestion des cas où il y a des caractères non numériques (ex: "14°...")
        // On extrait juste la partie numérique si possible, ou on laisse parseFloat gérer
        const floatVal = parseFloat(strVal);

        // Vérification basique de validité (coordonnées géographiques réalistes)
        if (isNaN(floatVal)) return 0;

        return floatVal;
    }

    async updateStats() {
        // Utiliser la fonction de rafraîchissement global si disponible
        if (window.refreshTerrainData) {
            await window.refreshTerrainData();
        } else {
            // Fallback
            const count = await db.menages.count();
            const el = document.getElementById('totalMenagesDb');
            if (el) el.textContent = `${count.toLocaleString()} ménages en base`;

            // Show import summary if available
            const summaryEl = document.getElementById('importSummary');
            if (summaryEl && this._lastImportSummary) {
                summaryEl.classList.remove('hidden');
                summaryEl.textContent = `Import: ${this._lastImportSummary.inserted} importés, ${this._lastImportSummary.ignored} ignorés (sur ${this._lastImportSummary.total})`;
            }

            // Refresh map via MapManager (if present) or reloadMap fallback
            if (window.mapManager && typeof window.mapManager.loadData === 'function') {
                await window.mapManager.loadData();
            } else if (window.reloadMap) {
                window.reloadMap();
            }
        }
    }
}

// Initialisation
window.importManager = new ImportManager();
