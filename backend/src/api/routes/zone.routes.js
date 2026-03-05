import express from 'express';
import {
    getZones,
    createZone,
    deleteZone
} from '../../modules/zone/zone.controller.js';
import { authProtect, authorize } from '../middlewares/auth.js';

const router = express.Router();

router.use(authProtect);

router.get('/', getZones);
router.post('/', authorize('admin', 'ADMIN_PROQUELEC', 'SUPERVISEUR'), createZone);
router.delete('/:id', authorize('admin', 'ADMIN_PROQUELEC'), deleteZone);

export default router;
