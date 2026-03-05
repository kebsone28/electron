import express from 'express';
import {
    getTeams,
    createTeam
} from '../../modules/team/team.controller.js';
import { authProtect, authorize } from '../middlewares/auth.js';

const router = express.Router();

router.use(authProtect);

router.get('/', getTeams);
router.post('/', authorize('admin', 'ADMIN_PROQUELEC', 'SUPERVISEUR'), createTeam);

export default router;
