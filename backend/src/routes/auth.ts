import express from "express";
import {
  register,
  login,
  resetPassword,
  authorizeRefreshToken,
  requestEmailValidation,
  createWallet,
  forgotPassword,
  resendForgotPasswordOTP,
  verifyEmail,
  resendEmailVerificationOTP,
} from "../controllers/auth";
import { authenticate } from "../middlewares/authMiddleWare";
import { moderateLimiter, loginLimiter } from "../middlewares/rateLimiter";
import { apiKeyValidator } from "../middlewares/apiKeyValidator";

const router = express.Router();
router.use(apiKeyValidator);
router.use(moderateLimiter);

/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: Routes for user authentication.
 */

/**
 * @swagger
 * /rendbit/crossborderpayment/api/auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticates a user with email and password and returns JWT tokens.
 *     tags:
 *       - Authentication 
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               code:
 *                 type: string
 *                 description: Optional MFA code
 *               captcha:
 *                 type: string
 *                 description: Recaptcha token
 *             required:
 *               - email
 *               - password
 *     responses:
 *       200:
 *         description: User logged in successfully
 *       401:
 *         description: Invalid credentials or MFA required
 *       500:
 *         description: Internal server error
 */
router.post("/login", loginLimiter, login);

/**
 * @swagger
 * /rendbit/crossborderpayment/api/auth/refresh-token:
 *   get:
 *     summary: Refresh user authentication tokens
 *     description: Reissues JWT and refresh tokens using a valid refresh token.
 *     tags:
 *       - Authentication 
 *     security:
 *       - apiKey: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tokens refreshed successfully
 *       404:
 *         description: Account not found
 *       500:
 *         description: Server error
 */
router.get("/refresh-token", authorizeRefreshToken);

/**
 * @swagger
 * /rendbit/crossborderpayment/api/auth/request-email-validation:
 *   post:
 *     summary: Validate and check if email is available
 *     description: Verifies if a given work email is valid and not already taken.
 *     tags:
 *       - Authentication 
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The email to validate.
 *             required:
 *               - email
 *     responses:
 *       200:
 *         description: Email is valid and available
 *       406:
 *         description: Not a valid work email
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Server error
 */
router.post("/request-email-validation", requestEmailValidation);

/**
 * @swagger
 * /rendbit/crossborderpayment/api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Registers a new user using email and password. Password must meet strong criteria.
 *     tags:
 *       - Authentication 
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: johndoe@company.com
 *               referralCode:
 *                 type: string
 *                 format: string
 *                 example: rb-53Gftqw7
 *               password:
 *                 type: string
 *                 example: P@ssw0rd123
 *             required:
 *               - email
 *               - password
 *     responses:
 *       201:
 *         description: User successfully registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     primaryEmail:
 *                       type: string
 *                     username:
 *                       type: string
 *                     token:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: Password is too weak or missing
 *       409:
 *         description: Email already taken
 *       500:
 *         description: Server error
 */
router.post("/register", register);

/**
 * @swagger
 * /rendbit/crossborderpayment/api/auth/wallet/create:
 *   post:
 *     summary: Create Stellar wallet for user
 *     description: Generates a Stellar wallet (public/private keypair) for the authenticated user. Encrypts private key using email, password, and pin code. Only one wallet per user is allowed.
 *     tags:
 *       - Authentication 
 *     security:
 *       - apiKey: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pinCode:
 *                 type: string
 *                 example: "2486"
 *             required:
 *               - pinCode
 *     responses:
 *       200:
 *         description: Wallet successfully created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     publicKey:
 *                       type: string
 *                       example: GA6HCMBLTZS5V7...
 *                     secret:
 *                       type: string
 *                       example: SB2BMN5ZTZJ7...
 *                     token:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       409:
 *         description: Wallet already exists for user
 *       500:
 *         description: Server error
 */
router.post("/wallet/create", authenticate, createWallet);

/**
 * @swagger
 * /rendbit/crossborderpayment/api/auth/forgot-password:
 *   post:
 *     summary: Request OTP to reset password
 *     description: Sends an OTP to the user's email for password reset if the email is valid and registered.
 *     tags:
 *       - Authentication 
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *             required:
 *               - email
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       406:
 *         description: Invalid work email
 *       404:
 *         description: Account not found
 *       500:
 *         description: Internal server error
 */
router.post("/forgot-password", forgotPassword);

/**
 * @swagger
 * /rendbit/crossborderpayment/api/auth/forgot-password/resend:
 *   post:
 *     summary: Resend OTP for password reset
 *     description: Resends the OTP to the user's registered email for resetting password.
 *     tags:
 *       - Authentication 
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *             required:
 *               - email
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *       406:
 *         description: Invalid work email
 *       404:
 *         description: Account not found
 *       500:
 *         description: Internal server error
 */
router.post("/forgot-password/resend", resendForgotPasswordOTP);

/**
 * @swagger
 * /rendbit/crossborderpayment/api/auth/verify-email:
 *   post:
 *     summary: Verify user email using OTP
 *     description: Verifies a user's email by checking the OTP sent to their email.
 *     tags:
 *       - Authentication 
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               otp:
 *                 type: string
 *                 example: "1234"
 *             required:
 *               - otp
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       401:
 *         description: Invalid OTP
 *       404:
 *         description: Account not found
 *       409:
 *         description: Email already verified
 *       500:
 *         description: Internal server error
 */
router.post("/verify-email", verifyEmail);

/**
 * @swagger
 * /rendbit/crossborderpayment/api/auth/resend-verification-otp:
 *   post:
 *     summary: Resend OTP for email verification
 *     description: Resends a one-time password (OTP) to the user's email address for verification purposes.
 *     tags:
 *       - Authentication 
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *             required:
 *               - email
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       404:
 *         description: Email not found
 *       406:
 *         description: Is not a valid work email
 *       500:
 *         description: Internal server error
 */
router.post("/resend-verification-otp", resendEmailVerificationOTP);

/**
 * @swagger
 * /rendbit/crossborderpayment/api/auth/reset-password:
 *   post:
 *     summary: Reset password using OTP
 *     description: Allows the user to reset their password by providing their email, OTP, and new password.
 *     tags:
 *       - Authentication 
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *               otp:
 *                 type: string
 *                 example: "1234"
 *               password:
 *                 type: string
 *                 example: "newStrongPassword123"
 *             required:
 *               - email
 *               - otp
 *               - password
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       401:
 *         description: Invalid OTP or account
 *       404:
 *         description: Account not found
 *       406:
 *         description: Is not a valid work email
 *       500:
 *         description: Internal server error
 */
router.post("/reset-password", resetPassword);

export default router;
