import express from 'express';
import * as contentController from './content.controller.js';
import { auth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { generateContentSchema } from './content.validator.js';

const router = express.Router();

router.post('/generate', auth, validate(generateContentSchema), contentController.generate);

export default router;
