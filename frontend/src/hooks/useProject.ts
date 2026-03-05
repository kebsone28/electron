import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../store/db';
import type { Project } from '../utils/types';

import { useState, useEffect } from 'react';

export function useProject() {
    const [activeProjectId, setActiveProjectIdState] = useState<string | null>(localStorage.getItem('active_project_id'));

    const projects = useLiveQuery(() => db.projects.toArray()) || [];

    const activeProject = useLiveQuery(async () => {
        if (!activeProjectId && projects.length > 0) {
            return projects[0];
        }
        if (activeProjectId) {
            return await db.projects.get(activeProjectId);
        }
        return null;
    }, [activeProjectId, projects]);

    useEffect(() => {
        if (!activeProjectId && projects.length > 0) {
            const id = projects[0].id;
            setActiveProjectIdState(id);
            localStorage.setItem('active_project_id', id);
        }
    }, [projects, activeProjectId]);

    const setActiveProjectId = (id: string) => {
        setActiveProjectIdState(id);
        localStorage.setItem('active_project_id', id);
    };

    const createProject = async (name: string) => {
        const id = `proj_${Date.now()}`;
        const newProject: Project = {
            id,
            organizationId: (window as any).organizationId || 'org_test_2026',
            name,
            status: 'planned',
            version: 1,
            config: {
                teams: [],
                costs: { staffRates: {}, vehicleRental: {} },
                materialCatalog: []
            }
        } as any;
        await db.projects.add(newProject);
        setActiveProjectId(id);
        return newProject;
    };

    const updateProject = async (updates: Partial<Project>) => {
        const currentId = activeProject?.id || activeProjectId;
        if (currentId) {
            await db.projects.update(currentId, updates);
        }
    };

    const deleteProject = async (projectId: string) => {
        // Delete all households linked to this project
        await db.households.where('projectId').equals(projectId).delete();
        // Delete the project itself
        await db.projects.delete(projectId);
        // Switch to another project if the deleted one was active
        if (activeProjectId === projectId) {
            const remaining = await db.projects.toArray();
            if (remaining.length > 0) {
                setActiveProjectId(remaining[0].id);
            } else {
                setActiveProjectIdState(null);
                localStorage.removeItem('active_project_id');
            }
        }
    };

    return {
        project: activeProject,
        projects,
        activeProjectId,
        setActiveProjectId,
        createProject,
        updateProject,
        deleteProject,
        isLoading: activeProject === undefined
    };
}
