import { Router, Request, Response, NextFunction } from 'express';
import { connectionsService } from './connections.service.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await connectionsService.getConnections(req.user!.id);
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

router.post('/connect', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await connectionsService.connectAccount(req.user!.id, req.body);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/disconnect', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { platform } = req.body;
    await connectionsService.disconnectAccount(req.user!.id, platform);
    res.status(200).json({ success: true, message: `Disconnected from ${platform}` });
  } catch (err) {
    next(err);
  }
});

export default router;
