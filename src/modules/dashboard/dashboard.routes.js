import express from 'express';
import * as dashboardController from './dashboard.controller.js';
import { auth } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/stats', auth, dashboardController.getStats);

export default router;
