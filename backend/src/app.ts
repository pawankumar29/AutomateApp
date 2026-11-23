import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';

import { ENV } from './config/env.js';
import { errorHandler } from './middleware/error.middleware.js';

import authRoutes from './modules/auth/auth.controller.js';
import profileRoutes from './modules/profile/profile.controller.js';
import resumeRoutes from './modules/resumes/resume.controller.js';
import preferenceRoutes from './modules/preferences/preferences.controller.js';
import connectionRoutes from './modules/connections/connections.controller.js';
import jobRoutes from './modules/jobs/jobs.controller.js';
import applicationRoutes from './modules/applications/applications.controller.js';
import dashboardRoutes from './modules/dashboard/dashboard.controller.js';
import automationRoutes from './modules/automation/automation.controller.js';

export const app = express();

// Security and standard middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads folder
app.use('/uploads', express.static(ENV.UPLOAD_DIR));

// Health check endpoint
app.get(`${ENV.API_PREFIX}/health`, (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: ENV.NODE_ENV,
  });
});

// Mount modular API routes
app.use(`${ENV.API_PREFIX}/auth`, authRoutes);
app.use(`${ENV.API_PREFIX}/profile`, profileRoutes);
app.use(`${ENV.API_PREFIX}/resumes`, resumeRoutes);
app.use(`${ENV.API_PREFIX}/preferences`, preferenceRoutes);
app.use(`${ENV.API_PREFIX}/connections`, connectionRoutes);
app.use(`${ENV.API_PREFIX}/jobs`, jobRoutes);
app.use(`${ENV.API_PREFIX}/applications`, applicationRoutes);
app.use(`${ENV.API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${ENV.API_PREFIX}/automation`, automationRoutes);

// Centralized error handling
app.use(errorHandler);
