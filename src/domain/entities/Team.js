/**
 * Entité Team (Équipe)
 * Représente une équipe de travail
 */
class Team extends Entity {
    constructor(id, type, members = [], zone = null) {
        super(id);

        if (!Object.values(TeamType).includes(type)) {
            throw new ValidationError(`Invalid team type: ${type}`);
        }

        this._type = type;
        this._members = members;
        this._zone = zone;
        this._productivityRate = ProductivityRate.fromDefaults(type);
        this._progressRecords = [];
        this._isActive = true;
    }

    // Getters
    get type() {
        return this._type;
    }

    get members() {
        return [...this._members];
    }

    get zone() {
        return this._zone;
    }

    get productivityRate() {
        return this._productivityRate;
    }

    get isActive() {
        return this._isActive;
    }

    /**
     * Assigne l'équipe à une zone
     */
    assignToZone(zoneId) {
        this._zone = zoneId;
        this.touch();

        this.emit('team.assigned', {
            teamId: this.id,
            zoneId
        });

        return this;
    }

    /**
     * Retire l'équipe de sa zone
     */
    unassignFromZone() {
        const oldZone = this._zone;
        this._zone = null;
        this.touch();

        this.emit('team.unassigned', {
            teamId: this.id,
            zoneId: oldZone
        });

        return this;
    }

    /**
     * Ajoute un membre à l'équipe
     */
    addMember(member) {
        if (this._members.some(m => m.id === member.id)) {
            throw new DuplicateEntityError('Member', member.id);
        }

        this._members.push(member);
        this.touch();

        this.emit('team.member.added', {
            teamId: this.id,
            memberId: member.id
        });

        return this;
    }

    /**
     * Retire un membre de l'équipe
     */
    removeMember(memberId) {
        const index = this._members.findIndex(m => m.id === memberId);
        if (index === -1) {
            throw new EntityNotFoundError('Member', memberId);
        }

        this._members.splice(index, 1);
        this.touch();

        this.emit('team.member.removed', {
            teamId: this.id,
            memberId
        });

        return this;
    }

    /**
     * Enregistre la progression quotidienne
     */
    recordDailyProgress(date, housesCompleted, hoursWorked) {
        if (!(date instanceof Date)) {
            throw new ValidationError('Date must be a Date instance');
        }
        if (housesCompleted < 0 || hoursWorked < 0) {
            throw new ValidationError('Houses and hours must be positive');
        }

        const record = {
            date,
            housesCompleted,
            hoursWorked,
            productivity: hoursWorked > 0 ? housesCompleted / hoursWorked : 0
        };

        this._progressRecords.push(record);
        this.touch();

        this.emit('team.progress.recorded', {
            teamId: this.id,
            date,
            housesCompleted,
            hoursWorked
        });

        return this;
    }

    /**
     * Calcule la productivité moyenne
     */
    getAverageProductivity(days = null) {
        let records = this._progressRecords;

        if (days) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            records = records.filter(r => r.date >= cutoffDate);
        }

        if (records.length === 0) return 0;

        const totalHouses = records.reduce((sum, r) => sum + r.housesCompleted, 0);
        const totalDays = records.length;

        return totalHouses / totalDays;
    }

    /**
     * Calcule l'efficacité (productivité réelle / productivité théorique)
     */
    getEfficiency(days = null) {
        const actualProductivity = this.getAverageProductivity(days);
        const theoreticalProductivity = this._productivityRate.housesPerDay;

        if (theoreticalProductivity === 0) return 0;

        return (actualProductivity / theoreticalProductivity) * 100;
    }

    /**
     * Obtient le total de ménages complétés
     */
    getTotalHousesCompleted() {
        return this._progressRecords.reduce((sum, r) => sum + r.housesCompleted, 0);
    }

    /**
     * Obtient le total d'heures travaillées
     */
    getTotalHoursWorked() {
        return this._progressRecords.reduce((sum, r) => sum + r.hoursWorked, 0);
    }

    /**
     * Définit un taux de productivité personnalisé
     */
    setCustomProductivityRate(housesPerDay) {
        this._productivityRate = new ProductivityRate(housesPerDay, this._type);
        this.touch();

        return this;
    }

    /**
     * Active ou désactive l'équipe
     */
    setActive(isActive) {
        this._isActive = isActive;
        this.touch();

        this.emit('team.status.changed', {
            teamId: this.id,
            isActive
        });

        return this;
    }

    /**
     * Sérialisation JSON
     */
    toJSON() {
        return {
            ...super.toJSON(),
            type: this._type,
            members: this._members,
            zone: this._zone,
            productivityRate: this._productivityRate.toJSON(),
            progressRecords: this._progressRecords.map(r => ({
                ...r,
                date: r.date.toISOString()
            })),
            isActive: this._isActive
        };
    }

    /**
     * Désérialisation JSON
     */
    static fromJSON(data) {
        const team = new Team(
            data.id,
            data.type,
            data.members || [],
            data.zone
        );

        team._productivityRate = ProductivityRate.fromJSON(data.productivityRate);
        team._progressRecords = (data.progressRecords || []).map(r => ({
            ...r,
            date: new Date(r.date)
        }));
        team._isActive = data.isActive !== undefined ? data.isActive : true;
        team._createdAt = new Date(data.createdAt);
        team._updatedAt = new Date(data.updatedAt);

        return team;
    }
}

// Export pour utilisation globale
if (typeof window !== 'undefined') {
    window.Team = Team;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Team;
}
