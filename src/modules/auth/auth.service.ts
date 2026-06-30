import { AuthRepository } from './auth.repository';
import { AdminUserRepository } from '../admin-users/adminUser.repository';
import * as bcrypt from 'bcrypt';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import config from '../../config';
import { sendMail } from '../../shared/sendEmail';
import { AdminUser } from '../admin-users/adminUser.model';
import { transformPermissions, NestedPermissions } from '../../utilities/permission.helper';

export const AuthService = {
  generateResetToken(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },
  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  },
  validatePassword(password: string, hashed_password: string): Promise<boolean> {
    return bcrypt.compare(password, hashed_password);
  },
  generateTokens(payload: JwtPayload & { id: string; role: string }) {
    const accessTokenOptions: SignOptions = { expiresIn: config.jwt.expiresIn };
    const refreshTokenOptions: SignOptions = { expiresIn: config.jwt.refreshExpiresIn };

    const accessToken = jwt.sign(payload, config.jwt.secret, accessTokenOptions);
    const refreshToken = jwt.sign(
      { id: payload.id },
      config.jwt.refreshSecret,
      refreshTokenOptions
    );

    return {
      accessToken,
      refreshToken,
    };
  },

  async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as JwtPayload & {
        id: string;
      };

      if (!decoded?.id) {
        throw { statusCode: 401, message: 'Invalid refresh token' };
      }

      // Check if user exists
      const userData = await AuthRepository.getUserDataById(decoded.id);
      if (!userData) {
        throw { statusCode: 401, message: 'User not found' };
      }

      // Generate new access token
      const payload: JwtPayload & { id: string; role: string } = {
        id: userData.id,
        role: userData.role,
      };
      const accessTokenOptions: SignOptions = { expiresIn: config.jwt.expiresIn };
      const newAccessToken = jwt.sign(payload, config.jwt.secret, accessTokenOptions);

      return newAccessToken;
    } catch (error) {
      throw { statusCode: 401, message: 'Invalid or expired refresh token' };
    }
  },

  async signIn(data: {
    user_name: string;
    password: string;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const userData = await AuthRepository.getUserData({ user_name: data?.user_name });
    if (!userData) {
      throw { statusCode: 401, message: 'Invalid credentials' };
    }
    
    if (userData.email_verified === false) {
      throw { statusCode: 403, message: 'Please verify your email address before logging in' };
    }

    const isPasswordValid = await AuthService.validatePassword(data?.password, userData?.password);
    if (!isPasswordValid) {
      throw { statusCode: 401, message: 'Invalid credentials' };
    }
    const payload: JwtPayload & { id: string; role: string } = {
      id: userData.id,
      role: userData.role,
    };

    const tokens = AuthService.generateTokens(payload);
    return tokens;
  },

  async getMe(userId: string): Promise<any> {
    const userProfile = await AuthRepository.getUserProfileById(userId);
    if (!userProfile) {
      return null;
    }

    let permissions: NestedPermissions = {};
    if (userProfile.role === 'super_admin') {
      const allPermissions = await AuthRepository.getAllSystemPermissions();
      permissions = transformPermissions(allPermissions);
    } else {
      const rawPermissions = await AuthRepository.getUserPermissions(userId);
      permissions = transformPermissions(rawPermissions);
    }

    return {
      id: userProfile.id,
      name: userProfile.name,
      email: userProfile.email,
      contact: userProfile.contact,
      role: userProfile.role,
      permissions,
    };
  },

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    const user = await AuthRepository.getUserDataById(userId);
    
    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }

    const isPasswordValid = await AuthService.validatePassword(oldPassword, user.password);
    if (!isPasswordValid) {
      throw { statusCode: 400, message: 'Incorrect old password' };
    }

    const hashedNewPassword = await AuthService.hashPassword(newPassword);
    await AuthRepository.updatePassword({ userId, new_password: hashedNewPassword });

    return true;
  },

  async verifyEmail(token: string): Promise<boolean> {
    const user = await AdminUserRepository.findByVerificationToken(token);
    if (!user) {
      throw { statusCode: 400, message: 'Invalid or expired verification token' };
    }
    
    await AdminUserRepository.verifyEmail(user.id);
    return true;
  },

  async resendVerificationEmail(email: string): Promise<boolean> {
    const user = await AdminUserRepository.findByEmail(email);
    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }
    if (user.email_verified) {
      throw { statusCode: 400, message: 'Email is already verified' };
    }

    const verification_token = require('crypto').randomBytes(32).toString('hex');
    await AdminUserRepository.updateVerificationToken(user.id, verification_token);

    const frontendUrl = process.env.NODE_ENV === 'production' ? config.prodURL : 'http://localhost:5174';
    const verifyUrl = `${frontendUrl}/verify-email?token=${verification_token}`;
    
    sendMail({
      to: [user.email],
      subject: 'Verify your Admin Account',
      body: `
        <h2>Welcome to vDrive Admin</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verifyUrl}">Verify Email</a>
      `,
    });

    return true;
  },

  async forgotPassword(email: string): Promise<boolean> {
    const user = await AdminUserRepository.findWithTokensByEmail(email);
    if (!user) {
      // Don't throw an error to prevent email enumeration, just return true
      return true;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    await AdminUserRepository.updateResetToken(user.id, otp, expiry);

    sendMail({
      to: [user.email],
      subject: 'Reset your Admin Password',
      body: `
        <h2>vDrive Admin Password Reset</h2>
        <p>You requested a password reset. Please use the following 6-digit OTP to reset your password:</p>
        <h3 style="letter-spacing: 5px;">${otp}</h3>
        <p>This code will expire in 15 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });

    return true;
  },

  async resetPassword(email: string, otp: string, newPassword: string): Promise<boolean> {
    const user = await AdminUserRepository.findWithTokensByEmail(email);
    if (!user) {
      throw { statusCode: 400, message: 'Invalid request' };
    }

    if (user.reset_token !== otp) {
      throw { statusCode: 400, message: 'Invalid OTP' };
    }

    if (!user.reset_token_expiry || new Date() > user.reset_token_expiry) {
      throw { statusCode: 400, message: 'OTP has expired. Please request a new one.' };
    }

    const hashedNewPassword = await AuthService.hashPassword(newPassword);
    await AdminUserRepository.updatePassword(user.id, hashedNewPassword);

    return true;
  },

  async updateProfile(userId: string, data: { contact?: string }): Promise<boolean> {
    const user = await AuthRepository.getUserDataById(userId);
    
    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }

    await AuthRepository.updateProfile(userId, data);
    return true;
  },
};
