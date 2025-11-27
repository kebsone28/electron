/**
 * Service applicatif pour la gestion des projets
 * Orchestre les opérations sur les projets
 */
class ProjectService {
    constructor(projectRepository, zoneRepository, teamRepository, eventBus) {
        this.projectRepo = projectRepository;
        this.zoneRepo = zoneRepository;
        this.teamRepo = teamRepository;
        this.eventBus = eventBus;
    }

    /**
     * Crée un nouveau projet
     */
    async createProject(data) {
        try {
            // Valider les données
            this.validateProjectData(data);

            // Créer le projet
            const project = new Project(
                data.id || `project-${Date.now()}`,
                data.name,
                data.totalHouses,
                data.startDate instanceof Date ? data.startDate : new Date(data.startDate)
            );

            // Ajouter les zones si fournies
            if (data.zones && Array.isArray(data.zones)) {
                for (const zoneData of data.zones) {
                    const zone = new Zone(
                        zoneData.id || `zone-${Date.now()}-${Math.random()}`,
                        zoneData.name,
                        zoneData.totalHouses,
                        project.id
                    );
                    project.addZone(zone);
                }
            }

            // Définir le budget si fourni
            if (data.budget) {
                const budget = data.budget instanceof Cost
                    ? data.budget
                    : new Cost(data.budget.amount, data.budget.currency);
                project.setBudget(budget);
            }

            // Définir les paramètres
            if (data.parameters) {
                project.setParameters(data.parameters);
            }

            // Sauvegarder
            await this.projectRepo.save(project);

            // Sauvegarder les zones
            for (const zone of project.zones) {
                await this.zoneRepo.save(zone);
            }

            this.eventBus.emit('project.created', {
                projectId: project.id,
                name: project.name
            });

            return project;
        } catch (error) {
            console.error('Error creating project:', error);
            throw error;
        }
    }

    /**
     * Met à jour un projet
     */
    async updateProject(projectId, updates) {
        try {
            const project = await this.projectRepo.findById(projectId);
            if (!project) {
                throw new EntityNotFoundError('Project', projectId);
            }

            // Appliquer les mises à jour
            if (updates.name) project._name = updates.name;
            if (updates.budget) project.setBudget(updates.budget);
            if (updates.parameters) project.setParameters(updates.parameters);

            // Sauvegarder
            await this.projectRepo.save(project);

            this.eventBus.emit('project.updated', {
                projectId: project.id
            });

            return project;
        } catch (error) {
            console.error('Error updating project:', error);
            throw error;
        }
    }

    /**
     * Démarre un projet
     */
    async startProject(projectId) {
        try {
            const project = await this.projectRepo.findById(projectId);
            if (!project) {
                throw new EntityNotFoundError('Project', projectId);
            }

            // Démarrer le projet (validation automatique)
            project.start();

            // Sauvegarder
            await this.projectRepo.save(project);

            return project;
        } catch (error) {
            console.error('Error starting project:', error);
            throw error;
        }
    }

    /**
     * Termine un projet
     */
    async completeProject(projectId) {
        try {
            const project = await this.projectRepo.findById(projectId);
            if (!project) {
                throw new EntityNotFoundError('Project', projectId);
            }

            project.complete();
            await this.projectRepo.save(project);

            return project;
        } catch (error) {
            console.error('Error completing project:', error);
            throw error;
        }
    }

    /**
     * Obtient un projet avec toutes ses données
     */
    async getProjectWithDetails(projectId) {
        try {
            const project = await this.projectRepo.findById(projectId);
            if (!project) {
                throw new EntityNotFoundError('Project', projectId);
            }

            // Charger les zones
            const zones = await this.zoneRepo.findByProject(projectId);

            // Charger les équipes pour chaque zone
            for (const zone of zones) {
                const teams = await this.teamRepo.findByZone(zone.id);
                for (const team of teams) {
                    zone.assignTeam(team.type, team);
                }
            }

            return {
                project,
                zones,
                stats: project.getStats()
            };
        } catch (error) {
            console.error('Error getting project details:', error);
            throw error;
        }
    }

    /**
     * Liste tous les projets
     */
    async listProjects(filters = {}) {
        try {
            let projects;

            if (filters.status) {
                projects = await this.projectRepo.findByStatus(filters.status);
            } else {
                projects = await this.projectRepo.findAll();
            }

            return projects;
        } catch (error) {
            console.error('Error listing projects:', error);
            throw error;
        }
    }

    /**
     * Supprime un projet
     */
    async deleteProject(projectId) {
        try {
            // Supprimer les zones associées
            const zones = await this.zoneRepo.findByProject(projectId);
            for (const zone of zones) {
                await this.zoneRepo.delete(zone.id);
            }

            // Supprimer le projet
            await this.projectRepo.delete(projectId);

            this.eventBus.emit('project.deleted', {
                projectId
            });
        } catch (error) {
            console.error('Error deleting project:', error);
            throw error;
        }
    }

    /**
     * Valide les données d'un projet
     */
    validateProjectData(data) {
        if (!data.name || data.name.trim() === '') {
            throw new ValidationError('Project name is required');
        }

        if (!data.totalHouses || data.totalHouses <= 0) {
            throw new ValidationError('Total houses must be positive');
        }

        if (!data.startDate) {
            throw new ValidationError('Start date is required');
        }
    }

    /**
     * Calcule les statistiques globales
     */
    async getGlobalStats() {
        try {
            const projects = await this.projectRepo.findAll();

            const stats = {
                totalProjects: projects.length,
                byStatus: {},
                totalHouses: 0,
                completedHouses: 0
            };

            for (const status of Object.values(ProjectStatus)) {
                stats.byStatus[status] = projects.filter(p => p.status === status).length;
            }

            for (const project of projects) {
                stats.totalHouses += project.totalHouses;
                stats.completedHouses += project.getCompletedHouses();
            }

            stats.globalProgress = stats.totalHouses > 0
                ? (stats.completedHouses / stats.totalHouses) * 100
                : 0;

            return stats;
        } catch (error) {
            console.error('Error getting global stats:', error);
            throw error;
        }
    }
}

// Export pour utilisation globale
if (typeof window !== 'undefined') {
    window.ProjectService = ProjectService;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProjectService;
}
