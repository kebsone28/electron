/**
 * Entité Household (Ménage)
 * Représente un ménage dans le projet d'électrification
 */
class Household extends Entity {
    constructor(id, location, owner, status = HouseholdStatus.PENDING) {
        super(id);

        if (!(location instanceof Location)) {
            throw new ValidationError('Location must be a Location instance');
        }

        this._location = location;
        this._owner = owner;
        this._status = status;
        this._statusHistory = [];
        this._assignedTeams = new Map();
        this._scheduledDates = {};
        this._actualDates = {};
        this._notes = [];
    }

    // Getters
    get location() {
        return this._location;
    }

    get owner() {
        return this._owner;
    }

    get status() {
        return this._status;
    }

    get statusHistory() {
        return [...this._statusHistory];
    }

    get assignedTeams() {
        return new Map(this._assignedTeams);
    }

    /**
     * Met à jour le statut du ménage
     */
    updateStatus(newStatus, updatedBy, reason = null) {
        if (!this.canTransitionTo(newStatus)) {
            throw new InvalidStateError(
                `Invalid status transition from ${this._status} to ${newStatus}`,
                this._status
            );
        }

        const transition = {
            from: this._status,
            to: newStatus,
            updatedBy,
            reason,
            timestamp: new Date()
        };

        this._status = newStatus;
        this._statusHistory.push(transition);
        this.touch();

        this.emit('household.status.changed', {
            householdId: this.id,
            oldStatus: transition.from,
            newStatus: transition.to,
            updatedBy,
            reason
        });

        return this;
    }

    /**
     * Vérifie si une transition de statut est valide
     */
    canTransitionTo(newStatus) {
        const validTransitions = VALID_STATUS_TRANSITIONS[this._status];
        return validTransitions && validTransitions.includes(newStatus);
    }

    /**
     * Assigne une équipe au ménage
     */
    assignTeam(teamType, teamId) {
        this._assignedTeams.set(teamType, teamId);
        this.touch();

        this.emit('household.team.assigned', {
            householdId: this.id,
            teamType,
            teamId
        });

        return this;
    }

    /**
     * Retire une équipe
     */
    unassignTeam(teamType) {
        const teamId = this._assignedTeams.get(teamType);
        this._assignedTeams.delete(teamType);
        this.touch();

        this.emit('household.team.unassigned', {
            householdId: this.id,
            teamType,
            teamId
        });

        return this;
    }

    /**
     * Programme une date pour une activité
     */
    scheduleActivity(activityType, date) {
        if (!(date instanceof Date)) {
            throw new ValidationError('Date must be a Date instance');
        }

        this._scheduledDates[activityType] = date;
        this.touch();

        this.emit('household.activity.scheduled', {
            householdId: this.id,
            activityType,
            date
        });

        return this;
    }

    /**
     * Enregistre la date effective d'une activité
     */
    recordActivityCompletion(activityType, date) {
        if (!(date instanceof Date)) {
            throw new ValidationError('Date must be a Date instance');
        }

        this._actualDates[activityType] = date;
        this.touch();

        this.emit('household.activity.completed', {
            householdId: this.id,
            activityType,
            date
        });

        return this;
    }

    /**
     * Ajoute une note
     */
    addNote(content, author) {
        const note = {
            content,
            author,
            timestamp: new Date()
        };

        this._notes.push(note);
        this.touch();

        return this;
    }

    /**
     * Vérifie si le ménage est terminé
     */
    isCompleted() {
        return this._status === HouseholdStatus.COMPLETED;
    }

    /**
     * Vérifie si le ménage est bloqué
     */
    isBlocked() {
        return this._status === HouseholdStatus.BLOCKED;
    }

    /**
     * Obtient le délai entre programmation et réalisation
     */
    getDelay(activityType) {
        const scheduled = this._scheduledDates[activityType];
        const actual = this._actualDates[activityType];

        if (!scheduled || !actual) return null;

        const diffTime = actual - scheduled;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // en jours
    }

    /**
     * Sérialisation JSON
     */
    toJSON() {
        return {
            ...super.toJSON(),
            location: this._location.toJSON(),
            owner: this._owner,
            status: this._status,
            statusHistory: this._statusHistory,
            assignedTeams: Array.from(this._assignedTeams.entries()),
            scheduledDates: this._scheduledDates,
            actualDates: this._actualDates,
            notes: this._notes
        };
    }

    /**
     * Désérialisation JSON
     */
    static fromJSON(data) {
        const household = new Household(
            data.id,
            Location.fromJSON(data.location),
            data.owner,
            data.status
        );

        household._statusHistory = data.statusHistory || [];
        household._assignedTeams = new Map(data.assignedTeams || []);
        household._scheduledDates = data.scheduledDates || {};
        household._actualDates = data.actualDates || {};
        household._notes = data.notes || [];
        household._createdAt = new Date(data.createdAt);
        household._updatedAt = new Date(data.updatedAt);

        return household;
    }
}

// Export pour utilisation globale
if (typeof window !== 'undefined') {
    window.Household = Household;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Household;
}
