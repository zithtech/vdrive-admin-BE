// src/modules/users/user.service.ts
import { AuthRepository } from './auth.repository';
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
  async forgotPassword(data: { user_name: string }): Promise<boolean> {
    const userData = await AuthRepository.getUserData({ user_name: data?.user_name });
    if (!userData) {
      throw { statusCode: 404, message: 'User not found' };
    }
    const resetToken = AuthService.generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour expiry

    await AuthRepository.storeResetToken({
      userId: userData.id,
      reset_token: resetToken,
      expires_at: resetTokenExpiry,
    });

    const resetUrl = `${config.prodURL}/reset-password?token=${resetToken}`;
    sendMail({
      to: [data?.user_name],
      subject: 'Password Reset Request',
      body: `
        <h2>Password Reset</h2>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });
    return true;
  },
  async resetPassword(data: { reset_token: string; new_password: string }): Promise<boolean> {
    const user = await AuthRepository.getUserDataBasedOnResetToken({
      reset_token: data.reset_token,
    });
    if (!user) {
      throw { statusCode: 400, message: 'Invalid or expired reset token' };
    }
    if (!user?.reset_token_expiry || new Date() > new Date(user?.reset_token_expiry)) {
      throw { statusCode: 400, message: 'Reset token has expired' };
    }
    const hashedPassword = await AuthService.hashPassword(data.new_password);
    await AuthRepository.updatePassword({ userId: user.id, new_password: hashedPassword });
    // Clear reset token and expiry
    await AuthRepository.storeResetToken({
      userId: user.id,
      reset_token: '',
      expires_at: null,
    });
    return true;
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
};
