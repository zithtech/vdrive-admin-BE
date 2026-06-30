// src/modules/auth/auth.controller.ts - Optimized with Winston logger
import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { successResponse } from '../../shared/errorHandler';
import { logger } from '../../shared/logger';
import ms from 'ms';
import config from '../../config';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
  user?: { id: string };
}

export const AuthController = {
  async signIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { user_name } = req.body;

    try {
      logger.info(`User login attempt: ${user_name || 'unknown'}`);

      const { user_name: username, password } = req.body;

      if (!username?.trim()) {
        throw { statusCode: 400, message: 'Username is required' };
      }
      if (!password?.trim()) {
        throw { statusCode: 400, message: 'Password is required' };
      }

      const tokens = await AuthService.signIn({ user_name: username, password });

      const isProduction = config.nodeEnv === 'production';
      let refreshTokenExpiry: number;

      if (typeof config.jwt.refreshExpiresIn === 'number') {
        refreshTokenExpiry = config.jwt.refreshExpiresIn;
      } else {
        refreshTokenExpiry = ms(config.jwt.refreshExpiresIn || '7d');
      }

      res.cookie('refresh_token', tokens.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        maxAge: refreshTokenExpiry,
        sameSite: 'none',
        // domain: isProduction ? process.env.COOKIE_DOMAIN : undefined,
        path: '/api/auth',
      });

      logger.info(`User signed in successfully: ${user_name}`);
      successResponse(res, 200, 'User signed in successfully', {
        accessToken: tokens.accessToken,
      });
    } catch (error: any) {
      logger.warn(`Login failed for ${user_name || 'unknown'}: ${error.message}`);
      next(error);
    }
  },


  async refreshAccessToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refresh_token;

      if (!refreshToken) {
        logger.warn('Refresh token not found in cookies');
        throw { statusCode: 401, message: 'Refresh token not found in cookies' };
      }

      logger.info('Access token refresh attempt');
      const newAccessToken = await AuthService.refreshAccessToken(refreshToken);

      const decoded = jwt.verify(newAccessToken, config.jwt.secret) as any;
      if (decoded?.id) {
        logger.info(`Token refreshed successfully for user ID: ${decoded.id}`);
      }

      successResponse(res, 200, 'Access token refreshed successfully', {
        accessToken: newAccessToken,
        expiresIn: config.jwt.expiresIn,
      });
    } catch (error: any) {
      logger.warn(`Token refresh failed: ${error.message}`);
      next(error);
    }
  },

  async getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        logger.warn('getMe called without user ID');
        throw { statusCode: 401, message: 'User not authenticated' };
      }

      logger.info(`Fetching profile for user ID: ${userId}`);
      const userProfile = await AuthService.getMe(userId);

      if (!userProfile) {
        logger.warn(`User not found for ID: ${userId}`);
        throw { statusCode: 404, message: 'User not found' };
      }

      logger.info(`Profile fetched successfully for user ID: ${userId}`);
      successResponse(res, 200, 'User profile retrieved successfully', userProfile);
    } catch (error: any) {
      logger.error(`getMe error: ${error.message}`);
      next(error);
    }
  },

  async signOut(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'strict',
        path: '/api/auth',
      });

      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const decoded = jwt.verify(token, config.jwt.secret) as any;
          if (decoded?.id) {
            logger.info(`User signed out: User ID ${decoded.id}`);
          }
        } catch (error) {
          logger.info('Sign out completed (token expired/malformed)');
        }
      } else {
        logger.info('Sign out completed (no auth token provided)');
      }

      successResponse(res, 200, 'User signed out successfully');
    } catch (error: any) {
      logger.error(`Sign out error: ${error.message}`);
      next(error);
    }
  },

  async changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user?.id;

    try {
      if (!userId) {
        throw { statusCode: 401, message: 'User not authenticated' };
      }

      logger.info(`Password change attempt for user ID: ${userId}`);

      if (!oldPassword?.trim() || !newPassword?.trim()) {
        throw { statusCode: 400, message: 'Old and new passwords are required' };
      }

      await AuthService.changePassword(userId, oldPassword, newPassword);

      logger.info(`Password changed successfully for user ID: ${userId}`);
      successResponse(res, 200, 'Password updated successfully');
    } catch (error: any) {
      logger.warn(`Password change failed for user ID: ${userId}: ${error.message}`);
      next(error);
    }
  },

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    const { contact } = req.body;

    try {
      if (!userId) {
        throw { statusCode: 401, message: 'User not authenticated' };
      }

      logger.info(`Profile update attempt for user ID: ${userId}`);

      await AuthService.updateProfile(userId, { contact });

      logger.info(`Profile updated successfully for user ID: ${userId}`);
      successResponse(res, 200, 'Profile updated successfully');
    } catch (error: any) {
      logger.warn(`Profile update failed for user ID: ${userId}: ${error.message}`);
      next(error);
    }
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { token } = req.body;
    try {
      if (!token?.trim()) {
        throw { statusCode: 400, message: 'Verification token is required' };
      }

      await AuthService.verifyEmail(token);
      
      logger.info('Email verified successfully');
      successResponse(res, 200, 'Email verified successfully');
    } catch (error: any) {
      logger.warn(`Email verification failed: ${error.message}`);
      next(error);
    }
  },

  async resendVerificationEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { email } = req.body;
    try {
      if (!email?.trim()) {
        throw { statusCode: 400, message: 'Email is required' };
      }

      await AuthService.resendVerificationEmail(email);
      
      logger.info(`Verification email resent to ${email}`);
      successResponse(res, 200, 'Verification email sent successfully');
    } catch (error: any) {
      logger.warn(`Resending verification email failed for ${email}: ${error.message}`);
      next(error);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { email } = req.body;
    try {
      if (!email?.trim()) {
        throw { statusCode: 400, message: 'Email is required' };
      }

      await AuthService.forgotPassword(email);
      
      logger.info(`OTP sent to ${email} for password reset`);
      successResponse(res, 200, 'If this email is registered, an OTP has been sent.');
    } catch (error: any) {
      logger.warn(`Forgot password failed for ${email}: ${error.message}`);
      next(error);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { email, otp, newPassword } = req.body;
    try {
      if (!email?.trim() || !otp?.trim() || !newPassword?.trim()) {
        throw { statusCode: 400, message: 'Email, OTP, and new password are required' };
      }

      await AuthService.resetPassword(email, otp, newPassword);
      
      logger.info(`Password successfully reset for ${email}`);
      successResponse(res, 200, 'Password has been reset successfully');
    } catch (error: any) {
      logger.warn(`Reset password failed for ${email}: ${error.message}`);
      next(error);
    }
  },

  // async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  //   const { user_name } = req.body;

  //   try {
  //     logger.info(`Password reset requested for: ${user_name || 'unknown'}`);

  //     if (!user_name?.trim()) {
  //       throw { statusCode: 400, message: 'Username is required' };
  //     }

  //     await AuthService.forgotPassword({ user_name });

  //     logger.info(`Password reset link sent successfully to: ${user_name}`);
  //     successResponse(res, 200, 'Forgot password link sent successfully');
  //   } catch (error: any) {
  //     logger.warn(`Password reset request failed for ${user_name || 'unknown'}: ${error.message}`);
  //     next(error);
  //   }
  // },

  // async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  //   const { reset_token, new_password } = req.body;

  //   try {
  //     logger.info('Password reset attempt with token');

  //     if (!reset_token?.trim()) {
  //       throw { statusCode: 400, message: 'Reset token is required' };
  //     }
  //     if (!new_password?.trim()) {
  //       throw { statusCode: 400, message: 'New password is required' };
  //     }

  //     await AuthService.resetPassword({ reset_token, new_password });

  //     logger.info('Password reset completed successfully');
  //     successResponse(res, 200, 'Password reset successfully');
  //   } catch (error: any) {
  //     logger.warn(`Password reset failed with token: ${error.message}`);
  //     next(error);
  //   }
  // },
};
