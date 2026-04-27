import * as contentService from './content.service.js';
import { sendSuccess } from '../../utils/response.util.js';

export const generate = async (req, res, next) => {
  try {
    const result = await contentService.generateContent(req.user.id, req.body);
    return sendSuccess(res, result, 'Content generated successfully');
  } catch (error) {
    next(error);
  }
};
