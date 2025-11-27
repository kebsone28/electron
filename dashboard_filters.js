// ===== DASHBOARD FILTERS & REGIONAL TABLE =====

// Active filters state
let dashboardFilters = {
    region: '',
    team: '',
    period: 'all'
};

// Initialize filters on dashboard load
function initializeDashboardFilters() {
    const filterRegion = document.getElementById('filterRegion');
    const filterTeam = document.getElementById('filterTeam');
    const filterPeriod = document.getElementById('filterPeriod');
    const applyBtn = document.getElementById('applyFilters');

    if (!filterRegion) return; // Not on dashboard page

    // Populate region filter from zones
    populateRegionFilter();

    // Wire apply button
    if (applyBtn) {
        applyBtn.onclick = applyDashboardFilters;
    }
}

// Populate region dropdown with available zones
function populateRegionFilter() {
    const filterRegion = document.getElementById('filterRegion');
    if (!filterRegion) return;

    const zones = appState.project.zones || [];

    // Clear existing options except "All"
    filterRegion.innerHTML = '<option value="">Toutes les régions</option>';

    zones.forEach(zone => {
        const option = document.createElement('option');
        option.value = zone.name;
        option.textContent = zone.name;
        filterRegion.appendChild(option);
    });
}

// Apply filters and refresh dashboard
function applyDashboardFilters() {
    const filterRegion = document.getElementById('filterRegion');
    const filterTeam = document.getElementById('filterTeam');
    const filterPeriod = document.getElementById('filterPeriod');

    dashboardFilters = {
        region: filterRegion ? filterRegion.value : '',
        team: filterTeam ? filterTeam.value : '',
        period: filterPeriod ? filterPeriod.value : 'all'
    };

    // Refresh dashboard with filters
    updateDashboard();
    showNotification('Filtres appliqués', 'info');
}

// Render Regional Progress Table
function renderRegionProgressTable() {
    const tableBody = document.getElementById('regionProgressTable');
    if (!tableBody) return;

    const simResult = appState.simulationResult;
    if (!simResult || !simResult.zoneStates) {
        tableBody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">Aucune donnée de simulation disponible</td></tr>';
        return;
    }

    const zones = simResult.zoneStates;

    // Apply region filter
    const filteredZones = dashboardFilters.region
        ? zones.filter(z => z.name === dashboardFilters.region)
        : zones;

    if (filteredZones.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">Aucune région ne correspond aux filtres</td></tr>';
        return;
    }

    tableBody.innerHTML = '';

    filteredZones.forEach(zone => {
        const progress = zone.total > 0 ? Math.round((zone.stocks.fini / zone.total) * 100) : 0;
        const totalTeams = zone.teams ? Object.values(zone.teams).reduce((sum, count) => sum + (count || 0), 0) : 0;
        const duration = zone.duration || simResult.duration;

        // Determine status
        let statusClass = '';
        let statusText = '';
        if (zone.isComplete) {
            statusClass = 'bg-green-100 text-green-800';
            statusText = 'Terminé';
        } else if (progress >= 75) {
            statusClass = 'bg-blue-100 text-blue-800';
            statusText = 'En cours';
        } else if (progress >= 50) {
            statusClass = 'bg-yellow-100 text-yellow-800';
            statusText = 'En cours';
        } else {
            statusClass = 'bg-gray-100 text-gray-800';
            statusText = 'Démarrage';
        }

        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${escapeHTML(zone.name)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatNumber(zone.total)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatNumber(zone.stocks.fini)}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div class="bg-indigo-600 h-2 rounded-full" style="width: ${progress}%"></div>
                    </div>
                    <span class="text-sm text-gray-700">${progress}%</span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${totalTeams}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${duration}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                    ${statusText}
                </span>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// ===== PHASE 3: ADVANCED CHARTS =====

// Render Zone Progress Chart (Curves)
function renderZoneProgressChart() {
    const chartDiv = document.getElementById('zoneProgressChart');
    if (!chartDiv) return;

    const simResult = appState.simulationResult;
    if (!simResult || !simResult.zoneStates) {
        chartDiv.innerHTML = '<p class="text-gray-500 text-center">Aucune donnée disponible</p>';
        return;
    }

    const zones = simResult.zoneStates;

    // Create trace for each zone
    const traces = zones.map(zone => {
        return {
            x: zone.metrics.days,
            y: zone.metrics.dailyProgress,
            name: zone.name,
            type: 'scatter',
            mode: 'lines+markers',
            line: { width: 2 }
        };
    });

    const layout = {
        title: 'Progression par Région',
        xaxis: { title: 'Jours' },
        yaxis: { title: 'Ménages Terminés' },
        hovermode: 'closest'
    };

    Plotly.newPlot('zoneProgressChart', traces, layout);
}

// Render Productivity Comparison Chart
function renderProductivityComparisonChart() {
    const chartDiv = document.getElementById('productivityComparisonChart');
    if (!chartDiv) return;

    const simResult = appState.simulationResult;
    if (!simResult || !simResult.zoneStates || !window.Analytics) {
        chartDiv.innerHTML = '<p class="text-gray-500 text-center">Aucune donnée disponible</p>';
        return;
    }

    const zones = simResult.zoneStates;

    // Calculate average productivity per zone
    const data = zones.map(zone => {
        const avgProd = Analytics.mean(zone.metrics.productivity);
        return {
            zone: zone.name,
            productivity: avgProd
        };
    });

    const trace = {
        x: data.map(d => d.zone),
        y: data.map(d => d.productivity),
        type: 'bar',
        marker: {
            color: data.map(d => d.productivity > 5 ? '#10b981' : '#f59e0b')
        }
    };

    const layout = {
        title: 'Productivité Moyenne par Région',
        xaxis: { title: 'Région' },
        yaxis: { title: 'Ménages/jour' }
    };

    Plotly.newPlot('productivityComparisonChart', [trace], layout);
}

// ===== PHASE 3: OPTIMIZATION SUGGESTIONS =====

// Generate optimization suggestions
function generateOptimizationSuggestions() {
    const simResult = appState.simulationResult;
    if (!simResult || !simResult.zoneStates || !window.Analytics) return [];

    const zones = simResult.zoneStates;
    const suggestions = [];

    // 1. Identify critical path
    const criticalPath = Analytics.findCriticalPath(zones);
    if (criticalPath.length > 0) {
        const bottleneck = criticalPath[0];
        suggestions.push({
            type: 'critical-path',
            icon: 'exclamation-triangle',
            color: 'red',
            title: 'Chemin Critique Identifié',
            message: `La région "${bottleneck.name}" détermine la durée globale du projet (${bottleneck.duration} jours)`,
            action: 'Prioriser cette région pour réduire la durée totale',
            confidence: 95
        });
    }

    // 2. Load imbalance
    const utilizations = zones.map(z => ({
        name: z.name,
        util: Analytics.calculateUtilization(z)
    }));

    const overloaded = utilizations.filter(u => u.util > 0.85);
    const underloaded = utilizations.filter(u => u.util < 0.50);

    if (overloaded.length > 0 && underloaded.length > 0) {
        suggestions.push({
            type: 'reallocation',
            icon: 'exchange-alt',
            color: 'orange',
            title: 'Opportunité de Réallocation',
            message: `"${underloaded[0].name}" est sous-utilisée (${(underloaded[0].util * 100).toFixed(0)}%) tandis que "${overloaded[0].name}" est surchargée (${(overloaded[0].util * 100).toFixed(0)}%)`,
            action: 'Envisager de transférer 1-2 équipes pour équilibrer',
            confidence: 75
        });
    }

    // 3. Best performing zones
    const stats = Analytics.calculateGlobalStats(zones);
    if (stats.fastestZone && stats.slowestZone) {
        const timeDiff = stats.slowestZone.duration - stats.fastestZone.duration;
        if (timeDiff > 10) {
            suggestions.push({
                type: 'best-practice',
                icon: 'lightbulb',
                color: 'blue',
                title: 'Apprentissage Inter-Régions',
                message: `"${stats.fastestZone.name}" est ${timeDiff} jours plus rapide que "${stats.slowestZone.name}"`,
                action: 'Analyser les pratiques de la région performante pour les répliquer',
                confidence: 60
            });
        }
    }

    return suggestions;
}

// Render optimization suggestions
function renderOptimizationSuggestions() {
    const container = document.getElementById('optimizationSuggestions');
    if (!container) return;

    const suggestions = generateOptimizationSuggestions();

    if (suggestions.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm italic">Aucune suggestion d\'optimisation pour le moment.</p>';
        return;
    }

    container.innerHTML = '';

    suggestions.forEach(sug => {
        const colorClasses = {
            red: 'bg-red-50 border-red-200 text-red-800',
            orange: 'bg-orange-50 border-orange-200 text-orange-800',
            blue: 'bg-blue-50 border-blue-200 text-blue-800',
            green: 'bg-green-50 border-green-200 text-green-800'
        };

        const div = document.createElement('div');
        div.className = `border-l-4 p-4 ${colorClasses[sug.color] || colorClasses.blue}`;

        div.innerHTML = `
            <div class="flex items-start">
                <i class="fas fa-${sug.icon} text-lg mr-3 mt-1"></i>
                <div class="flex-1">
                    <h4 class="font-semibold text-sm">${sug.title}</h4>
                    <p class="text-sm mt-1">${sug.message}</p>
                    <p class="text-sm mt-2 font-medium">
                        <i class="fas fa-arrow-right mr-1"></i> ${sug.action}
                    </p>
                    <p class="text-xs mt-2 opacity-75">
                        Confiance: ${sug.confidence}%
                    </p>
                </div>
            </div>
        `;

        container.appendChild(div);
    });
}

// ===== PHASE 3: ENHANCED KPIs =====

// Update enhanced KPIs
function updateEnhancedKPIs() {
    const simResult = appState.simulationResult;
    if (!simResult || !simResult.zoneStates || !window.Analytics) return;

    const stats = Analytics.calculateGlobalStats(simResult.zoneStates);

    // Fastest region
    const fastestEl = document.getElementById('fastestRegion');
    const fastestDurEl = document.getElementById('fastestRegionDuration');
    if (fastestEl && stats.fastestZone) {
        fastestEl.textContent = stats.fastestZone.name;
        if (fastestDurEl) {
            fastestDurEl.textContent = `${stats.fastestZone.duration} jours`;
        }
    }

    // Average productivity
    const avgProdEl = document.getElementById('avgProductivity');
    if (avgProdEl) {
        avgProdEl.textContent = stats.avgProductivity.toFixed(1);
    }
}

// ===== INTEGRATION =====

// Add to updateDashboard function
const originalUpdateDashboard = updateDashboard;
updateDashboard = function () {
    originalUpdateDashboard();

    // Additional dashboard updates
    try {
        populateRegionFilter();
        renderRegionProgressTable();

        // Phase 3 features
        updateEnhancedKPIs();
        renderZoneProgressChart();
        renderProductivityComparisonChart();
        renderOptimizationSuggestions();

        // Display alerts
        if (window.AlertSystem && appState.simulationResult) {
            const alerts = AlertSystem.checkAll(
                appState.simulationResult.zoneStates,
                appState.simulationResult.duration,
                appState.simulationResult.duration
            );
            AlertSystem.renderAlerts(alerts);
        }
    } catch (e) {
        console.warn('Error updating dashboard', e);
    }
};

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDashboardFilters);
} else {
    initializeDashboardFilters();
}
