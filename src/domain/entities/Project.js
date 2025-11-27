/**
 * Entité Project (Projet)
 * Agrégat racine pour un projet d'électrification
 */
class Project extends Entity {
    constructor(id, name, totalHouses, startDate, zones = []) {
        super(id);

        if (!name || name.trim() === '') {
            throw new ValidationError('Project name is required');
        }
        if (typeof totalHouses !== 'number' || totalHouses <= 0) {
            throw new ValidationError('Total houses must be a positive number');
        }
        if (!(startDate instanceof Date)) {
            throw new ValidationError('Start date must be a Date instance');
        }

        this._name = name;
        this._totalHouses = totalHouses;
        this._startDate = startDate;
        this._endDate = null;
        this._zones = zones;
        this._status = ProjectStatus.PLANNING;
        this._budget = null;
        this._parameters = {};
    }

    // Getters
    get name() {
        return this._name;
    }

    get totalHouses() {
        return this._totalHouses;
    }

    get startDate() {
        return this._startDate;
    }

    get endDate() {
        return this._endDate;
    }

    get zones() {
        return [...this._zones];
    }

    get status() {
        return this._status;
    }

    get budget() {
        return this._budget;
    }

    get parameters() {
        return { ...this._parameters };
    }

    /**
     * Ajoute une zone au projet
     */
    addZone(zone) {
        if (!(zone instanceof Zone)) {
            throw new ValidationError('Parameter must be a Zone instance');
        }

        if (this._zones.some(z => z.id === zone.id)) {
            throw new DuplicateEntityError('Zone', zone.id);
        }

        this._zones.push(zone);
        this.touch();

        this.emit('project.zone.added', {
            projectId: this.id,
            zoneId: zone.id
        });

        return this;
    }

    /**
     * Retire une zone du projet
     */
    removeZone(zoneId) {
        const index = this._zones.findIndex(z => z.id === zoneId);
        if (index === -1) {
            throw new EntityNotFoundError('Zone', zoneId);
        }

        this._zones.splice(index, 1);
        this.touch();

        this.emit('project.zone.removed', {
            projectId: this.id,
            zoneId
        });

        return this;
    }

    /**
     * Obtient une zone par son ID
     */
    getZone(zoneId) {
        return this._zones.find(z => z.id === zoneId);
    }

    /**
     * Définit le budget du projet
     */
    setBudget(budget) {
        if (!(budget instanceof Cost)) {
            throw new ValidationError('Budget must be a Cost instance');
        }

        this._budget = budget;
        this.touch();

        return this;
    }

    /**
     * Définit les paramètres du projet
     */
    setParameters(parameters) {
        this._parameters = { ...parameters };
        this.touch();

        return this;
    }

    /**
     * Démarre le projet
     */
    start() {
        if (this._status !== ProjectStatus.PLANNING) {
            throw new InvalidStateError(
                'Project can only be started from PLANNING status',
                this._status
            );
        }

        if (!this.canStart()) {
            throw new ConstraintViolationError(
                'Project cannot start: missing required teams or zones'
            );
        }

        this._status = ProjectStatus.IN_PROGRESS;
        this.touch();

        this.emit('project.started', {
            projectId: this.id,
            startDate: this._startDate
        });

        return this;
    }

    /**
     * Vérifie si le projet peut démarrer
     */
    canStart() {
        // Au moins une zone
        if (this._zones.length === 0) return false;

        // Toutes les zones doivent avoir des équipes assignées
        return this._zones.every(zone => zone.hasAllRequiredTeams());
    }

    /**
     * Termine le projet
     */
    complete() {
        if (this._status !== ProjectStatus.IN_PROGRESS) {
            throw new InvalidStateError(
                'Project can only be completed from IN_PROGRESS status',
                this._status
            );
        }

        this._status = ProjectStatus.COMPLETED;
        this._endDate = new Date();
        this.touch();

        this.emit('project.completed', {
            projectId: this.id,
            endDate: this._endDate,
            duration: this.getDuration()
        });

        return this;
    }

    /**
     * Met le projet en pause
     */
    pause() {
        if (this._status !== ProjectStatus.IN_PROGRESS) {
            throw new InvalidStateError(
                'Only in-progress projects can be paused',
                this._status
            );
        }

        this._status = ProjectStatus.PAUSED;
        this.touch();

        this.emit('project.paused', {
            projectId: this.id
        });

        return this;
    }

    /**
     * Reprend le projet
     */
    resume() {
        if (this._status !== ProjectStatus.PAUSED) {
            throw new InvalidStateError(
                'Only paused projects can be resumed',
                this._status
            );
        }

        this._status = ProjectStatus.IN_PROGRESS;
        this.touch();

        this.emit('project.resumed', {
            projectId: this.id
        });

        return this;
    }

    /**
     * Annule le projet
     */
    cancel() {
        if (this._status === ProjectStatus.COMPLETED) {
            throw new InvalidStateError(
                'Completed projects cannot be cancelled',
                this._status
            );
        }

        this._status = ProjectStatus.CANCELLED;
        this.touch();

        this.emit('project.cancelled', {
            projectId: this.id
        });

        return this;
    }

    /**
     * Calcule la progression globale du projet
     */
    calculateProgress() {
        if (this._zones.length === 0) return 0;

        const totalCompleted = this._zones.reduce(
            (sum, zone) => sum + zone.completedHouses,
            0
        );

        return (totalCompleted / this._totalHouses) * 100;
    }

    /**
     * Obtient le nombre total de ménages complétés
     */
    getCompletedHouses() {
        return this._zones.reduce(
            (sum, zone) => sum + zone.completedHouses,
            0
        );
    }

    /**
     * Calcule la durée du projet (en jours)
     */
    getDuration() {
        if (!this._endDate) return null;

        const diffTime = this._endDate - this._startDate;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Obtient toutes les équipes du projet
     */
    getAllTeams() {
        const allTeams = [];
        for (const zone of this._zones) {
            for (const teams of zone.teams.values()) {
                allTeams.push(...teams);
            }
        }
        return allTeams;
    }

    /**
     * Obtient des statistiques globales
     */
    getStats() {
        return {
            name: this._name,
            status: this._status,
            totalHouses: this._totalHouses,
            completedHouses: this.getCompletedHouses(),
            progress: this.calculateProgress(),
            zonesCount: this._zones.length,
            teamsCount: this.getAllTeams().length,
            startDate: this._startDate,
            endDate: this._endDate,
            duration: this.getDuration(),
            budget: this._budget ? this._budget.toJSON() : null
        };
    }

    /**
     * Sérialisation JSON
     */
    toJSON() {
        return {
            ...super.toJSON(),
            name: this._name,
            totalHouses: this._totalHouses,
            startDate: this._startDate.toISOString(),
            endDate: this._endDate ? this._endDate.toISOString() : null,
            zones: this._zones.map(z => z.toJSON()),
            status: this._status,
            budget: this._budget ? this._budget.toJSON() : null,
            parameters: this._parameters
        };
    }

    /**
     * Désérialisation JSON
     */
    static fromJSON(data) {
        const project = new Project(
            data.id,
            data.name,
            data.totalHouses,
            new Date(data.startDate),
            data.zones ? data.zones.map(z => Zone.fromJSON(z)) : []
        );

        project._endDate = data.endDate ? new Date(data.endDate) : null;
        project._status = data.status || ProjectStatus.PLANNING;
        project._budget = data.budget ? Cost.fromJSON(data.budget) : null;
        project._parameters = data.parameters || {};
        project._createdAt = new Date(data.createdAt);
        project._updatedAt = new Date(data.updatedAt);

        return project;
    }
}

// Export pour utilisation globale
if (typeof window !== 'undefined') {
    window.Project = Project;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Project;
}
