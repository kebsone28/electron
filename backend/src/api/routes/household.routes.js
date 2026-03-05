import express from 'express';
import {
    getHouseholds,
    getHouseholdById,
    createHousehold,
    updateHousehold
} from '../../modules/household/household.controller.js';
import { authProtect, authorize } from '../middlewares/auth.js';

const router = express.Router();

router.use(authProtect);

router.get('/', getHouseholds);
router.get('/:id', getHouseholdById);
router.post('/', authorize('admin', 'ADMIN_PROQUELEC', 'CHEF_EQUIPE', 'SUPERVISEUR'), createHousehold);
router.patch('/:id', authorize('admin', 'ADMIN_PROQUELEC', 'CHEF_EQUIPE', 'SUPERVISEUR'), updateHousehold);

export default router;
