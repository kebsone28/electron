// terrain_main.js - Point d'entrée principal pour la page Terrain

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation du Hub de Données Terrain...');

    // 1. Initialiser la base de données
    try {
        await DatabaseManager.init();
    } catch (e) {
        console.error('Erreur critique DB:', e);
        alert('Erreur initialisation base de données locale');
        return;
    }

    // 2. Initialiser la carte avec requestAnimationFrame pour garantir que le DOM est prêt
    // Chargement initial des données
    // Chargement initial des données
    const loadHouseholds = async () => {
        try {
            allHouseholds = await db.menages.toArray();

            // Mise à jour du compteur
            const countEl = document.getElementById('totalMenagesDb');
            if (countEl) countEl.textContent = `${allHouseholds.length.toLocaleString()} ménages en base`;

            renderHouseholdList(allHouseholds);
        } catch (error) {
            console.error("Erreur chargement ménages:", error);
        }
    };

    // Fonction de rafraîchissement global (exposée pour import_manager.js)
    window.refreshTerrainData = async () => {
        console.log('🔄 Rafraîchissement global des données terrain...');
        await loadHouseholds();
        if (window.mapManager) {
            await window.mapManager.loadData();
        }
    };

    // Rendu de la liste
    const renderHouseholdList = (households) => {
        const container = document.getElementById('householdListContainer');
        if (!container) return;

        container.innerHTML = '';

        if (households.length === 0) {
            container.innerHTML = '<div class="p-8 text-center text-gray-500">Aucun ménage trouvé</div>';
            return;
        }

        const displayLimit = 50;
        const visibleHouseholds = households.slice(0, displayLimit);

        visibleHouseholds.forEach(h => {
            const statusColor = getStatusColor(h.statut_installation);
            const div = document.createElement('div');
            div.className = 'p-4 hover:bg-gray-50 cursor-pointer transition-colors';
            div.onclick = () => selectHousehold(h.id);
            div.innerHTML = `
                <div class="flex justify-between items-start mb-1">
                    <span class="font-bold text-gray-800 text-sm">${h.nom_prenom_chef || 'Nom Inconnu'}</span>
                    <span class="text-xs px-2 py-0.5 rounded-full ${statusColor.bg} ${statusColor.text}">${h.statut_installation}</span>
                </div>
                <div class="text-xs text-gray-500 flex justify-between">
                    <span>${h.id}</span>
                    <span>${h.quartier_village || ''}</span>
                </div>
            `;
            container.appendChild(div);
        });

        if (households.length > displayLimit) {
            const moreDiv = document.createElement('div');
            moreDiv.className = 'p-4 text-center text-xs text-gray-400 italic';
            moreDiv.textContent = `+ ${households.length - displayLimit} autres ménages`;
            container.appendChild(moreDiv);
        }
    };

    // Sélection d'un ménage
    window.selectHousehold = async (id) => {
        const household = allHouseholds.find(h => h.id === id);
        if (!household) return;

        document.getElementById('detailId').textContent = household.id;
        document.getElementById('detailName').textContent = household.nom_prenom_chef || 'Nom Inconnu';
        document.getElementById('detailLocation').textContent = `${household.quartier_village || ''} - ${household.commune || ''}`;
        document.getElementById('detailPhone').textContent = household.telephone || '-';
        document.getElementById('detailTeamRes').textContent = household.equipe_reseau || '-';
        document.getElementById('detailTeamInt').textContent = household.equipe_interieur || '-';
        document.getElementById('detailDatePrev').textContent = household.date_prevue_installation || '-';

        document.getElementById('householdListView').classList.add('hidden');
        document.getElementById('householdDetailView').classList.remove('hidden');

        if (window.mapManager?.map) {
            const lat = parseFloat(household.gps_lat);
            const lon = parseFloat(household.gps_lon);
            if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
                try {
                    window.mapManager.map.invalidateSize();
                    window.mapManager.map.setView([lat, lon], 18);
                } catch (e) {
                    console.error("Erreur lors du recentrage de la carte:", e);
                }
            }
        }
    };

    // Recherche (FIX: conversion téléphone en string)
    document.getElementById('searchHousehold')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allHouseholds.filter(h =>
            (h.nom_prenom_chef && h.nom_prenom_chef.toLowerCase().includes(term)) ||
            (h.id && h.id.toLowerCase().includes(term)) ||
            (h.telephone && String(h.telephone).includes(term))
        );
        renderHouseholdList(filtered);
    });

    // Filtres
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('active', 'bg-indigo-100', 'text-indigo-700');
                b.classList.add('bg-gray-100', 'text-gray-600');
            });
            e.target.classList.remove('bg-gray-100', 'text-gray-600');
            e.target.classList.add('active', 'bg-indigo-100', 'text-indigo-700');

            const filter = e.target.dataset.filter;
            let filtered = allHouseholds;

            if (filter === 'todo') filtered = allHouseholds.filter(h => !h.statut_installation || h.statut_installation === 'Non débuté');
            if (filter === 'done') filtered = allHouseholds.filter(h => h.statut_installation === 'Terminé' || h.statut_installation === 'Conforme');
            if (filter === 'issue') filtered = allHouseholds.filter(h => h.statut_installation && h.statut_installation.includes('Problème'));

            renderHouseholdList(filtered);
        });
    });

    // Mise à jour du statut
    window.updateStatus = async (newStatus) => {
        const id = document.getElementById('detailId').textContent;
        if (!id) return;

        try {
            await db.menages.update(id, {
                statut_installation: newStatus,
                statut: newStatus,
                date_realisation_installation: new Date().toISOString().split('T')[0]
            });

            await db.progression.add({
                date: new Date().toISOString().split('T')[0],
                equipe: 'Equipe Terrain',
                menages_realises: 1,
                heures_travaillees: 0,
                statut: 'completed',
                details: `Mise à jour statut ${id} -> ${newStatus}`,
                timestamp: Date.now()
            });

            alert(`Statut mis à jour : ${newStatus}`);
            await loadHouseholds();
            if (window.mapManager) window.mapManager.loadData();

            document.getElementById('backToListBtn').click();

        } catch (error) {
            console.error("Erreur update:", error);
            alert("Erreur lors de la mise à jour");
        }
    };

    // Utilitaires
    function getStatusColor(status) {
        if (!status) return { bg: 'bg-gray-100', text: 'text-gray-600' };
        const s = status.toLowerCase();
        if (s.includes('terminé') || s.includes('conforme')) return { bg: 'bg-green-100', text: 'text-green-700' };
        if (s.includes('cours')) return { bg: 'bg-orange-100', text: 'text-orange-700' };
        if (s.includes('problème')) return { bg: 'bg-red-100', text: 'text-red-700' };
        return { bg: 'bg-gray-100', text: 'text-gray-600' };
    }

    // Fonction de reset
    window.resetMenagesDB = async () => {
        if (confirm('Voulez-vous vraiment supprimer TOUTES les données locales ?')) {
            await DatabaseManager.clearAll();
            location.reload();
        }
    };

    // Démarrage
    await loadHouseholds();

    // Instancier MapManager si disponible (nouvelle arch. / compatibilité)
    try {
        if (typeof window.MapManager === 'function' && !window.mapManager) {
            // Crée et expose une instance globale utilisée par terrain-adapter et les imports
            window.mapManager = new window.MapManager();
            // S'assurer que les données présentes dans la DB sont chargées dans la carte
            if (typeof window.mapManager.loadData === 'function') {
                await window.mapManager.loadData();
            }
        }
    } catch (e) {
        console.warn('Erreur création MapManager (compatibilité) :', e);
    }

    console.log('✅ Hub de Données prêt');
});
