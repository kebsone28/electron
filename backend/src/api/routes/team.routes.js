import express from 'express';
import {
    getTeams,
    createTeam,
    assignTeamToZone,
    getTeamPositions
} from '../../modules/team/team.controller.js';
import { authProtect } from '../middlewares/auth.js';
import { verifierPermission } from '../../middleware/verifierPermission.js';
import { PERMISSIONS } from '../../core/config/permissions.js';

const router = express.Router();

router.use(authProtect);

router.get('/', getTeams);
router.get('/positions', getTeamPositions);
router.post('/', verifierPermission(PERMISSIONS.GERER_UTILISATEURS), createTeam);
router.post('/:id/assign', verifierPermission(PERMISSIONS.GERER_LOGISTIQUE), assignTeamToZone);

export default router;
