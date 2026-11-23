import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { resumeService } from './resume.service.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { ENV } from '../../config/env.js';

const router = Router();
router.use(authenticate);

// Ensure upload directory exists
if (!fs.existsSync(ENV.UPLOAD_DIR)) {
  fs.mkdirSync(ENV.UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ENV.UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `resume-${req.user!.id}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: ENV.MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, and TXT files are supported.'));
    }
  },
});

// Upload resume
router.post('/upload', upload.single('resume'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No resume file uploaded.' });
      return;
    }

    const saved = await resumeService.processAndSaveResume(req.user!.id, {
      path: req.file.path,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });

    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
});

// List user resumes
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await resumeService.getUserResumes(req.user!.id);
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

// Set primary resume
router.put('/:id/primary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await resumeService.setPrimary(req.user!.id, req.params.id);
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// Update parsed data (user corrections)
router.put('/:id/parsed-data', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await resumeService.updateParsedData(req.user!.id, req.params.id, req.body.parsedData);
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// Delete resume
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await resumeService.deleteResume(req.user!.id, req.params.id);
    res.status(200).json({ success: true, message: 'Resume deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
