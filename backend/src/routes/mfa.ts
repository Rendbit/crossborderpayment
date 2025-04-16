import { Router } from "express";
import {
  generateSecret,
  setupMFA,
  verifyOTP,
  getMFASetting,
  toggleMFASetup,
} from "../controllers/mfa";
import { authenticate } from "../middlewares/authMiddleWare";
import { moderateLimiter } from "../middlewares/rateLimiter";

const router = Router();
router.use(moderateLimiter);

/**
 * @swagger
 * tags:
 *   - name: MFA
 *     description: Multi-Factor Authentication endpoints for account security.
 */

/**
 * @swagger
 * /api/mfa/generate-secret:
 *   get:
 *     summary: Generate or fetch user's MFA secret and QR code URL
 *     tags: [MFA]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     responses:
 *       200:
 *         description: MFA secret generated or fetched successfully
 */
router.get("/generate-secret", authenticate, generateSecret);

/**
 * @swagger
 * /api/mfa/setup:
 *   post:
 *     summary: Setup MFA with a verification code
 *     tags: [MFA]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *                 description: Verification code from user's authenticator app
 *     responses:
 *       200:
 *         description: MFA setup completed successfully
 */
router.post("/setup", authenticate, setupMFA);

/**
 * @swagger
 * /api/mfa/verify:
 *   post:
 *     summary: Verify MFA code
 *     tags: [MFA]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *                 description: Code from authenticator app to verify
 *     responses:
 *       200:
 *         description: MFA code verified successfully
 */
router.post("/verify", authenticate, verifyOTP);

/**
 * @swagger
 * /api/mfa/settings:
 *   get:
 *     summary: Get MFA status and settings
 *     tags: [MFA]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     responses:
 *       200:
 *         description: MFA settings fetched successfully
 */
router.get("/settings", authenticate, getMFASetting);

/**
 * @swagger
 * /api/mfa/toggle:
 *   put:
 *     summary: Enable or disable MFA
 *     tags: [MFA]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     responses:
 *       200:
 *         description: MFA status toggled successfully
 */
router.put("/toggle", authenticate, toggleMFASetup);

export default router;
