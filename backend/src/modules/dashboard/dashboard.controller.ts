import { Router, Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

// Get main overview & statistics
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await dashboardService.getDashboardSummary(req.user!.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Get detailed analytics charts data
router.get('/analytics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await dashboardService.getAnalyticsTrends(req.user!.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
