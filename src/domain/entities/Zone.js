/**
 * Entité Zone
 * Représente une zone géographique du projet
 */
class Zone extends Entity {
    constructor(id, name, totalHouses, projectId = null) {
        super(id);

        if (!name || name.trim() === '') {
            throw new ValidationError('Zone name is required');
        }
        if (typeof totalHouses !== 'number' || totalHouses <= 0) {
            throw new ValidationError('Total houses must be a positive number');
        }

        this._name = name;
        this._totalHouses = totalHouses;
        this._projectId = projectId;
        this._teams = new Map(); // Map<TeamType, Team[]>
        this._households = [];
        this._completedHouses = 0;
    }

    // Getters
    get name() {
        return this._name;
    }

    get totalHouses() {
        return this._totalHouses;
    }

    get projectId() {
        return this._projectId;
    }

    get completedHouses() {
        return this._completedHouses;
    }

    get teams() {
        return new Map(this._teams);
    }

    get households() {
        return [...this._households];
    }

    /**
     * Assigne une équipe à la zone
     */
    assignTeam(teamType, team) {
        if (!Object.values(TeamType).includes(teamType)) {
            throw new ValidationError(`Invalid team type: ${teamType}`);
        }

        if (!this._teams.has(teamType)) {
            this._teams.set(teamType, []);
        }

        const teams = this._teams.get(teamType);
        if (teams.some(t => t.id === team.id)) {
            throw new DuplicateEntityError('Team', team.id);
        }

        teams.push(team);
        this.touch();

        this.emit('zone.team.assigned', {
            zoneId: this.id,
            teamType,
            teamId: team.id
        });

        return this;
    }

    /**
     * Retire une équipe de la zone
     */
    unassignTeam(teamType, teamId) {
        if (!this._teams.has(teamType)) {
            return this;
        }

        const teams = this._teams.get(teamType);
        const index = teams.findIndex(t => t.id === teamId);

        if (index > -1) {
            teams.splice(index, 1);
            this.touch();

            this.emit('zone.team.unassigned', {
                zoneId: this.id,
                teamType,
                teamId
            });
        }

        return this;
    }

    /**
     * Obtient toutes les équipes d'un type
     */
    getTeamsByType(teamType) {
        return this._teams.get(teamType) || [];
    }

    /**
     * Obtient le nombre total d'équipes
     */
    getTotalTeamCount() {
        let count = 0;
        for (const teams of this._teams.values()) {
            count += teams.length;
        }
        return count;
    }

    /**
     * Vérifie si toutes les équipes nécessaires sont assignées
     */
    hasAllRequiredTeams() {
        const requiredTypes = [
            TeamType.PREPARATEURS,
            TeamType.LIVRAISON,
            TeamType.MACONS,
            TeamType.RESEAU,
            TeamType.INTERIEUR_TYPE1,
            TeamType.CONTROLE
        ];

        return requiredTypes.every(type =>
            this._teams.has(type) && this._teams.get(type).length > 0
        );
    }

    /**
     * Ajoute un ménage à la zone
     */
    addHousehold(household) {
        if (!(household instanceof Household)) {
            throw new ValidationError('Parameter must be a Household instance');
        }

        if (this._households.some(h => h.id === household.id)) {
            throw new DuplicateEntityError('Household', household.id);
        }

        this._households.push(household);
        this.touch();

        return this;
    }

    /**
     * Met à jour le nombre de ménages complétés
     */
    updateCompletedHouses(count) {
        if (count < 0 || count > this._totalHouses) {
            throw new ValidationError('Invalid completed houses count');
        }

        this._completedHouses = count;
        this.touch();

        this.emit('zone.progress.updated', {
            zoneId: this.id,
            completedHouses: count,
            progress: this.getProgress()
        });

        return this;
    }

    /**
     * Calcule le pourcentage de progression
     */
    getProgress() {
        return (this._completedHouses / this._totalHouses) * 100;
    }

    /**
     * Vérifie si la zone est terminée
     */
    isCompleted() {
        return this._completedHouses >= this._totalHouses;
    }

    /**
     * Calcule la durée estimée avec les équipes actuelles
     */
    calculateEstimatedDuration(productivityRates) {
        let maxDuration = 0;

        for (const [teamType, teams] of this._teams.entries()) {
            if (teams.length === 0) continue;

            const rate = productivityRates[teamType];
            if (!rate) continue;

            const duration = rate.calculateDuration(this._totalHouses, teams.length);
            maxDuration = Math.max(maxDuration, duration);
        }

        return maxDuration;
    }

    /**
     * Obtient les ménages par statut
     */
    getHouseholdsByStatus(status) {
        return this._households.filter(h => h.status === status);
    }

    /**
     * Obtient des statistiques sur la zone
     */
    getStats() {
        const statusCounts = {};
        for (const status of Object.values(HouseholdStatus)) {
            statusCounts[status] = this.getHouseholdsByStatus(status).length;
        }

        return {
            totalHouses: this._totalHouses,
            completedHouses: this._completedHouses,
            progress: this.getProgress(),
            totalTeams: this.getTotalTeamCount(),
            householdsByStatus: statusCounts,
            hasAllRequiredTeams: this.hasAllRequiredTeams()
        };
    }

    /**
     * Sérialisation JSON
     */
    toJSON() {
        const teamsArray = [];
        for (const [type, teams] of this._teams.entries()) {
            teamsArray.push({
                type,
                teams: teams.map(t => t.toJSON())
            });
        }

        return {
            ...super.toJSON(),
            name: this._name,
            totalHouses: this._totalHouses,
            projectId: this._projectId,
            teams: teamsArray,
            households: this._households.map(h => h.toJSON()),
            completedHouses: this._completedHouses
        };
    }

    /**
     * Désérialisation JSON
     */
    static fromJSON(data) {
        const zone = new Zone(
            data.id,
            data.name,
            data.totalHouses,
            data.projectId
        );

        // Reconstruire les équipes
        if (data.teams) {
            for (const { type, teams } of data.teams) {
                zone._teams.set(type, teams.map(t => Team.fromJSON(t)));
            }
        }

        // Reconstruire les ménages
        if (data.households) {
            zone._households = data.households.map(h => Household.fromJSON(h));
        }

        zone._completedHouses = data.completedHouses || 0;
        zone._createdAt = new Date(data.createdAt);
        zone._updatedAt = new Date(data.updatedAt);

        return zone;
    }
}

// Export pour utilisation globale
if (typeof window !== 'undefined') {
    window.Zone = Zone;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Zone;
}
