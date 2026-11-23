import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { ENV } from '../config/env.js';

export const redisConnection = new Redis(ENV.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisConnection.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

export const DISCOVERY_QUEUE_NAME = 'job_discovery_queue';
export const APPLICATION_QUEUE_NAME = 'job_application_queue';
export const MONITORING_QUEUE_NAME = 'job_monitoring_queue';

export const discoveryQueue = new Queue(DISCOVERY_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export const applicationQueue = new Queue(APPLICATION_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});
