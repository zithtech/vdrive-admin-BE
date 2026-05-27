import { Request, Response, NextFunction } from 'express';
import { DriverManagementRepository } from './driverManagement.repository';
import { notifyUserBackend } from '../../services/socket';
import { forwardRequest } from '../../shared/forwardRequest';
import config from '../../config';


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
      const { status, status_reason, ...profileData } = req.body || {};
      
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
      const { kyc_status } = req.body || {};
      
      const status = kyc_status === 'verified' ? 'active' : undefined;
      await DriverManagementRepository.verifyDriver(id, kyc_status || 'verified');
      
      const updatedDriver = await DriverManagementRepository.findById(id);
      
      if (updatedDriver) {
        notifyUserBackend('ACCOUNT_STATUS_UPDATE', {
          driverId: updatedDriver.id,
          vdriveId: updatedDriver.vdrive_id,
          status: updatedDriver.status,
          kyc_status: updatedDriver.kyc_status,
          reason: kyc_status === 'verified' ? 'KYC Verified' : 'KYC Rejected'
        });
      }
      
      return res.status(200).json({
        success: true,
        message: `Driver ${kyc_status || 'verified'} successfully`,
        data: updatedDriver
      });
    } catch (error) {
      next(error);
    }
  },

  async verifyDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { document_id } = req.params;
      const { status, reason } = req.body || {};
      
      const updatedDoc = await DriverManagementRepository.updateDocumentStatus(document_id, status, reason);
      
      if (!updatedDoc) {
        return res.status(404).json({ success: false, message: 'Document not found' });
      }

      // Notify driver about document status update
      notifyUserBackend('DOCUMENT_STATUS_UPDATE', {
        driverId: updatedDoc.driver_id,
        documentId: updatedDoc.id,
        status: updatedDoc.status,
        reason: updatedDoc.rejection_reason || null
      });

      const updatedDriver = await DriverManagementRepository.findById(updatedDoc.driver_id);

      return res.status(200).json({
        success: true,
        message: 'Document status updated successfully',
        data: updatedDriver
      });
    } catch (error) {
      next(error);
    }
  },

  async bulkVerifyDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updatedDocs = await DriverManagementRepository.bulkVerifyDocuments(id);
      
      if (updatedDocs && updatedDocs.length > 0) {
        // Notify driver for each updated document or a bulk notification
        // For simplicity, we send individual notifications as the frontend expects it per document usually,
        // or one overall notification if supported.
        updatedDocs.forEach(doc => {
          notifyUserBackend('DOCUMENT_STATUS_UPDATE', {
            driverId: id,
            documentId: doc.id,
            status: 'verified',
            reason: 'Bulk Verified'
          });
        });
      }

      // Return the updated driver details so frontend can sync
      const driver = await DriverManagementRepository.findById(id);

      return res.status(200).json({
        success: true,
        message: 'All documents verified successfully',
        data: driver
      });
    } catch (error) {
      next(error);
    }
  },

  async getDocumentHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { document_id } = req.params;
      const history = await DriverManagementRepository.getDocumentHistory(document_id);
      
      return res.status(200).json({
        success: true,
        data: history
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
    return forwardRequest(req, res, next, config.userDriverApiUrl);
  },

  async getPerformance(req: Request, res: Response, next: NextFunction) {
    return forwardRequest(req, res, next, config.userDriverApiUrl);
  },

  async getEarningsSummary(req: Request, res: Response, next: NextFunction) {
    return forwardRequest(req, res, next, config.userDriverApiUrl);
  },

  async getWalletBalance(req: Request, res: Response, next: NextFunction) {
    return forwardRequest(req, res, next, config.userDriverApiUrl);
  },

  async getTodayOverview(req: Request, res: Response, next: NextFunction) {
    return forwardRequest(req, res, next, config.userDriverApiUrl);
  },

  async searchNearbyDrivers(req: Request, res: Response, next: NextFunction) {
    try {
      const { query } = req.body || {};
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

  async getAvailableDriversForAssignment(req: Request, res: Response, next: NextFunction) {
    return forwardRequest(req, res, next, config.userDriverApiUrl);
  },
};
