import { Request, Response, NextFunction } from 'express';
import { DrivingTestRepository } from './driving-test.repository';
import { DrivingTestService } from './driving-test.service';
import { AdminDecisionDto } from './driving-test.model';

export class DrivingTestController {
  public static async listSessions(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 10));
      const offset = (page - 1) * limit;

      const status = req.query.status as string;
      const adminDecision = req.query.adminDecision as string;
      const search = req.query.search as string;

      const [sessions, total] = await Promise.all([
        DrivingTestRepository.findAllSessions(limit, offset, status, adminDecision, search),
        DrivingTestRepository.countSessions(status, adminDecision, search),
      ]);

      return res.status(200).json({
        success: true,
        sessions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getSessionReport(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params;
      const report = await DrivingTestService.getSessionReviewReport(id);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Driving test session not found',
        });
      }

      return res.status(200).json({
        success: true,
        ...report,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async submitDecision(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params;
      const { decision, notes, scoreOverride } = req.body;

      if (!decision || !['APPROVED', 'RETEST_REQUESTED', 'REJECTED'].includes(decision)) {
        return res.status(400).json({
          success: false,
          message: "Valid decision ('APPROVED', 'RETEST_REQUESTED', 'REJECTED') is required",
        });
      }

      if (!notes || typeof notes !== 'string' || notes.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Detailed audit review notes are required',
        });
      }

      const adminId = (req as any).user?.id || '00000000-0000-0000-0000-000000000001';
      const dto: AdminDecisionDto = {
        decision,
        notes: notes.trim(),
        scoreOverride: scoreOverride !== undefined && scoreOverride !== null ? Number(scoreOverride) : undefined,
      };

      const updated = await DrivingTestService.submitAdminDecision(id, adminId, dto);

      return res.status(200).json({
        success: true,
        message: `Driving assessment session successfully ${decision.toLowerCase().replace('_', ' ')}`,
        session: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async listRoutes(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const routes = await DrivingTestRepository.listRoutes();
      return res.status(200).json({
        success: true,
        routes,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async createRoute(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { title, city, totalDistanceMeters, estimatedDurationMinutes, checkpoints, polyline } = req.body;

      if (!title || !city || !totalDistanceMeters) {
        return res.status(400).json({
          success: false,
          message: 'Title, city, and totalDistanceMeters are required',
        });
      }

      const route = await DrivingTestRepository.createRoute({
        title,
        city,
        totalDistanceMeters: Number(totalDistanceMeters),
        estimatedDurationMinutes: Number(estimatedDurationMinutes) || 20,
        checkpoints: checkpoints || [],
        polyline: polyline || [],
        isActive: true,
      });

      return res.status(201).json({
        success: true,
        route,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateRoute(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params;
      const updated = await DrivingTestRepository.updateRoute(id, req.body);

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Driving test route not found or no fields to update',
        });
      }

      return res.status(200).json({
        success: true,
        route: updated,
      });
    } catch (err) {
      next(err);
    }
  }
}
