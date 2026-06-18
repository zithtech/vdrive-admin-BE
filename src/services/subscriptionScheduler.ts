import cron from 'node-cron';
import { RechargePlanService } from '../modules/rechargePlan/rechargePlan.service';
import { logger } from '../shared/logger';
import { acquireLock, releaseLock } from '../shared/redis';

/**
 * Initializes scheduled background jobs for subscription management
 */
export const initSubscriptionScheduler = () => {
  // Run daily at 9:00 AM
  // Standard cron format: 'minute hour day-of-month month day-of-week'
  cron.schedule('0 9 * * *', async () => {
    const lockKey = 'automated_subscription_notifications';
    const hasLock = await acquireLock(lockKey, 3600); // 1 hour TTL

    if (!hasLock) {
      logger.debug('Subscription notification job skipped: already running on another instance.');
      return;
    }

    logger.info('Running automated subscription notification job...');
    try {
      const results = await RechargePlanService.runAutomatedDailyNotifications();
      logger.info(
        `Subscription job completed. Notifications sent: ${results.sentCount} out of ${results.scannedCount} active/recently expired drivers.`
      );
    } catch (error: any) {
      logger.error(`Error in subscription notification job: ${error.message}`);
    } finally {
      await releaseLock(lockKey);
    }
  });

  logger.info('✅ Subscription scheduler initialized: Daily at 9:00 AM');
};
