/**
 * Repository pour les projets
 * Gère la persistance des entités Project
 */
class ProjectRepository {
    constructor(database) {
        if (!database) {
            throw new Error('Database is required');
        }
        this.db = database;
    }

    /**
     * Trouve un projet par son ID
     */
    async findById(id) {
        try {
            const data = await this.db.projects.get(id);
            if (!data) return null;
            return this.hydrate(data);
        } catch (error) {
            console.error('Error finding project by ID:', error);
            throw error;
        }
    }

    /**
     * Trouve tous les projets
     */
    async findAll() {
        try {
            const data = await this.db.projects.toArray();
            return data.map(d => this.hydrate(d));
        } catch (error) {
            console.error('Error finding all projects:', error);
            throw error;
        }
    }

    /**
     * Trouve les projets par statut
     */
    async findByStatus(status) {
        try {
            const data = await this.db.projects
                .where('status')
                .equals(status)
                .toArray();
            return data.map(d => this.hydrate(d));
        } catch (error) {
            console.error('Error finding projects by status:', error);
            throw error;
        }
    }

    /**
     * Sauvegarde un projet
     */
    async save(project) {
        if (!(project instanceof Project)) {
            throw new ValidationError('Parameter must be a Project instance');
        }

        try {
            const data = this.dehydrate(project);
            await this.db.projects.put(data);

            // Émettre un événement
            if (window.eventBus) {
                window.eventBus.emit('project.saved', {
                    projectId: project.id
                });
            }

            return project;
        } catch (error) {
            console.error('Error saving project:', error);
            throw error;
        }
    }

    /**
     * Supprime un projet
     */
    async delete(id) {
        try {
            await this.db.projects.delete(id);

            if (window.eventBus) {
                window.eventBus.emit('project.deleted', {
                    projectId: id
                });
            }
        } catch (error) {
            console.error('Error deleting project:', error);
            throw error;
        }
    }

    /**
     * Compte le nombre de projets
     */
    async count() {
        try {
            return await this.db.projects.count();
        } catch (error) {
            console.error('Error counting projects:', error);
            throw error;
        }
    }

    /**
     * Vérifie si un projet existe
     */
    async exists(id) {
        try {
            const project = await this.db.projects.get(id);
            return !!project;
        } catch (error) {
            console.error('Error checking project existence:', error);
            throw error;
        }
    }

    /**
     * Convertit les données de la DB en entité Project
     */
    hydrate(data) {
        try {
            return Project.fromJSON(data);
        } catch (error) {
            console.error('Error hydrating project:', error);
            throw error;
        }
    }

    /**
     * Convertit une entité Project en données pour la DB
     */
    dehydrate(project) {
        try {
            return project.toJSON();
        } catch (error) {
            console.error('Error dehydrating project:', error);
            throw error;
        }
    }

    /**
     * Recherche de projets avec critères
     */
    async search(criteria) {
        try {
            let collection = this.db.projects;

            if (criteria.status) {
                collection = collection.where('status').equals(criteria.status);
            }

            if (criteria.startDateFrom) {
                collection = collection.filter(p =>
                    new Date(p.startDate) >= criteria.startDateFrom
                );
            }

            if (criteria.startDateTo) {
                collection = collection.filter(p =>
                    new Date(p.startDate) <= criteria.startDateTo
                );
            }

            if (criteria.name) {
                collection = collection.filter(p =>
                    p.name.toLowerCase().includes(criteria.name.toLowerCase())
                );
            }

            const data = await collection.toArray();
            return data.map(d => this.hydrate(d));
        } catch (error) {
            console.error('Error searching projects:', error);
            throw error;
        }
    }
}

// Export pour utilisation globale
if (typeof window !== 'undefined') {
    window.ProjectRepository = ProjectRepository;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProjectRepository;
}
