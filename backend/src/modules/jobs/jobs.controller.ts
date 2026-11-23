import { Router, Request, Response, NextFunction } from 'express';
import { jobsService } from './jobs.service.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

// Get latest jobs (sorted strict date descending)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const platform = req.query.platform as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const search = req.query.search as string | undefined;

    const list = await jobsService.getLatestJobs({ platform, limit, offset, search });
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

export default router;
