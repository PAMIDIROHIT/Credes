import * as dashboardService from './dashboard.service.js';
import { sendSuccess } from '../../utils/response.util.js';

export const getStats = async (req, res, next) => {
  try {
    const stats = await dashboardService.getStats(req.user.id);
    return sendSuccess(res, stats, 'Statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};
