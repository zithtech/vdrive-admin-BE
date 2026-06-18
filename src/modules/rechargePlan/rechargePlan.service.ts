
import { RechargePlanRepository } from './rechargePlan.repository';
import axios from 'axios';
import config from '../../config';
import { logger } from '../../shared/logger';

export const RechargePlanService = {
  
 
  async getPlans(page: number = 1, limit: number = 10) {
    return await RechargePlanRepository.getPlans(page, limit);
  },

 
  async getPlanById(id: number) {
    return await RechargePlanRepository.getById(id);
  },


  async createPlan(data: any, adminId: string) {
    const plan = await RechargePlanRepository.create(data);
    await RechargePlanRepository.recordHistory({
      planId: plan.id,
      adminId,
      action: 'CREATE',
      previousData: null,
      newData: plan,
    });
    return plan;
  },


  async updatePlan(id: number, data: any, adminId: string) {
    const oldPlan = await RechargePlanRepository.getById(id);
    
    // Normalize the old plan to camelCase to ensure a perfect merge with the incoming data
    const normalizedOld = {
      planName: oldPlan.plan_name ?? oldPlan.planName,
      description: oldPlan.description,
      validityDays: oldPlan.validity_days ?? oldPlan.validityDays,
      dailyPrice: oldPlan.daily_price ?? oldPlan.dailyPrice,
      weeklyPrice: oldPlan.weekly_price ?? oldPlan.weeklyPrice,
      monthlyPrice: oldPlan.monthly_price ?? oldPlan.monthlyPrice,
      features: oldPlan.features ?? [],
      isActive: oldPlan.is_active ?? (oldPlan.isActive ?? true),
      tag: oldPlan.tag,
    };

    const mergedData = {
      planName: data.planName !== undefined ? data.planName : normalizedOld.planName,
      description: data.description !== undefined ? data.description : normalizedOld.description,
      validityDays: data.validityDays !== undefined ? data.validityDays : normalizedOld.validityDays,
      dailyPrice: data.dailyPrice !== undefined ? data.dailyPrice : normalizedOld.dailyPrice,
      weeklyPrice: data.weeklyPrice !== undefined ? data.weeklyPrice : normalizedOld.weeklyPrice,
      monthlyPrice: data.monthlyPrice !== undefined ? data.monthlyPrice : normalizedOld.monthlyPrice,
      features: data.features !== undefined ? data.features : normalizedOld.features,
      isActive: data.isActive !== undefined ? data.isActive : normalizedOld.isActive,
      tag: data.tag !== undefined ? (data.tag === "" ? null : data.tag) : normalizedOld.tag,
    };

    const updatedPlan = await RechargePlanRepository.update(id, mergedData);
    await RechargePlanRepository.recordHistory({
      planId: id,
      adminId,
      action: 'UPDATE',
      previousData: oldPlan,
      newData: updatedPlan,
    });
    return updatedPlan;
  },

  
  async toggleStatus(id: number, status: boolean, adminId: string) {
    const oldPlan = await RechargePlanRepository.getById(id);
    const updatedPlan = await RechargePlanRepository.toggle(id, status);
    await RechargePlanRepository.recordHistory({
      planId: id,
      adminId,
      action: 'TOGGLE_STATUS',
      previousData: oldPlan,
      newData: updatedPlan,
    });
    return updatedPlan;
  },

  async getActiveSubscriptions() {
    return await RechargePlanRepository.getActiveSubscriptions();
  },

  async getExpiredSubscriptions() {
    return await RechargePlanRepository.getExpiredSubscriptions();
  },

  async getSubscriptionStats() {
    return await RechargePlanRepository.getSubscriptionStats();
  },

  async getDriverSubscriptionHistory(driverId: string) {
    return await RechargePlanRepository.getDriverSubscriptionHistory(driverId);
  },

  async getPlanHistory(id: number) {
    return await RechargePlanRepository.getHistory(id);
  },

  async deletePlan(id: number) {
    return await RechargePlanRepository.delete(id);
  },

  async notifyExpiringSubscribers() {
    const allActiveDrivers = await RechargePlanRepository.getAllActiveSubscribersDetailed();
    
    if (allActiveDrivers.length === 0) {
      return { sentCount: 0, message: 'No active subscriptions found' };
    }

    let sentCount = 0;
    const notificationUrl = `${config.userDriverApiUrl}/api/notifications/send`;

    for (const driver of allActiveDrivers) {
      try {
        const daysLeft = parseInt(driver.days_left);
        let daysLeftText = '';
        
        if (daysLeft < 0) daysLeftText = 'has expired';
        else if (daysLeft === 0) daysLeftText = 'expires today';
        else if (daysLeft === 1) daysLeftText = 'expires tomorrow';
        else daysLeftText = `expires in ${daysLeft} days`;

        await axios.post(notificationUrl, {
          driverId: driver.driver_id,
          title: '📋 Subscription Status Update',
          body: `Hi ${driver.driver_name}, you are currently on the ${driver.plan_name} plan. It ${daysLeftText} (${new Date(driver.expiry_date).toLocaleDateString()}).`,
          data: {
            type: 'PLAN_EXPIRY_REMINDER',
            expiryDate: driver.expiry_date
          }
        }, {
          headers: { 'x-api-key': config.internalServiceApiKey }
        });
        sentCount++;
      } catch (err: any) {
        logger.error(`Failed to notify driver ${driver.driver_id}: ${err.response?.data?.message || err.message}`);
      }
    }

    return { sentCount, totalActive: allActiveDrivers.length };
  },

  async notifyAllExpiredSubscribers() {
    const allExpiredDrivers = await RechargePlanRepository.getAllExpiredSubscribersDetailed();
    
    if (allExpiredDrivers.length === 0) {
      return { sentCount: 0, message: 'No expired subscriptions found' };
    }

    let sentCount = 0;
    const notificationUrl = `${config.userDriverApiUrl}/api/notifications/send`;

    for (const driver of allExpiredDrivers) {
      try {
        await axios.post(notificationUrl, {
          driverId: driver.driver_id,
          title: '❌ Subscription Expired',
          body: `Hi ${driver.driver_name}, your subscription has expired. Please recharge immediately to resume receiving rides.`,
          data: {
            type: 'PLAN_EXPIRY_REMINDER',
            expiryDate: driver.expiry_date
          }
        }, {
          headers: { 'x-api-key': config.internalServiceApiKey }
        });
        sentCount++;
      } catch (err: any) {
        logger.error(`Failed to notify expired driver ${driver.driver_id}: ${err.response?.data?.message || err.message}`);
      }
    }

    return { sentCount, totalExpired: allExpiredDrivers.length };
  },

  async notifyIndividualSubscriber(driverId: string) {
    const subscription = await RechargePlanRepository.getDriverLatestSubscription(driverId);
    
    if (!subscription) {
      throw new Error('No subscription history found for this driver');
    }

    const notificationUrl = `${config.userDriverApiUrl}/api/notifications/send`;
    
    const daysLeft = parseInt(subscription.days_left);
    let daysLeftText = '';
    
    if (daysLeft < 0) daysLeftText = 'has expired';
    else if (daysLeft === 0) daysLeftText = 'expires today';
    else if (daysLeft === 1) daysLeftText = 'expires tomorrow';
    else daysLeftText = `expires in ${daysLeft} days`;

    await axios.post(notificationUrl, {
      driverId: subscription.driver_id,
      title: daysLeft < 0 ? '❌ Subscription Expired' : '📋 Subscription Status',
      body: `Hi ${subscription.driver_name}, you are on the ${subscription.plan_name} plan. It ${daysLeftText} (${new Date(subscription.expiry_date).toLocaleDateString()}). ${daysLeft < 0 ? 'Please recharge immediately.' : ''}`,
      data: {
        type: 'PLAN_EXPIRY_REMINDER',
        expiryDate: subscription.expiry_date
      }
    }, {
      headers: { 'x-api-key': config.internalServiceApiKey }
    });

    return { success: true };
  },

  async runAutomatedDailyNotifications() {
    const allDrivers = await RechargePlanRepository.getAllActiveSubscribersDetailed();
    let sentCount = 0;
    const notificationUrl = `${config.userDriverApiUrl}/api/notifications/send`;

    for (const driver of allDrivers) {
      try {
        const daysLeft = parseInt(driver.days_left);
        let title = '';
        let body = '';
        let shouldNotify = false;

        if (daysLeft === 3) {
          title = '⏳ Subscription Reminder';
          body = `Hi ${driver.driver_name}, your ${driver.plan_name} plan expires in 3 days. Prepare for a recharge to continue service smoothly.`;
          shouldNotify = true;
        } else if (daysLeft === 1) {
          title = '⚠️ Action Required: Subscription Expiring';
          body = `Hi ${driver.driver_name}, your subscription ends tomorrow. Recharge now to avoid service interruption!`;
          shouldNotify = true;
        } else if (daysLeft === 0) {
          title = '🚨 Final Notice: Subscription Expires Today';
          body = `Hi ${driver.driver_name}, your subscription expires today. This is your last day to recharge before the plan ends.`;
          shouldNotify = true;
        } else if (daysLeft === -1) {
          title = '❌ Subscription Expired';
          body = `Hi ${driver.driver_name}, your subscription has expired. Please recharge immediately to resume receiving rides.`;
          shouldNotify = true;
        }

        if (shouldNotify) {
          await axios.post(notificationUrl, {
            driverId: driver.driver_id,
            title,
            body,
            data: {
              type: 'PLAN_EXPIRY_REMINDER',
              daysLeft,
              expiryDate: driver.expiry_date
            }
          }, {
            headers: { 'x-api-key': config.internalServiceApiKey }
          });
          sentCount++;
        }
      } catch (err: any) {
        logger.error(`Failed automated notification for driver ${driver.driver_id}: ${err.message}`);
      }
    }

    return { sentCount, scannedCount: allDrivers.length };
  },

  async getPayments(page = 1, limit = 10) {
    return await RechargePlanRepository.getPayments(page, limit);
  },

  async getDriverPayments(driverId: string) {
    return await RechargePlanRepository.getDriverPayments(driverId);
  }
};

