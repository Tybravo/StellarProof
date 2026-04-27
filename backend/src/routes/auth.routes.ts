import { Router } from 'express';
import { forgotPassword, login, register } from '../controllers/auth.controller';

const router = Router();

/**
 * @route  POST /api/v1/auth/login
 * @desc   Login with email and password
 * @access Public
 */
router.post('/login', login);

/**
 * @route  POST /api/v1/auth/register
 * @desc   Register a new user account
 * @access Public
 */
router.post('/register', register);

/**
 * @route  POST /api/v1/auth/forgot-password
 * @desc   Request a password reset token
 * @access Public
 */
router.post('/forgot-password', forgotPassword);

export default router;
