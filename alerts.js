/**
 * Alert System - Alertes Intelligentes
 * Système d'alertes multi-niveaux pour anticiper les problèmes
 */

const AlertSystem = {
    levels: {
        CRITICAL: {
            color: 'red',
            bgColor: 'bg-red-100',
            textColor: 'text-red-800',
            borderColor: 'border-red-500',
            icon: 'exclamation-triangle',
            priority: 1
        },
        URGENT: {
            color: 'orange',
            bgColor: 'bg-orange-100',
            textColor: 'text-orange-800',
            borderColor: 'border-orange-500',
            icon: 'exclamation-circle',
            priority: 2
        },
        WARNING: {
            color: 'yellow',
            bgColor: 'bg-yellow-100',
            textColor: 'text-yellow-800',
            borderColor: 'border-yellow-500',
            icon: 'exclamation',
            priority: 3
        },
        INFO: {
            color: 'blue',
            bgColor: 'bg-blue-100',
            textColor: 'text-blue-800',
            borderColor: 'border-blue-500',
            icon: 'info-circle',
            priority: 4
        }
    },

    /**
     * Vérifie les risques de retard basés sur les prédictions
     */
    checkDelayRisk: function (zones, currentDay, plannedDuration) {
        const alerts = [];

        if (!zones || zones.length === 0) return alerts;

        zones.forEach(zone => {
            if (!zone.isComplete && window.Analytics) {
                const predicted = window.Analytics.predictEndDate(zone, currentDay);

                if (predicted) {
                    const delay = predicted - plannedDuration;

                    if (delay > 14) {
                        alerts.push({
                            level: 'CRITICAL',
                            region: zone.name,
                            message: `Retard important prévu : ${delay} jours`,
                            action: 'Ajouter des équipes ou réviser le planning',
                            impact: `Risque de dépassement budgétaire`,
                            timestamp: new Date()
                        });
                    } else if (delay > 7) {
                        alerts.push({
                            level: 'URGENT',
                            region: zone.name,
                            message: `Risque de retard : ${delay} jours`,
                            action: 'Surveiller de près et préparer un plan d\'action',
                            timestamp: new Date()
                        });
                    } else if (delay > 3) {
                        alerts.push({
                            level: 'WARNING',
                            region: zone.name,
                            message: `Léger retard possible : ${delay} jours`,
                            action: 'Maintenir la vigilance',
                            timestamp: new Date()
                        });
                    }
                }
            }
        });

        return alerts;
    },

    /**
     * Vérifie les baisses de productivité
     */
    checkProductivityDrop: function (zones) {
        const alerts = [];

        if (!zones || zones.length === 0 || !window.Analytics) return alerts;

        zones.forEach(zone => {
            if (zone.isComplete) return;

            const trend = window.Analytics.detectTrend(zone);

            if (trend.trend === 'declining') {
                const last7 = zone.metrics.productivity.slice(-7);
                const prev7 = zone.metrics.productivity.slice(-14, -7);

                if (last7.length > 0 && prev7.length > 0) {
                    const avgLast = window.Analytics.mean(last7);
                    const avgPrev = window.Analytics.mean(prev7);

                    if (avgPrev > 0) {
                        const drop = ((avgPrev - avgLast) / avgPrev) * 100;

                        if (drop > 30) {
                            alerts.push({
                                level: 'CRITICAL',
                                region: zone.name,
                                message: `Chute de productivité sévère : -${drop.toFixed(1)}%`,
                                action: 'Intervention urgente requise',
                                details: `Moyenne actuelle: ${avgLast.toFixed(1)} vs précédente: ${avgPrev.toFixed(1)} ménages/jour`,
                                timestamp: new Date()
                            });
                        } else if (drop > 15) {
                            alerts.push({
                                level: 'WARNING',
                                region: zone.name,
                                message: `Productivité en baisse : -${drop.toFixed(1)}%`,
                                action: 'Investiguer les causes terrain',
                                details: `Moyenne actuelle: ${avgLast.toFixed(1)} vs précédente: ${avgPrev.toFixed(1)} ménages/jour`,
                                timestamp: new Date()
                            });
                        }
                    }
                }
            }
        });

        return alerts;
    },

    /**
     * Vérifie les zones sous-performantes (vélocité faible)
     */
    checkLowVelocity: function (zones, plannedDuration) {
        const alerts = [];

        if (!zones || zones.length === 0 || !window.Analytics) return alerts;

        zones.forEach(zone => {
            if (zone.isComplete) return;

            const velocity = window.Analytics.calculateVelocity(zone, plannedDuration);

            if (velocity.status === 'behind' && velocity.ratio < 0.7) {
                alerts.push({
                    level: 'URGENT',
                    region: zone.name,
                    message: `Vélocité insuffisante : ${(velocity.ratio * 100).toFixed(0)}% de la cible`,
                    action: 'Renforcer les équipes ou optimiser les processus',
                    details: `Productivité actuelle: ${velocity.current.toFixed(1)} vs cible: ${velocity.target.toFixed(1)} ménages/jour`,
                    timestamp: new Date()
                });
            }
        });

        return alerts;
    },

    /**
     * Collecte toutes les alertes
     */
    checkAll: function (zones, currentDay, plannedDuration) {
        const allAlerts = [
            ...this.checkDelayRisk(zones, currentDay, plannedDuration),
            ...this.checkProductivityDrop(zones),
            ...this.checkLowVelocity(zones, plannedDuration)
        ];

        // Trier par priorité
        allAlerts.sort((a, b) => {
            const levelA = this.levels[a.level];
            const levelB = this.levels[b.level];
            return levelA.priority - levelB.priority;
        });

        return allAlerts;
    },

    /**
     * Affiche les alertes dans le dashboard
     */
    renderAlerts: function (alerts) {
        const alertSection = document.getElementById('alertSection');
        if (!alertSection) return;

        if (!alerts || alerts.length === 0) {
            alertSection.innerHTML = '';
            return;
        }

        alertSection.innerHTML = '';

        alerts.forEach(alert => {
            const level = this.levels[alert.level];
            const div = document.createElement('div');
            div.className = `${level.bgColor} ${level.borderColor} border-l-4 p-4 mb-3 rounded-r`;

            div.innerHTML = `
                <div class="flex items-start">
                    <div class="flex-shrink-0">
                        <i class="fas fa-${level.icon} ${level.textColor} text-xl"></i>
                    </div>
                    <div class="ml-3 flex-1">
                        <h3 class="text-sm font-medium ${level.textColor}">
                            ${alert.region ? `[${alert.region}] ` : ''}${alert.message}
                        </h3>
                        ${alert.action ? `<p class="mt-1 text-sm ${level.textColor} opacity-90">
                            <strong>Action recommandée :</strong> ${alert.action}
                        </p>` : ''}
                        ${alert.details ? `<p class="mt-1 text-xs ${level.textColor} opacity-75">
                            ${alert.details}
                        </p>` : ''}
                        ${alert.impact ? `<p class="mt-1 text-xs ${level.textColor} opacity-75">
                            <strong>Impact :</strong> ${alert.impact}
                        </p>` : ''}
                    </div>
                </div>
            `;

            alertSection.appendChild(div);
        });
    }
};

// Export pour utilisation globale
if (typeof window !== 'undefined') {
    window.AlertSystem = AlertSystem;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AlertSystem;
}
