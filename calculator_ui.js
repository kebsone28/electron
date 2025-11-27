/**
 * Interface Utilisateur - Calculateur Intelligent de Ressources
 * Utilise les zones du panneau "Découpage Géographique" et le nombre total du panneau "Projet"
 */

const CalculatorUI = {
    init: function () {
        this.attachEventListeners();
        this.updateUI();
        // listen to total houses input changes
        const totalInput = document.getElementById('totalHouses');
        if (totalInput) {
            totalInput.addEventListener('input', () => this.updateUI());
            totalInput.addEventListener('change', () => this.updateUI());
        }
        // periodic check in case zones are updated elsewhere
        setInterval(() => this.updateUI(), 1000);
        // custom events from other panels
        document.addEventListener('zonesUpdated', () => this.updateUI());
        document.addEventListener('zoneAdded', () => this.updateUI());
        document.addEventListener('zoneRemoved', () => this.updateUI());
    },

    attachEventListeners: function () {
        const optimizeBtn = document.getElementById('optimizeConfigBtn');
        const quickBtn = document.getElementById('quickOptimizeBtn');
        const paymentMacons = document.getElementById('paymentMacons');
        if (optimizeBtn) {
            optimizeBtn.addEventListener('click', () => this.runOptimization());
        }
        if (quickBtn) {
            quickBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.runOptimization();
            });
        }
        if (paymentMacons) {
            paymentMacons.addEventListener('change', (e) => {
                this.toggleMasonryModelSelect(e.target.value === 'subcontract');
            });
        }
    },

    getZones: function () {
        const state = window.appState || (typeof appState !== 'undefined' ? appState : undefined);
        // Prefer zones defined in the project configuration
        if (state && state.project && Array.isArray(state.project.zones)) {
            console.log('getZones: found state.project.zones', state.project.zones);
            return state.project.zones.filter(z => z.name && z.houses > 0);
        }
        // Fallback to legacy state.zones if present
        if (state && Array.isArray(state.zones)) {
            console.log('getZones: found state.zones (legacy)', state.zones);
            return state.zones.filter(z => z.name && z.houses > 0);
        }
        console.log('getZones: no zones found in state');
        return [];
    },

    getTotalHouses: function () {
        const input = document.getElementById('totalHouses');
        const val = input ? parseInt(input.value) || 0 : 0;
        console.log('getTotalHouses:', val, 'input found:', !!input);
        return val;
    },

    validateZones: function () {
        const zones = this.getZones();
        const total = this.getTotalHouses();
        console.log('validateZones:', { zonesLength: zones.length, totalHouses: total });
        return zones.length > 0 && total > 0;
    },

    updateUI: function () {
        console.log('updateUI called');
        this.updateType1Type2Fields();
        this.updateOptimizeButton();
        this.updateValidationMessage();
    },

    updateType1Type2Fields: function () {
        const type1 = document.getElementById('type1Houses');
        const type2 = document.getElementById('type2Houses');
        if (!type1 || !type2) return;
        const has = this.validateZones();
        const total = this.getTotalHouses();
        type1.disabled = !has;
        type2.disabled = !has;
        if (has) {
            const t1 = Math.round(total * 0.7);
            const t2 = total - t1;
            if (!type1.value || parseInt(type1.value) === 0) type1.value = t1;
            if (!type2.value || parseInt(type2.value) === 0) type2.value = t2;
        } else {
            type1.value = 0;
            type2.value = 0;
        }
    },

    updateOptimizeButton: function () {
        const mainBtn = document.getElementById('optimizeConfigBtn');
        const quickBtn = document.getElementById('quickOptimizeBtn');
        const valid = this.validateZones();
        if (mainBtn) mainBtn.disabled = !valid;
        if (quickBtn) quickBtn.disabled = !valid;
    },

    updateValidationMessage: function () {
        const msg = document.getElementById('validationMessage');
        if (!msg) return;
        const zones = this.getZones();
        const total = this.getTotalHouses();
        if (!this.validateZones()) {
            msg.style.display = 'block';
            msg.className = 'warning p-4 rounded-lg mb-6';
            if (zones.length === 0 && total === 0) {
                msg.innerHTML = `<i class="fas fa-exclamation-triangle"></i><strong>Configuration optimisée impossible</strong><br>Veuillez créer des zones dans "Découpage Géographique" ET renseigner le nombre total de ménages dans "Projet".`;
            } else if (zones.length === 0) {
                msg.innerHTML = `<i class="fas fa-exclamation-triangle"></i><strong>Zones manquantes</strong><br>Veuillez créer des zones dans "Découpage Géographique / Zones".`;
            } else if (total === 0) {
                msg.innerHTML = `<i class="fas fa-exclamation-triangle"></i><strong>Nombre de ménages manquant</strong><br>Veuillez renseigner le nombre total de ménages dans le panneau "Projet".`;
            }
        } else {
            msg.style.display = 'block';
            msg.className = 'success p-4 rounded-lg mb-6';
            msg.innerHTML = `<i class="fas fa-check-circle"></i><strong>Prêt pour l'optimisation :</strong> ${zones.length} zone(s), ${total} ménages<br>Cliquez sur le bouton pour calculer la configuration optimisée.`;
        }
    },

    toggleMasonryModelSelect: function (show) {
        const container = document.getElementById('masonryModelSelect');
        if (container) container.style.display = show ? 'block' : 'none';
    },

    runOptimization: function () {
        if (!this.validateZones()) {
            alert('❌ Veuillez créer des zones ET renseigner le nombre total de ménages');
            return;
        }
        const zones = this.getZones();
        const total = this.getTotalHouses();
        const targetDuration = parseInt(document.getElementById('targetDuration')?.value) || 180;
        const type1 = parseInt(document.getElementById('type1Houses')?.value) || 0;
        const type2 = parseInt(document.getElementById('type2Houses')?.value) || 0;
        const masonryModel = document.getElementById('masonryModel')?.value || 'model1_standard';
        const paymentModes = {
            preparateurs: document.getElementById('paymentPrep')?.value || 'daily',
            livraison: document.getElementById('paymentLiv')?.value || 'daily',
            macons: document.getElementById('paymentMacons')?.value || 'daily',
            reseau: document.getElementById('paymentReseau')?.value || 'daily',
            interiorType1: document.getElementById('paymentInt1')?.value || 'daily',
            interiorType2: document.getElementById('paymentInt2')?.value || 'daily',
            controle: document.getElementById('paymentCtrl')?.value || 'daily'
        };
        const config = ResourceCalculator.calculateAuto(
            total,
            targetDuration,
            paymentModes,
            masonryModel,
            type1,
            type2,
            zones
        );
        if (config.error) this.displayError(config);
        else {
            this.displayResults(config);
            this.saveConfig(config);
        }
    },

    displayError: function (err) {
        const el = document.getElementById('calculatorResults');
        if (el) {
            el.style.display = 'block';
            el.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i><h3>${err.message}</h3><p>${err.details}</p><p class="action">${err.action}</p></div>`;
        }
    },

    displayResults: function (cfg) {
        // Au lieu d'afficher les résultats dans un panneau séparé,
        // on applique directement la configuration aux champs du formulaire
        this.applyConfig(cfg);
        this.saveConfig(cfg);
    },

    applyConfig: function (cfg) {
        if (!cfg) return;
        const state = window.appState || (typeof appState !== 'undefined' ? appState : undefined);
        if (!state) return;

        // Update zones with calculated teams
        if (cfg.zoneAllocation && cfg.zoneAllocation.byZone && state.project.zones) {
            cfg.zoneAllocation.byZone.forEach((zoneCalc, index) => {
                if (state.project.zones[index]) {
                    // Initialize teams object if it doesn't exist
                    if (!state.project.zones[index].teams) {
                        state.project.zones[index].teams = {};
                    }
                    // Update teams for this zone
                    state.project.zones[index].teams = {
                        preparateurs: zoneCalc.teams.preparateurs || 0,
                        livraison: zoneCalc.teams.livraison || 0,
                        macons: zoneCalc.teams.macons || 0,
                        reseau: zoneCalc.teams.reseau || 0,
                        interiorType1: zoneCalc.teams.interiorType1 || 0,
                        interiorType2: zoneCalc.teams.interiorType2 || 0,
                        controle: zoneCalc.teams.controle || 0
                    };
                }
            });
        }

        // Update parameters in appState (will be recalculated from zones by updateTeamsSummary)
        state.parameters.prepRate = cfg.prepRate;
        state.parameters.deliveryRate = cfg.deliveryRate;
        state.parameters.masonRate = cfg.masonRate;
        state.parameters.networkRate = cfg.networkRate;
        state.parameters.interiorRateType1 = cfg.interiorRateType1;
        state.parameters.interiorRateType2 = cfg.interiorRateType2;
        state.parameters.controlRate = cfg.controlRate;

        state.parameters.supervisorCount = cfg.supervisorCount;
        state.parameters.deliveryAgentCount = cfg.deliveryAgentCount;
        state.parameters.driverCount = cfg.driverCount;

        // Update vehicle counts
        state.parameters.pmVehicleCount = cfg.pmVehicleCount;
        state.parameters.controllerVehicleCount = cfg.controllerVehicleCount;
        state.parameters.networkInstallerVehicleCount = cfg.networkInstallerVehicleCount;
        state.parameters.deliveryTruckCount = cfg.deliveryTruckCount;

        // Re-render zones to show updated teams
        if (typeof renderZones === 'function') {
            renderZones();
        }

        // Fill production rate fields
        this.setFieldValue('prepRate', cfg.prepRate);
        this.setFieldValue('deliveryRate', cfg.deliveryRate);
        this.setFieldValue('masonRate', cfg.masonRate);
        this.setFieldValue('networkRate', cfg.networkRate);
        this.setFieldValue('interiorRateType1', cfg.interiorRateType1);
        this.setFieldValue('interiorRateType2', cfg.interiorRateType2);
        this.setFieldValue('controlRate', cfg.controlRate);

        // Fill staff fields
        this.setFieldValue('supervisorCount', cfg.supervisorCount);
        this.setFieldValue('deliveryAgentCount', cfg.deliveryAgentCount);
        this.setFieldValue('driverCount', cfg.driverCount);

        // Fill vehicle fields
        this.setFieldValue('pmVehicleCount', cfg.pmVehicleCount);
        this.setFieldValue('controllerVehicleCount', cfg.controllerVehicleCount);
        this.setFieldValue('networkInstallerVehicleCount', cfg.networkInstallerVehicleCount);
        this.setFieldValue('deliveryTruckCount', cfg.deliveryTruckCount);

        // Modes d'acquisition (si disponibles dans cfg)
        if (cfg.pmVehicleAcquisition) {
            this.setFieldValue('pmVehicleAcquisition', cfg.pmVehicleAcquisition);
        }
        if (cfg.controllerVehicleAcquisition) {
            this.setFieldValue('controllerVehicleAcquisition', cfg.controllerVehicleAcquisition);
        }
        if (cfg.networkInstallerVehicleAcquisition) {
            this.setFieldValue('networkInstallerVehicleAcquisition', cfg.networkInstallerVehicleAcquisition);
        }
        if (cfg.deliveryTruckAcquisition) {
            this.setFieldValue('deliveryTruckAcquisition', cfg.deliveryTruckAcquisition);
        }

        // Save changes
        if (typeof saveParameters === 'function') {
            saveParameters();
        }

        // Notify user
        if (typeof showNotification === 'function') {
            showNotification('✅ Configuration optimisée appliquée ! Les équipes ont été réparties dans vos zones.', 'success');
        } else {
            alert('✅ Configuration optimisée appliquée !');
        }

        // Scroll to zones section to see changes
        const zonesSection = document.querySelector('#zonesContainer');
        if (zonesSection) {
            zonesSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    },

    setFieldValue: function (fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value;
            // Trigger change event to ensure any listeners are notified
            field.dispatchEvent(new Event('change', { bubbles: true }));
        }
    },

    renderTeamsAllocation: function (cfg) {
        if (!cfg.zoneAllocation) return '';
        const t = cfg.zoneAllocation.totalTeams;
        return `<div class="section teams-allocation"><h4>👥 Allocation des Équipes</h4><div class="teams-grid">
            <div class="team-card"><span class="label">Préparateurs</span><span class="value">${t.preparateurs}</span></div>
            <div class="team-card"><span class="label">Livraison</span><span class="value">${t.livraison}</span></div>
            <div class="team-card"><span class="label">Maçons</span><span class="value">${t.macons}</span></div>
            <div class="team-card"><span class="label">Réseau</span><span class="value">${t.reseau}</span></div>
            <div class="team-card"><span class="label">Intérieur Type 1</span><span class="value">${t.interiorType1}</span></div>
            <div class="team-card"><span class="label">Intérieur Type 2</span><span class="value">${t.interiorType2}</span></div>
            <div class="team-card"><span class="label">Contrôle</span><span class="value">${t.controle}</span></div>
        </div></div>`;
    },

    renderCostsBreakdown: function (cfg) {
        if (!cfg.estimatedCosts) return '';
        const c = cfg.estimatedCosts;
        return `<div class="section costs-breakdown"><h4>💰 Estimation des Coûts</h4><div class="costs-summary">
            <div class="cost-item"><span class="label">Main d'œuvre</span><span class="value">${this.formatCurrency(c.laborTotal)}</span></div>
            <div class="cost-item"><span class="label">Logistique</span><span class="value">${this.formatCurrency(c.logisticsTotal)}</span></div>
            <div class="cost-item"><span class="label">Matériel</span><span class="value">${this.formatCurrency(c.materialsTotal)}</span></div>
            <div class="cost-item total"><span class="label"><strong>TOTAL</strong></span><span class="value"><strong>${this.formatCurrency(c.total)}</strong></span></div>
            <div class="cost-item"><span class="label">Coût par ménage</span><span class="value">${this.formatCurrency(c.costPerHouse)}</span></div>
        </div>${c.materials ? this.renderMaterialsDetail(c.materials) : ''}</div>`;
    },

    renderMaterialsDetail: function (m) {
        return `<div class="materials-detail"><h5>Détail Matériel</h5>${m.potelets ? `<p>Potelets galva 4m : ${this.formatCurrency(m.potelets)}</p>` : ''}${m.coffrets ? `<p>Coffrets secondaires (Type 1) : ${this.formatCurrency(m.coffrets)}</p>` : ''}</div>`;
    },

    renderZoneDetails: function (cfg) {
        if (!cfg.zoneAllocation || !cfg.zoneAllocation.byZone) return '';
        const rows = cfg.zoneAllocation.byZone.map(z => `
            <tr>
                <td><strong>${this.escapeHTML(z.zoneName)}</strong></td>
                <td>${z.houses}</td>
                <td>${z.type1Houses}</td>
                <td>${z.type2Houses}</td>
                <td>${Object.values(z.teams).reduce((s, v) => s + v, 0)}</td>
            </tr>`).join('');
        return `<div class="section zone-details"><h4>📍 Détails par Zone</h4><div class="zones-table"><table><thead><tr><th>Zone</th><th>Ménages</th><th>Type 1</th><th>Type 2</th><th>Équipes</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
    },

    formatCurrency: function (amt) {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(amt);
    },

    escapeHTML: function (str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    saveConfig: function (cfg) {
        if (typeof appState !== 'undefined') {
            appState.calculatorConfig = cfg;
            if (typeof saveAppState === 'function') saveAppState();
        }
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CalculatorUI.init());
} else {
    CalculatorUI.init();
}
