import { discoveryQueue, applicationQueue } from './queue.config.js';

export interface DiscoveryJobData {
  userId: string;
  platform: 'linkedin' | 'naukri' | 'indeed';
  keywords: string;
  location: string;
  maxResults?: number;
}

export interface ApplicationJobData {
  userId: string;
  jobId: string;
  platform: string;
  jobUrl: string;
  jobTitle: string;
  companyName: string;
  companyId: string;
  resumeId?: string;
  resumePath?: string;
  matchScore: number;
}

export class QueueProducer {
  async addDiscoveryJob(data: DiscoveryJobData) {
    const jobId = `discovery-${data.userId}-${data.platform}-${Date.now()}`;
    return discoveryQueue.add('discover_jobs', data, { jobId });
  }

  async addApplicationJob(data: ApplicationJobData) {
    const jobId = `apply-${data.userId}-${data.companyId}-${data.jobId}-${Date.now()}`;
    return applicationQueue.add('submit_application', data, { jobId });
  }
}

export const queueProducer = new QueueProducer();
