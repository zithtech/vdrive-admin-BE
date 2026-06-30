// src/modules/auth/auth.routes.ts
import { Router } from 'express';
import { AuthController } from './auth.controller';
import { AuthValidation } from './auth.validator';
import { validateBody } from '../../utilities/helper';
import isAuthenticated from '../../shared/authentication';

const router = Router();

router.post('/signin', validateBody(AuthValidation.signInValidation), AuthController.signIn);

router.post(
  '/forgot-password',
  validateBody(AuthValidation.forgotPasswordValidation),
  AuthController.forgotPassword
);

router.post(
  '/reset-password',
  validateBody(AuthValidation.resetPasswordValidation),
  AuthController.resetPassword
);

router.post('/refresh-token', AuthController.refreshAccessToken);

router.post('/verify-email', AuthController.verifyEmail);

router.post('/resend-verification', AuthController.resendVerificationEmail);

router.use(isAuthenticated);
router.get('/me', AuthController.getMe);
router.post('/signout', AuthController.signOut);
router.post(
  '/change-password',
  validateBody(AuthValidation.changePasswordValidation),
  AuthController.changePassword
);
router.post(
  '/update-profile',
  validateBody(AuthValidation.updateProfileValidation),
  AuthController.updateProfile
);

export default router;
