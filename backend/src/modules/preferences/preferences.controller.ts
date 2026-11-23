import { Router, Request, Response, NextFunction } from 'express';
import { preferencesService } from './preferences.service.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await preferencesService.getPreferences(req.user!.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await preferencesService.updatePreferences(req.user!.id, req.body);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
