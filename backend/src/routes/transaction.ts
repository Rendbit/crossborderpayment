import express from "express";
import { authenticate } from "../middlewares/authMiddleWare";
import { moderateLimiter } from "../middlewares/rateLimiter";
import {
  addTrustline,
  getFiatTransactions,
  payment,
  removeTrustline,
  strictReceive,
  strictSend,
  swap,
} from "../controllers/transaction";
import { apiKeyValidator } from "../middlewares/apiKeyValidator";

const router = express.Router();
router.use(apiKeyValidator);
router.use(moderateLimiter);

/**
 * @swagger
 * tags:
 *   - name: Transaction
 *     description: API endpoints for handling various transaction operations on the Stellar network.
 */

/**
 * @swagger
 * /api/transaction/add-trustline:
 *   post:
 *     tags: [Transaction]
 *     summary: Add a trustline for a given asset
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assetCode
 *             properties:
 *               assetCode:
 *                 type: string
 *                 example: USDC
 *     responses:
 *       200:
 *         description: Trustline added successfully
 *       500:
 *         description: Internal server error
 */
router.post("/add-trustline", authenticate, addTrustline);

/**
 * @swagger
 * /api/transaction/remove-trustline:
 *   post:
 *     tags: [Transaction]
 *     summary: Remove a trustline for a given asset
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assetCode
 *             properties:
 *               assetCode:
 *                 type: string
 *                 example: USDC
 *     responses:
 *       200:
 *         description: Trustline removed successfully
 *       500:
 *         description: Internal server error
 */
router.post("/remove-trustline", authenticate, removeTrustline);

/**
 * @swagger
 * /api/transaction/payment:
 *   post:
 *     tags: [Transaction]
 *     summary: Send payment to a Stellar address
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assetCode
 *               - address
 *               - amount
 *             properties:
 *               assetCode:
 *                 type: string
 *                 example: USDC
 *               address:
 *                 type: string
 *                 example: GA6HCMBLTZS5VYYP56H2O...
 *               amount:
 *                 type: string
 *                 example: "50"
 *               transactionDetails:
 *                 type: string
 *               currencyType:
 *                 type: string
 *                 enum: [FIAT, CRYPTO]
 *               accountNumber:
 *                 type: string
 *               accountName:
 *                 type: string
 *               bankName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payment successful
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post("/payment", authenticate, payment);

/**
 * @swagger
 * /api/transaction/swap:
 *   post:
 *     summary: Swap assets on Stellar network
 *     description: Swaps assets (e.g., USDT to BTC) on the Stellar network with a defined slippage.
 *     tags: [Transaction]
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
 *               sourceAssetCode:
 *                 type: string
 *                 example: 'XLM'
 *               desAssetCode:
 *                 type: string
 *                 example: 'XLM'
 *               sourceAmount:
 *                 type: number
 *                 example: 1
 *               slippage:
 *                 type: number
 *                 example: 2.5
 *     responses:
 *       200:
 *         description: Successfully swapped assets.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     hash:
 *                       type: string
 *                       example: 'XQNzHgkqGRBdyDJMZqF'
 *                 success:
 *                   type: boolean
 *                   example: true
 *       500:
 *         description: Internal server error.
 */
router.post("/swap", authenticate, swap);

/**
 * @swagger
 * /api/transaction/strictSend:
 *   post:
 *     summary: Strictly send asset to a specific address
 *     description: Sends assets from one account to another with strict validation.
 *     tags: [Transaction]
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
 *               sourceAssetCode:
 *                 type: string
 *                 example: 'XLM'
 *               desAssetCode:
 *                 type: string
 *                 example: 'XLM'
 *               desAmount:
 *                 type: number
 *                 example: 1
 *               sourceAmount:
 *                 type: number
 *                 example: 1
 *               slippage:
 *                 type: number
 *                 example: 2.5
 *               desAddress:
 *                 type: string
 *                 example: 'GDNJkmf8NL39W72v2jb8np1z93VjTm6g2F4Jrrp6zGz1ZGmEdJpDp3B5'
 *     responses:
 *       200:
 *         description: Successfully sent asset.
 *       400:
 *         description: Invalid request or missing parameters.
 */
router.post("/strictSend", authenticate, strictSend);

/**
 * @swagger
 * /api/transaction/strictReceive:
 *   post:
 *     summary: Receive assets with strict path payment on the Stellar network
 *     description: Handles a strict receive operation from the source asset to the destination asset on the Stellar network with slippage tolerance.
 *     tags: [Transaction]
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
 *               sourceAssetCode:
 *                 type: string
 *                 example: 'XLM'
 *               desAssetCode:
 *                 type: string
 *                 example: 'XLM'
 *               desAmount:
 *                 type: number
 *                 example: 1
 *               sourceAmount:
 *                 type: number
 *                 example: 1
 *               slippage:
 *                 type: number
 *                 example: 2.5
 *               desAddress:
 *                 type: string
 *                 example: 'GDNJkmf8NL39W72v2jb8np1z93VjTm6g2F4Jrrp6zGz1ZGmEdJpDp3B5'
 *     responses:
 *       200:
 *         description: Successfully received assets with strict path payment.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     hash:
 *                       type: string
 *                       example: 'XQNzHgkqGRBdyDJMZqF'
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Bad request due to invalid parameters.
 *       500:
 *         description: Internal server error while processing the transaction.
 */
router.post("/strictReceive", authenticate, strictReceive);

/**
 * @swagger
 * /api/transaction/fiat-all:
 *   get:
 *     summary: Get fiat transaction history
 *     description: Retrieves paginated fiat transaction history for the authenticated user.
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of transactions per page.
 *     responses:
 *       200:
 *         description: Fiat transaction history retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 success:
 *                   type: boolean
 *                   example: true
 *       500:
 *         description: Internal server error while fetching fiat transactions.
 */
router.get("/fiat-all", authenticate, getFiatTransactions);

export default router;
