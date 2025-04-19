import { Router } from "express";
import {
  getUserProfile,
  createPassword,
  getUserReferrals,
  getReferralLeaderBoard,
  updateProfile,
  updateProfileImage,
  changePassword,
  exportPrivateKey,
} from "../controllers/user";
import { authenticate } from "../middlewares/authMiddleWare";
import { moderateLimiter } from "../middlewares/rateLimiter";
const router = Router();

// router.use(moderateLimiter);

/**
 * @swagger
 * tags:
 *   - name: User
 *     description: Endpoints related to user management, including profile, authentication, referrals, and security features.
 */

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Get current user's profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     responses:
 *       200:
 *         description: User profile fetched successfully
 */
router.get("/profile", authenticate, getUserProfile);

/**
 * @swagger
 * /api/user/create-password:
 *   post:
 *     summary: Create password for user
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password created successfully
 */
router.post("/create-password", authenticate, createPassword);

/**
 * @swagger
 * /api/user/referrals:
 *   get:
 *     summary: Get user referrals
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Referrals fetched successfully
 */
router.get("/referrals", authenticate, getUserReferrals);

/**
 * @swagger
 * /api/user/referral-leaderboard:
 *   get:
 *     summary: Get referral leaderboard
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Leaderboard fetched successfully
 */
router.get("/referral-leaderboard", authenticate, getReferralLeaderBoard);

/**
 * @swagger
 * /api/user/update-profile:
 *   put:
 *     summary: Update user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               country:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put("/update-profile", authenticate, updateProfile);

/**
 * @swagger
 * /api/user/update-profile-image:
 *   put:
 *     summary: Update user profile image
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userProfileUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile image updated successfully
 */
router.put("/update-profile-image", authenticate, updateProfileImage);

/**
 * @swagger
 * /api/user/change-password:
 *   put:
 *     summary: Change user password
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [oldPassword, password]
 *             properties:
 *               oldPassword:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
router.put("/change-password", authenticate, changePassword);

/**
 * @swagger
 * /api/user/export-private-key:
 *   post:
 *     summary: Export user's private key
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pinCode]
 *             properties:
 *               pinCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Private key exported
 */
router.post("/export-private-key", authenticate, exportPrivateKey);

export default router;
