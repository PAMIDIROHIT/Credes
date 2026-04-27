import { Router } from 'express';
import * as userController from './user.controller.js';
import { auth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { updateProfileSchema, addSocialAccountSchema, updateAiKeysSchema } from './user.validator.js';

const router = Router();

router.use(auth);

router.get('/profile', userController.getProfile);
router.put('/profile', validate(updateProfileSchema), userController.updateProfile);

router.get('/social-accounts', userController.getSocialAccounts);
router.post('/social-accounts', validate(addSocialAccountSchema), userController.addSocialAccount);
router.delete('/social-accounts/:id', userController.removeSocialAccount);

router.put('/ai-keys', validate(updateAiKeysSchema), userController.updateAiKeys);

export default router;
