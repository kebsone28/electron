import express from 'express';
import {
    getProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject
} from '../../modules/project/project.controller.js';
import { authProtect, authorize } from '../middlewares/auth.js';

const router = express.Router();

// All routes protected by organization
router.use(authProtect);

router.get('/', getProjects);
router.get('/:id', getProjectById);
router.post('/', authorize('admin', 'ADMIN_PROQUELEC', 'DG_PROQUELEC'), createProject);
router.patch('/:id', authorize('admin', 'ADMIN_PROQUELEC', 'DG_PROQUELEC'), updateProject);
router.delete('/:id', authorize('admin', 'ADMIN_PROQUELEC'), deleteProject);

export default router;
