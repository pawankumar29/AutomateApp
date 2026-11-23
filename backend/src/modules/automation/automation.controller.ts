import { Router, Request, Response, NextFunction } from 'express';
import { automationService } from './automation.service.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

// Get current automation status & metrics
router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await automationService.getStatus(req.user!.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Start continuous 5-minute monitoring
router.post('/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const interval = req.body.cycleIntervalMinutes ? parseInt(req.body.cycleIntervalMinutes, 10) : 5;
    const result = await automationService.startMonitoring(req.user!.id, interval);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Pause monitoring
router.post('/pause', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await automationService.pauseMonitoring(req.user!.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Resume monitoring
router.post('/resume', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await automationService.resumeMonitoring(req.user!.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Stop monitoring
router.post('/stop', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await automationService.stopMonitoring(req.user!.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Trigger a single cycle immediately
router.post('/trigger-now', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await automationService.triggerManualCycle(req.user!.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Get automation logs
router.get('/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const logs = await automationService.getLogs(req.user!.id, limit);
    res.status(200).json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
});

export default router;
