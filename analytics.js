/**
 * Analytics Engine - Prédictions & Tendances
 * Fournit des capacités d'analyse prédictive pour anticiper les problèmes
 */

const Analytics = {
    /**
     * Calcule la moyenne d'un tableau de nombres
     */
    mean: function (arr) {
        if (!arr || arr.length === 0) return 0;
        return arr.reduce((sum, val) => sum + val, 0) / arr.length;
    },

    /**
     * Régression linéaire simple pour détecter les tendances
     * Retourne { slope, intercept }
     */
    linearRegression: function (yValues) {
        if (!yValues || yValues.length < 2) return { slope: 0, intercept: 0 };

        const n = yValues.length;
        const xValues = Array.from({ length: n }, (_, i) => i);

        const sumX = xValues.reduce((a, b) => a + b, 0);
        const sumY = yValues.reduce((a, b) => a + b, 0);
        const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
        const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        return { slope, intercept };
    },

    /**
     * Prédit la date de fin d'une zone basée sur la productivité récente
     */
    predictEndDate: function (zone, currentDay) {
        if (!zone || !zone.metrics || !zone.metrics.productivity) {
            return null;
        }

        const recentDays = 7;
        const productivity = zone.metrics.productivity.slice(-recentDays);

        if (productivity.length === 0) return null;

        const avgProd = this.mean(productivity);

        if (avgProd === 0) return null;

        const remaining = zone.total - zone.stocks.fini;
        const daysLeft = Math.ceil(remaining / avgProd);

        return currentDay + daysLeft;
    },

    /**
     * Détecte la tendance de productivité d'une zone
     * Retourne { trend: 'declining'|'improving'|'stable', severity: 'warning'|'info', slope }
     */
    detectTrend: function (zone) {
        if (!zone || !zone.metrics || !zone.metrics.productivity || zone.metrics.productivity.length < 7) {
            return { trend: 'stable', severity: 'info', slope: 0 };
        }

        const prod = zone.metrics.productivity;
        const regression = this.linearRegression(prod);
        const slope = regression.slope;

        if (slope < -0.5) {
            return { trend: 'declining', severity: 'warning', slope: slope };
        } else if (slope > 0.5) {
            return { trend: 'improving', severity: 'info', slope: slope };
        } else {
            return { trend: 'stable', severity: 'info', slope: slope };
        }
    },

    /**
     * Calcule la vélocité (vitesse d'avancement) d'une zone
     * Compare la productivité actuelle à la cible
     */
    calculateVelocity: function (zone, plannedDuration) {
        if (!zone || !zone.metrics || !zone.metrics.productivity) {
            return { current: 0, target: 0, ratio: 0, status: 'unknown' };
        }

        const last7Days = zone.metrics.productivity.slice(-7);
        const velocity = this.mean(last7Days);

        const target = plannedDuration > 0 ? zone.total / plannedDuration : 0;
        const ratio = target > 0 ? velocity / target : 0;

        return {
            current: velocity,
            target: target,
            ratio: ratio,
            status: velocity >= target * 0.9 ? 'on-track' : 'behind'
        };
    },

    /**
     * Calcule le taux d'utilisation moyen des équipes d'une zone
     */
    calculateUtilization: function (zone) {
        if (!zone || !zone.metrics || !zone.metrics.utilization) {
            return 0;
        }

        return this.mean(zone.metrics.utilization);
    },

    /**
     * Identifie le chemin critique (zones qui déterminent la durée globale)
     */
    findCriticalPath: function (zones) {
        if (!zones || zones.length === 0) return [];

        // Trier par durée décroissante
        const sorted = [...zones].sort((a, b) => (b.duration || 0) - (a.duration || 0));

        // Le chemin critique est la zone la plus lente
        return sorted.slice(0, 1);
    },

    /**
     * Calcule des statistiques globales sur toutes les zones
     */
    calculateGlobalStats: function (zones) {
        if (!zones || zones.length === 0) {
            return {
                avgProductivity: 0,
                avgUtilization: 0,
                totalCompleted: 0,
                totalRemaining: 0,
                fastestZone: null,
                slowestZone: null
            };
        }

        const productivities = zones.map(z =>
            z.metrics && z.metrics.productivity ? this.mean(z.metrics.productivity) : 0
        );

        const utilizations = zones.map(z => this.calculateUtilization(z));

        const completed = zones.reduce((sum, z) => sum + (z.stocks.fini || 0), 0);
        const remaining = zones.reduce((sum, z) => sum + (z.total - (z.stocks.fini || 0)), 0);

        // Trouver zones les plus rapides/lentes
        const withDuration = zones.filter(z => z.duration > 0);
        const fastest = withDuration.length > 0
            ? withDuration.reduce((min, z) => z.duration < min.duration ? z : min)
            : null;
        const slowest = withDuration.length > 0
            ? withDuration.reduce((max, z) => z.duration > max.duration ? z : max)
            : null;

        return {
            avgProductivity: this.mean(productivities),
            avgUtilization: this.mean(utilizations),
            totalCompleted: completed,
            totalRemaining: remaining,
            fastestZone: fastest,
            slowestZone: slowest
        };
    }
};

// Export pour utilisation globale
if (typeof window !== 'undefined') {
    window.Analytics = Analytics;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Analytics;
}
