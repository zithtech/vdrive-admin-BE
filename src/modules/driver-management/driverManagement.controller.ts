import { Request, Response, NextFunction } from 'express';
import { DriverManagementRepository } from './driverManagement.repository';
import { notifyUserBackend } from '../../services/socket';

export const DriverManagementController = {
  async getDrivers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;
      
      const result = await DriverManagementRepository.findAll(limit, offset);
      
      return res.status(200).json({
        success: true,
        data: {
          drivers: result.drivers,
          pagination: {
            page,
            limit,
            total: result.total
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async getDriverById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const driver = await DriverManagementRepository.findById(id);
      
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: 'Driver not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: driver
      });
    } catch (error) {
      next(error);
    }
  },

  async createDriver(req: Request, res: Response, next: NextFunction) {
    // Note: Creating drivers might still need to go to the main service if it involves complex onboarding
    // For now, let's keep the user-driver-api proxy for creation if it's critical, 
    // but the request was "why not show real data" which usually refers to the list/details.
    return res.status(501).json({ message: 'Direct driver creation not yet implemented in admin-BE, please use the main service.' });
  },

  async updateDriver(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, status_reason, ...profileData } = req.body;
      
      if (status) {
        await DriverManagementRepository.updateStatus(id, status, status_reason);
      }
      
      let updatedDriver = null;
      if (Object.keys(profileData).length > 0) {
        updatedDriver = await DriverManagementRepository.updateProfile(id, profileData);
      } else if (status) {
        updatedDriver = await DriverManagementRepository.findById(id);
      }

      if (status && updatedDriver) {
        notifyUserBackend('ACCOUNT_STATUS_UPDATE', {
          driverId: updatedDriver.id,
          vdriveId: updatedDriver.vdrive_id,
          status,
          reason: status_reason || null
        });
        
        // Placeholder for FCM Push Notification:
        // await FcmService.sendPushNotification(updatedDriver.id, `Account ${status}`, status_reason);
      }
      
      return res.status(200).json({
        success: true,
        message: 'Driver updated successfully',
        data: updatedDriver
      });
    } catch (error) {
      next(error);
    }
  },

  async adminVerifyDriver(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { kyc_status } = req.body;
      
      await DriverManagementRepository.verifyDriver(id, kyc_status || 'verified');
      
      return res.status(200).json({
        success: true,
        message: 'Driver verified successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  async goOnline(req: Request, res: Response, next: NextFunction) {
    return res.status(501).json({ message: 'Status management should be handled by the driver app/gateway.' });
  },

  async goOffline(req: Request, res: Response, next: NextFunction) {
    return res.status(501).json({ message: 'Status management should be handled by the driver app/gateway.' });
  },

  async getRideActivity(req: Request, res: Response, next: NextFunction) {
    // This might need a new repository for trips
    return res.status(501).json({ message: 'Ride activity fetching from local DB not yet implemented.' });
  },

  async getPerformance(req: Request, res: Response, next: NextFunction) {
    return res.status(501).json({ message: 'Performance fetching from local DB not yet implemented.' });
  },

  async getEarningsSummary(req: Request, res: Response, next: NextFunction) {
    return res.status(501).json({ message: 'Earnings summary fetching from local DB not yet implemented.' });
  },

  async getWalletBalance(req: Request, res: Response, next: NextFunction) {
    return res.status(501).json({ message: 'Wallet balance fetching from local DB not yet implemented.' });
  },

  async searchNearbyDrivers(req: Request, res: Response, next: NextFunction) {
    try {
      const { query } = req.body;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const result = await DriverManagementRepository.search(query, limit, offset);
      
      return res.status(200).json({
        success: true,
        data: {
          drivers: result.drivers,
          pagination: {
            page,
            limit,
            total: result.total
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },
  
  async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await DriverManagementRepository.getDashboardStats();
      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  },
};
