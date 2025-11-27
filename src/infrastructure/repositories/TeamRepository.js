/**
 * Repository pour les équipes
 * Gère la persistance des entités Team
 */
class TeamRepository {
    constructor(database) {
        if (!database) {
            throw new Error('Database is required');
        }
        this.db = database;
    }

    /**
     * Trouve une équipe par son ID
     */
    async findById(id) {
        try {
            const data = await this.db.teams.get(id);
            if (!data) return null;
            return this.hydrate(data);
        } catch (error) {
            console.error('Error finding team by ID:', error);
            throw error;
        }
    }

    /**
     * Trouve toutes les équipes
     */
    async findAll() {
        try {
            const data = await this.db.teams.toArray();
            return data.map(d => this.hydrate(d));
        } catch (error) {
            console.error('Error finding all teams:', error);
            throw error;
        }
    }

    /**
     * Trouve les équipes par type
     */
    async findByType(type) {
        try {
            const data = await this.db.teams
                .where('type')
                .equals(type)
                .toArray();
            return data.map(d => this.hydrate(d));
        } catch (error) {
            console.error('Error finding teams by type:', error);
            throw error;
        }
    }

    /**
     * Trouve les équipes par zone
     */
    async findByZone(zoneId) {
        try {
            const data = await this.db.teams
                .where('zoneId')
                .equals(zoneId)
                .toArray();
            return data.map(d => this.hydrate(d));
        } catch (error) {
            console.error('Error finding teams by zone:', error);
            throw error;
        }
    }

    /**
     * Trouve les équipes par type et zone
     */
    async findByTypeAndZone(type, zoneId) {
        try {
            const data = await this.db.teams
                .where('[type+zoneId]')
                .equals([type, zoneId])
                .toArray();
            return data.map(d => this.hydrate(d));
        } catch (error) {
            console.error('Error finding teams by type and zone:', error);
            throw error;
        }
    }

    /**
     * Sauvegarde une équipe
     */
    async save(team) {
        if (!(team instanceof Team)) {
            throw new ValidationError('Parameter must be a Team instance');
        }

        try {
            const data = this.dehydrate(team);
            await this.db.teams.put(data);

            if (window.eventBus) {
                window.eventBus.emit('team.saved', {
                    teamId: team.id
                });
            }

            return team;
        } catch (error) {
            console.error('Error saving team:', error);
            throw error;
        }
    }

    /**
     * Sauvegarde plusieurs équipes en batch
     */
    async saveBatch(teams) {
        try {
            const data = teams.map(t => this.dehydrate(t));
            await this.db.teams.bulkPut(data);

            if (window.eventBus) {
                window.eventBus.emit('teams.batch.saved', {
                    count: teams.length
                });
            }

            return teams;
        } catch (error) {
            console.error('Error saving teams batch:', error);
            throw error;
        }
    }

    /**
     * Supprime une équipe
     */
    async delete(id) {
        try {
            await this.db.teams.delete(id);

            if (window.eventBus) {
                window.eventBus.emit('team.deleted', {
                    teamId: id
                });
            }
        } catch (error) {
            console.error('Error deleting team:', error);
            throw error;
        }
    }

    /**
     * Compte les équipes
     */
    async count() {
        try {
            return await this.db.teams.count();
        } catch (error) {
            console.error('Error counting teams:', error);
            throw error;
        }
    }

    /**
     * Compte les équipes par type
     */
    async countByType(type) {
        try {
            return await this.db.teams
                .where('type')
                .equals(type)
                .count();
        } catch (error) {
            console.error('Error counting teams by type:', error);
            throw error;
        }
    }

    /**
     * Obtient des statistiques sur les équipes
     */
    async getStats(zoneId = null) {
        try {
            let collection = this.db.teams;

            if (zoneId) {
                collection = collection.where('zoneId').equals(zoneId);
            }

            const teams = await collection.toArray();
            const stats = {
                total: teams.length,
                byType: {},
                active: teams.filter(t => t.isActive).length,
                inactive: teams.filter(t => !t.isActive).length
            };

            for (const type of Object.values(TeamType)) {
                stats.byType[type] = teams.filter(t => t.type === type).length;
            }

            return stats;
        } catch (error) {
            console.error('Error getting team stats:', error);
            throw error;
        }
    }

    /**
     * Recherche d'équipes
     */
    async search(criteria) {
        try {
            let collection = this.db.teams;

            if (criteria.type) {
                collection = collection.where('type').equals(criteria.type);
            }

            if (criteria.zoneId) {
                collection = collection.where('zoneId').equals(criteria.zoneId);
            }

            let data = await collection.toArray();

            // Filtres additionnels
            if (criteria.isActive !== undefined) {
                data = data.filter(t => t.isActive === criteria.isActive);
            }

            return data.map(d => this.hydrate(d));
        } catch (error) {
            console.error('Error searching teams:', error);
            throw error;
        }
    }

    /**
     * Convertit les données de la DB en entité Team
     */
    hydrate(data) {
        try {
            return Team.fromJSON(data);
        } catch (error) {
            console.error('Error hydrating team:', error);
            throw error;
        }
    }

    /**
     * Convertit une entité Team en données pour la DB
     */
    dehydrate(team) {
        try {
            return team.toJSON();
        } catch (error) {
            console.error('Error dehydrating team:', error);
            throw error;
        }
    }
}

// Export pour utilisation globale
if (typeof window !== 'undefined') {
    window.TeamRepository = TeamRepository;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TeamRepository;
}
