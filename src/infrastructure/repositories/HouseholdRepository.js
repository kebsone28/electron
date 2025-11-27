/**
 * Repository pour les ménages
 * Gère la persistance des entités Household
 */
class HouseholdRepository {
    constructor(database) {
        if (!database) {
            throw new Error('Database is required');
        }
        this.db = database;
    }

    /**
     * Trouve un ménage par son ID
     */
    async findById(id) {
        try {
            const data = await this.db.households.get(id);
            if (!data) return null;
            return this.hydrate(data);
        } catch (error) {
            console.error('Error finding household by ID:', error);
            throw error;
        }
    }

    /**
     * Trouve tous les ménages
     */
    async findAll() {
        try {
            const data = await this.db.households.toArray();
            return data.map(d => this.hydrate(d));
        } catch (error) {
            console.error('Error finding all households:', error);
            throw error;
        }
    }

    /**
     * Trouve les ménages par zone
     */
    async findByZone(zoneId) {
        try {
            const data = await this.db.households
                .where('zoneId')
                .equals(zoneId)
                .toArray();
            return data.map(d => this.hydrate(d));
        } catch (error) {
            console.error('Error finding households by zone:', error);
            throw error;
        }
    }

    /**
     * Trouve les ménages par statut
     */
    async findByStatus(status) {
        try {
            const data = await this.db.households
                .where('status')
                .equals(status)
                .toArray();
            return data.map(d => this.hydrate(d));
        } catch (error) {
            console.error('Error finding households by status:', error);
            throw error;
        }
    }

    /**
     * Trouve les ménages par zone et statut
     */
    async findByZoneAndStatus(zoneId, status) {
        try {
            const data = await this.db.households
                .where('[zoneId+status]')
                .equals([zoneId, status])
                .toArray();
            return data.map(d => this.hydrate(d));
        } catch (error) {
            console.error('Error finding households by zone and status:', error);
            throw error;
        }
    }

    /**
     * Sauvegarde un ménage
     */
    async save(household) {
        if (!(household instanceof Household)) {
            throw new ValidationError('Parameter must be a Household instance');
        }

        try {
            const data = this.dehydrate(household);
            await this.db.households.put(data);

            if (window.eventBus) {
                window.eventBus.emit('household.saved', {
                    householdId: household.id
                });
            }

            return household;
        } catch (error) {
            console.error('Error saving household:', error);
            throw error;
        }
    }

    /**
     * Sauvegarde plusieurs ménages en batch
     */
    async saveBatch(households) {
        try {
            const data = households.map(h => this.dehydrate(h));
            await this.db.households.bulkPut(data);

            if (window.eventBus) {
                window.eventBus.emit('households.batch.saved', {
                    count: households.length
                });
            }

            return households;
        } catch (error) {
            console.error('Error saving households batch:', error);
            throw error;
        }
    }

    /**
     * Met à jour le statut d'un ménage
     */
    async updateStatus(householdId, newStatus, updatedBy, reason = null) {
        try {
            const household = await this.findById(householdId);
            if (!household) {
                throw new EntityNotFoundError('Household', householdId);
            }

            household.updateStatus(newStatus, updatedBy, reason);
            await this.save(household);

            return household;
        } catch (error) {
            console.error('Error updating household status:', error);
            throw error;
        }
    }

    /**
     * Supprime un ménage
     */
    async delete(id) {
        try {
            await this.db.households.delete(id);

            if (window.eventBus) {
                window.eventBus.emit('household.deleted', {
                    householdId: id
                });
            }
        } catch (error) {
            console.error('Error deleting household:', error);
            throw error;
        }
    }

    /**
     * Compte les ménages
     */
    async count() {
        try {
            return await this.db.households.count();
        } catch (error) {
            console.error('Error counting households:', error);
            throw error;
        }
    }

    /**
     * Compte les ménages par statut
     */
    async countByStatus(status) {
        try {
            return await this.db.households
                .where('status')
                .equals(status)
                .count();
        } catch (error) {
            console.error('Error counting households by status:', error);
            throw error;
        }
    }

    /**
     * Obtient des statistiques sur les ménages
     */
    async getStats(zoneId = null) {
        try {
            let collection = this.db.households;

            if (zoneId) {
                collection = collection.where('zoneId').equals(zoneId);
            }

            const households = await collection.toArray();
            const stats = {
                total: households.length,
                byStatus: {}
            };

            for (const status of Object.values(HouseholdStatus)) {
                stats.byStatus[status] = households.filter(h => h.status === status).length;
            }

            return stats;
        } catch (error) {
            console.error('Error getting household stats:', error);
            throw error;
        }
    }

    /**
     * Recherche de ménages
     */
    async search(criteria) {
        try {
            let collection = this.db.households;

            if (criteria.zoneId) {
                collection = collection.where('zoneId').equals(criteria.zoneId);
            }

            if (criteria.status) {
                collection = collection.where('status').equals(criteria.status);
            }

            let data = await collection.toArray();

            // Filtres additionnels en mémoire
            if (criteria.ownerName) {
                data = data.filter(h =>
                    h.owner.name.toLowerCase().includes(criteria.ownerName.toLowerCase())
                );
            }

            if (criteria.phone) {
                data = data.filter(h =>
                    h.owner.phone && h.owner.phone.includes(criteria.phone)
                );
            }

            return data.map(d => this.hydrate(d));
        } catch (error) {
            console.error('Error searching households:', error);
            throw error;
        }
    }

    /**
     * Convertit les données de la DB en entité Household
     */
    hydrate(data) {
        try {
            return Household.fromJSON(data);
        } catch (error) {
            console.error('Error hydrating household:', error);
            throw error;
        }
    }

    /**
     * Convertit une entité Household en données pour la DB
     */
    dehydrate(household) {
        try {
            return household.toJSON();
        } catch (error) {
            console.error('Error dehydrating household:', error);
            throw error;
        }
    }
}

// Export pour utilisation globale
if (typeof window !== 'undefined') {
    window.HouseholdRepository = HouseholdRepository;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = HouseholdRepository;
}
