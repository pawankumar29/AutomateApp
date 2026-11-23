import { Router, Request, Response, NextFunction } from 'express';
import { stringify } from 'csv-stringify';
import { applicationsService } from './applications.service.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

// Get paginated application history
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await applicationsService.getApplications({
      userId: req.user!.id,
      platform: req.query.platform as string,
      status: req.query.status as string,
      search: req.query.search as string,
      dateFilter: req.query.dateFilter as any,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any,
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Export application history to CSV
router.get('/export/csv', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await applicationsService.getApplications({
      userId: req.user!.id,
      platform: req.query.platform as string,
      status: req.query.status as string,
      search: req.query.search as string,
      dateFilter: req.query.dateFilter as any,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      limit: 5000,
      offset: 0,
    });

    const rows = data.items.map((app) => ({
      'Job Title': app.jobTitle,
      'Company': app.companyName,
      'Platform': app.platform,
      'Location': app.jobLocation || 'N/A',
      'Match Score (%)': app.matchScore,
      'Status': app.status,
      'Job Posting Date': app.jobPostedAt ? new Date(app.jobPostedAt).toISOString() : 'N/A',
      'Applied Date': app.appliedAt ? new Date(app.appliedAt).toISOString() : 'N/A',
      'Job URL': app.jobUrl,
      'Application URL': app.applicationUrl || 'N/A',
      'Submission Evidence': app.submissionEvidence || 'N/A',
      'Error Reason': app.errorReason || 'N/A',
    }));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=job_applications_${Date.now()}.csv`);

    stringify(rows, { header: true }).pipe(res);
  } catch (err) {
    next(err);
  }
});

export default router;
