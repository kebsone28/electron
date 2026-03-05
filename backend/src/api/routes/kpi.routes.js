import express from 'express';
import {
    getProjectKPIs,
    getGlobalSummary
} from '../../modules/kpi/kpi.controller.js';
import { authProtect } from '../middlewares/auth.js';

const router = express.Router();

router.use(authProtect);

router.get('/summary', getGlobalSummary);
router.get('/:projectId', getProjectKPIs);

export default router;
