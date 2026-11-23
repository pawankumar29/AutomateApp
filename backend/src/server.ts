import { app } from './app.js';
import { ENV } from './config/env.js';
import { runMigrations } from './db/migrate.js';
import { automationService } from './modules/automation/automation.service.js';

async function bootstrap() {
  console.log(`[Server] Starting Job Application Automation SaaS Backend on port ${ENV.PORT}...`);
  try {
    // 1. Run database migrations to guarantee schema presence
    await runMigrations();
  } catch (error) {
    console.warn('[Server] Database migration warning (will continue if DB is connecting):', error);
  }

  // 2. Start HTTP server
  app.listen(ENV.PORT, '0.0.0.0', async () => {
    console.log(`[Server] Server is running on http://0.0.0.0:${ENV.PORT}`);
    console.log(`[Server] Healthcheck: http://localhost:${ENV.PORT}${ENV.API_PREFIX}/health`);
    
    // 3. Resume running automation sessions
    await automationService.initializeRunningSessions();
  });
}

bootstrap().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
