import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth.middleware';
import {
  getProfile,
  updateProfile,
  addSocialAccount,
  listSocialAccounts,
  removeSocialAccount,
  updateAiKeys
} from '../controllers/user.controller';

const router = Router();

// Profile
router.get('/profile', authenticateJWT, getProfile);
router.put('/profile', authenticateJWT, updateProfile);

// Social Accounts
router.post('/social-accounts', authenticateJWT, addSocialAccount);
router.get('/social-accounts', authenticateJWT, listSocialAccounts);
router.delete('/social-accounts/:id', authenticateJWT, removeSocialAccount);

// AI Keys
router.put('/ai-keys', authenticateJWT, updateAiKeys);

export default router;