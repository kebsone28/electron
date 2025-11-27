// map_manager.js - Gestion de la carte interactive

// Helper pour normaliser différentes formes de payload provenant
// soit de la nouvelle architecture, soit du code legacy.
function normalizeIncoming(data) {
    if (!data) return {};
    // si payload direct
    const id = data.id || data.householdId || data.HouseholdId || data._id || null;
    const lat = data.lat ?? data.gps_lat ?? data.latitude ?? data.location?.lat ?? data.location?.latitude ?? null;
    const lon = data.lon ?? data.gps_lon ?? data.longitude ?? data.location?.lon ?? data.location?.longitude ?? null;
    const status = data.status ?? data.statut ?? data.statut_installation ?? null;
    const owner = data.owner ?? data.nom_prenom_chef ?? data.name ?? data.nom ?? null;
    const tooltip = data.tooltip ?? null;
    return { id, lat, lon, status, owner, tooltip };
}

class MapManager {
    constructor() {
        this.map = null;
        this.markers = null;
        this.heatLayer = null;
        this._markerClusterOptions = { chunkedLoading: true, maxClusterRadius: 60 };
        this.initMap();
        // Subscribe to EventBus if available so markers react to domain events
        if (window.eventBus) {
            try {
                window.eventBus.on('household.created', (data) => {
                    // support both new and legacy shapes
                    const payload = normalizeIncoming(data);
                    this.addMarker(payload);
                });
                window.eventBus.on('household.updated', (data) => {
                    const payload = normalizeIncoming(data);
                    this.updateMarker(payload.id, payload);
                });
                window.eventBus.on('household.deleted', (data) => {
                    const id = data?.id || data?.householdId;
                    if (id) this.removeMarker(id);
                });
            } catch (e) {
                console.warn('🗺️ [MapManager] Cannot subscribe to EventBus:', e);
            }
        }
    }

    initMap() {
        if (typeof L === 'undefined') {
            console.warn('🗺️ [MapManager] Leaflet non chargé');
            return;
        }

        // Vérifier que le conteneur existe et est visible
        const container = document.getElementById('householdMap');
        if (!container) {
            console.warn('🗺️ [MapManager] Conteneur householdMap introuvable');
            return;
        }

        // Attendre que le conteneur soit visible et ait des dimensions
        const waitForContainer = () => {
            return new Promise((resolve) => {
                const checkContainer = () => {
                    if (container.offsetWidth > 0 && container.offsetHeight > 0) {
                        resolve();
                    } else {
                        requestAnimationFrame(checkContainer);
                    }
                };
                checkContainer();
            });
        };

        // Initialiser la carte une fois le conteneur prêt
        waitForContainer().then(() => {
            // Si le conteneur a déjà une carte, la supprimer d'abord
            if (container._leaflet_id) {
                console.log('🗺️ [MapManager] Suppression de l\'ancienne instance de carte');
                container._leaflet_id = undefined;
                container.innerHTML = '';
            }

            try {
                // Initialisation Leaflet (Centré sur Dakar, Sénégal)
                this.map = L.map('householdMap').setView([14.7167, -17.4677], 12);

                // Style de carte épuré (CartoDB Positron) - montre mieux les routes et bâtiments
                L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                    attribution: '© OpenStreetMap contributors © CARTO',
                    subdomains: 'abcd',
                    maxZoom: 20
                }).addTo(this.map);

                // Cluster Group
                this.markers = L.markerClusterGroup(this._markerClusterOptions);
                this.map.addLayer(this.markers);

                // Inject highlight CSS once
                try {
                    if (!document.getElementById('map-manager-styles')) {
                        const s = document.createElement('style');
                        s.id = 'map-manager-styles';
                        s.textContent = `
                            .map-marker-highlight { transform: scale(1.25); transition: transform 200ms ease; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.25)); z-index: 9999 !important; }
                        `;
                        document.head.appendChild(s);
                    }
                } catch (e) { /* ignore */ }

                // Charger les données
                this.loadData();

                // Écouteurs
                document.getElementById('heatmapToggle')?.addEventListener('change', (e) => {
                    this.toggleHeatmap(e.target.checked);
                });

                document.getElementById('clusterRadiusInput')?.addEventListener('input', (e) => {
                    const radius = parseInt(e.target.value);
                    document.getElementById('clusterRadiusValue').textContent = radius;
                });

                console.log('🗺️ [MapManager] Carte initialisée avec succès');
            } catch (error) {
                console.error('🗺️ [MapManager] Erreur lors de l\'initialisation:', error);
            }
        });
    }

    /** Recreate cluster group with new options (e.g. maxClusterRadius) */
    recreateClusterGroup(maxClusterRadius) {
        try {
            if (!this.map || !this.markers) return;
            if (typeof maxClusterRadius === 'number') this._markerClusterOptions.maxClusterRadius = maxClusterRadius;
            const existingLayers = this.markers.getLayers() || [];
            try { this.map.removeLayer(this.markers); } catch (e) { /* ignore */ }
            try {
                this.markers = L.markerClusterGroup(this._markerClusterOptions);
            } catch (e) {
                console.warn('marker cluster recreate failed', e);
                this.markers = L.layerGroup();
            }
            // Re-add existing layers
            if (existingLayers.length > 0) this.markers.addLayers(existingLayers);
            this.map.addLayer(this.markers);
            // update UI counter
            try { const el = document.getElementById('mapPointsCount'); if (el) el.textContent = `${this.getMarkerCount().toLocaleString()} points affichés`; } catch (e) {}
        } catch (e) { console.error('MapManager.recreateClusterGroup error', e); }
    }

    async loadData() {
        if (!this.map || !this.markers) {
            console.warn('🗺️ [MapManager] Carte non initialisée, impossible de charger les données');
            return;
        }

        // Forcer le redimensionnement pour éviter les problèmes d'affichage
        this.map.invalidateSize();

        try {
            // Chargez les deux schémas possibles : legacy menages et nouvelle table households
            let menages = [];
            try {
                if (db.menages) menages = (await db.menages.toArray()) || [];
            } catch (e) {
                console.warn('🗺️ [MapManager] impossible de lire db.menages', e);
            }

            try {
                if (db.households) {
                    const newHouseholds = (await db.households.toArray()) || [];
                    // Convertir au format legacy attendu
                    const normalized = newHouseholds.map(h => ({
                        id: h.id ?? h._id ?? h.householdId,
                        gps_lat: h.gpsLat ?? h.gps_lat ?? (h.location?.coordinates ? h.location.coordinates[1] : null),
                        gps_lon: h.gpsLon ?? h.gps_lon ?? (h.location?.coordinates ? h.location.coordinates[0] : null),
                        nom_prenom_chef: h.owner?.name ?? h.nom_prenom_chef ?? h.name ?? '',
                        statut: h.status ?? h.statut ?? ''
                    }));
                    menages = menages.concat(normalized);
                }
            } catch (e) {
                console.warn('🗺️ [MapManager] impossible de lire db.households', e);
            }
            console.log(`🗺️ [MapManager] Chargement de ${menages.length} ménages depuis la DB`);

            if (menages.length > 0) {
                console.log('🗺️ [MapManager] Exemple de ménage:', menages[0]);
                console.log(`🗺️ [MapManager] Coordonnées exemple: Lat=${menages[0].gps_lat}, Lon=${menages[0].gps_lon}`);
            }

            this.markers.clearLayers();
            const points = [];
            let validPointsCount = 0;

            menages.forEach(m => {
                // Vérification stricte des coordonnées
                // Normaliser différents noms de champs
                const rawLat = m.gps_lat ?? m.gpsLat ?? m.lat ?? m.latitude ?? (m.properties && (m.properties.lat ?? m.properties.latitude));
                const rawLon = m.gps_lon ?? m.gpsLon ?? m.lon ?? m.longitude ?? (m.properties && (m.properties.lon ?? m.properties.longitude));
                const lat = parseFloat(rawLat);
                const lon = parseFloat(rawLon);

                if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
                    // Créer une icône de drapeau colorée selon le statut
                    const color = this.getColor(m.statut);
                    const icon = L.divIcon({
                        className: 'custom-flag-marker',
                        html: `
                            <div style="position: relative;">
                                <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
                                    <!-- Mât -->
                                    <line x1="5" y1="0" x2="5" y2="40" stroke="#333" stroke-width="2"/>
                                    <!-- Drapeau -->
                                    <path d="M 5 2 L 25 2 L 25 18 L 15 14 L 5 18 Z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
                                </svg>
                            </div>
                        `,
                        iconSize: [30, 40],
                        iconAnchor: [5, 40],
                        popupAnchor: [10, -35]
                    });

                    const marker = L.marker([lat, lon], { icon: icon, _customId: (m.id !== undefined && m.id !== null) ? m.id : undefined });

                    // Interaction : Clic pour sélectionner
                    marker.on('click', () => {
                        try {
                            if (window.selectHousehold) {
                                window.selectHousehold(m.id);
                            }
                        } catch (e) {
                            console.error("Erreur lors du clic sur le marqueur:", e);
                        }
                    });

                    // Tooltip léger au survol
                    marker.bindTooltip(`${m.id} - ${m.nom_prenom_chef}`, {
                        direction: 'top',
                        offset: [0, -5]
                    });

                    this.markers.addLayer(marker);
                    points.push([lat, lon]);
                    validPointsCount++;
                } else {
                    console.warn(`🗺️ [MapManager] Ménage ${m.id} ignoré : coordonnées invalides (${m.gps_lat}, ${m.gps_lon})`);
                }
            });

            console.log(`🗺️ [MapManager] ${validPointsCount} points valides ajoutés à la carte`);

            // Update UI counter and emit event
            try {
                const el = document.getElementById('mapPointsCount');
                if (el) el.textContent = `${validPointsCount.toLocaleString()} points affichés`;
            } catch (e) { /* ignore DOM update errors */ }

            try { window.eventBus?.emit?.('map.markers.updated', { count: validPointsCount }); } catch (e) { /* ignore */ }

            // Ajuster la vue
            if (points.length > 0) {
                const bounds = L.latLngBounds(points);
                this.map.fitBounds(bounds, { padding: [50, 50] });
                console.log('🗺️ [MapManager] Vue ajustée aux limites:', bounds);
            } else {
                console.warn('🗺️ [MapManager] Aucun point à afficher');
            }

            // Préparer heatmap
            if (typeof L.heatLayer !== 'undefined') {
                this.heatLayer = L.heatLayer(points, { radius: 25 });
            }

        } catch (error) {
            console.error('Erreur chargement carte:', error);
        }
    }

    fitDataBounds() {
        if (!this.markers) {
            console.warn('🗺️ [MapManager] Markers non initialisés');
            return;
        }

        try {
            const bounds = this.markers.getBounds();
            if (bounds && bounds.isValid()) {
                this.map.fitBounds(bounds, { padding: [50, 50] });
                console.log('🗺️ [MapManager] Recentrage manuel sur les données');
            } else {
                console.warn('🗺️ [MapManager] Aucune donnée géolocalisée à afficher');
                alert('Aucune donnée géolocalisée à afficher.');
            }
        } catch (error) {
            console.error('🗺️ [MapManager] Erreur fitDataBounds:', error);
            alert('Impossible de recentrer : aucune donnée disponible.');
        }
    }

    toggleHeatmap(show) {
        if (!this.heatLayer) return;

        if (show) {
            this.map.removeLayer(this.markers);
            this.map.addLayer(this.heatLayer);
        } else {
            this.map.removeLayer(this.heatLayer);
            this.map.addLayer(this.markers);
        }
    }

    /**
     * Ajoute un unique marqueur (utilisé par terrain-adapter lors d'un import / création)
     * payload: { id, lat, lon, status, owner }
     */
    addMarker(payload) {
        try {
            if (!this.map || !this.markers) return;
            const { id, lat, lon, status, owner } = payload || {};
            const parsedLat = parseFloat(lat);
            const parsedLon = parseFloat(lon);
            if (!isFinite(parsedLat) || !isFinite(parsedLon)) return;

            // Eviter doublons (par id si présent)
            const existing = this.markers.getLayers().find(l => l?.options?._customId === id);
            if (existing) return;

            const color = this.getColor(status);
            const icon = L.divIcon({
                className: 'custom-flag-marker',
                html: `
                    <div style="position: relative;">
                        <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
                            <line x1="5" y1="0" x2="5" y2="40" stroke="#333" stroke-width="2"/>
                            <path d="M 5 2 L 25 2 L 25 18 L 15 14 L 5 18 Z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
                        </svg>
                    </div>
                `,
                iconSize: [30, 40],
                iconAnchor: [5, 40],
                popupAnchor: [10, -35]
            });

            const marker = L.marker([parsedLat, parsedLon], { icon, _customId: id });
            if (owner) marker.bindTooltip(`${id} - ${owner}`, { direction: 'top', offset: [0, -5] });
            marker.on('click', () => { if (window.selectHousehold) window.selectHousehold(id); });
            this.markers.addLayer(marker);

            // update map count after adding
            try {
                const el = document.getElementById('mapPointsCount');
                if (el) el.textContent = `${this.getMarkerCount().toLocaleString()} points affichés`;
            } catch (e) { /* ignore */ }

            try { window.eventBus?.emit?.('map.markers.updated', { count: this.getMarkerCount() }); } catch (e) { /* ignore */ }
            // Recentrer si nécessaire
            try {
                const bounds = this.markers.getBounds();
                if (bounds && bounds.isValid()) this.map.fitBounds(bounds, { padding: [50, 50] });
            } catch (e) { /* ignore fit errors */ }
        } catch (e) {
            console.error('MapManager.addMarker erreur:', e);
        }
    }

    /**
     * Met à jour (ou ajoute si inexistant) un marker
     * payload peut contenir id, lat, lon, status, owner, tooltip, popup
     */
    updateMarker(id, payload) {
                        // update UI count in case id was new or changed
                        try { const el = document.getElementById('mapPointsCount'); if (el) el.textContent = `${this.getMarkerCount().toLocaleString()} points affichés`; } catch (e) {}
        try {
            if (!this.map || !this.markers || !id) return;
            // Chercher par _customId
            const layers = this.markers.getLayers();
            const found = layers.find(l => l?.options?._customId === id);
            if (found) {
                // position
                const lat = parseFloat(payload.lat ?? payload.gps_lat ?? payload.latitude);
                const lon = parseFloat(payload.lon ?? payload.gps_lon ?? payload.longitude);
                if (isFinite(lat) && isFinite(lon)) {
                    try { found.setLatLng([lat, lon]); } catch (e) { /* ignore */ }
                }
                // icon/status
                if (payload.status) {
                    const color = this.getColor(payload.status);
                    const newIcon = L.divIcon({
                        className: 'custom-flag-marker',
                        html: `
                            <div style="position: relative;">
                                <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
                                    <line x1="5" y1="0" x2="5" y2="40" stroke="#333" stroke-width="2"/>
                                    <path d="M 5 2 L 25 2 L 25 18 L 15 14 L 5 18 Z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
                                </svg>
                            </div>
                        `,
                        iconSize: [30, 40],
                        iconAnchor: [5, 40],
                        popupAnchor: [10, -35]
                    });
                    try { found.setIcon(newIcon); } catch (e) { /* ignore */ }
                }

                // tooltip/popup
                if (payload.owner || payload.tooltip) {
                    try { found.bindTooltip(payload.tooltip || `${id} - ${payload.owner}`, { direction: 'top', offset: [0, -5] }); } catch (e) { /* ignore */ }
                }

            } else {
                // pas trouvé → ajouter
                this.addMarker({ id, lat: payload.lat || payload.gps_lat || payload.latitude, lon: payload.lon || payload.gps_lon || payload.longitude, status: payload.status, owner: payload.owner });
            }
        } catch (e) {
            console.error('MapManager.updateMarker erreur:', e);
        }
    }

    /**
     * Supprime un marker par id
     */
    removeMarker(id) {
        try {
            if (!this.markers || !id) return;
            const layers = this.markers.getLayers();
            const layer = layers.find(l => l?.options?._customId === id);
            if (layer) {
                this.markers.removeLayer(layer);
                try {
                    const el = document.getElementById('mapPointsCount');
                    if (el) el.textContent = `${this.getMarkerCount().toLocaleString()} points affichés`;
                } catch (e) { /* ignore */ }
                try { window.eventBus?.emit?.('map.markers.updated', { count: this.getMarkerCount() }); } catch (e) { /* ignore */ }
            }
        } catch (e) {
            console.error('MapManager.removeMarker erreur:', e);
        }
    }

    /**
     * Zoom to a marker by id
     */
    zoomToMarker(id, zoomLevel = 16) {
        try {
            if (!this.map || !this.markers || !id) return;
            const layer = this.markers.getLayers().find(l => l?.options?._customId === id);
            if (layer) {
                this.map.setView(layer.getLatLng(), zoomLevel);
            }
        } catch (e) { console.error('MapManager.zoomToMarker', e); }
    }

    /**
     * Highlight a marker (temporary visual effect)
     */
    highlightMarker(id, ms = 1200) {
        try {
            if (!this.map || !this.markers || !id) return;
            const layer = this.markers.getLayers().find(l => l?.options?._customId === id);
            if (!layer || !layer._icon) return;

            layer._icon.classList.add('map-marker-highlight');
            setTimeout(() => { try { layer._icon.classList.remove('map-marker-highlight'); } catch (e) { } }, ms);
        } catch (e) { console.error('MapManager.highlightMarker', e); }
    }

    /**
     * Vide tous les markers
     */
    clear() {
        try {
            if (!this.markers) return;
            this.markers.clearLayers();
            try { const el = document.getElementById('mapPointsCount'); if (el) el.textContent = `0 points affichés`; } catch (e) { }
            try { window.eventBus?.emit?.('map.markers.updated', { count: 0 }); } catch (e) { /* ignore */ }
        } catch (e) { console.error('MapManager.clear erreur:', e); }
    }

    /**
     * Retourne le nombre de markers actuels
     */
    getMarkerCount() {
        try {
            if (!this.markers) return 0;
            return this.markers.getLayers().length;
        } catch (e) { return 0; }
    }

    /** Retourne un objet diagnostique simple */
    diagnostics() {
        try {
            return {
                mapInitialized: !!this.map,
                markers: this.getMarkerCount(),
                heatLayer: !!this.heatLayer
            };
        } catch (e) {
            return { mapInitialized: !!this.map, markers: 0, heatLayer: !!this.heatLayer };
        }
    }

    /**
     * Met à jour la couleur d'un marker existant (par id)
     */
    updateMarkerColor(householdId, newStatus) {
        try {
            if (!this.markers) return;
            const layers = this.markers.getLayers();
            layers.forEach(layer => {
                try {
                    if (layer?.options?._customId === householdId) {
                        const newColor = this.getColor(newStatus);
                        const newIcon = L.divIcon({
                            className: 'custom-flag-marker',
                            html: `
                                <div style="position: relative;">
                                    <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
                                        <line x1="5" y1="0" x2="5" y2="40" stroke="#333" stroke-width="2"/>
                                        <path d="M 5 2 L 25 2 L 25 18 L 15 14 L 5 18 Z" fill="${newColor}" stroke="#fff" stroke-width="1.5"/>
                                    </svg>
                                </div>
                            `,
                            iconSize: [30, 40],
                            iconAnchor: [5, 40],
                            popupAnchor: [10, -35]
                        });
                        layer.setIcon(newIcon);
                    }
                } catch (inner) { /* skip marker */ }
            });
        } catch (e) {
            console.error('MapManager.updateMarkerColor erreur:', e);
        }
    }

    getStatusColorClass(status) {
        if (!status) return 'text-gray-500';
        const s = status.toLowerCase();
        if (s.includes('terminé') || s.includes('conforme') || s.includes('ok')) return 'text-green-600 font-bold';
        if (s.includes('cours')) return 'text-orange-600 font-bold';
        if (s.includes('problème') || s.includes('non')) return 'text-red-600 font-bold';
        return 'text-gray-600';
    }

    getColor(statut) {
        switch (statut) {
            case 'Terminé': return '#10B981'; // Green
            case 'En cours': return '#F59E0B'; // Orange
            case 'Problème': return '#EF4444'; // Red
            default: return '#6B7280'; // Gray
        }
    }
}

// La classe est exposée globalement
window.MapManager = MapManager;
