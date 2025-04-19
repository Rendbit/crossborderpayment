import express from "express";
import { authenticate } from "../middlewares/authMiddleWare";
import { initiateTransfer24, queryTransfers24 } from "../controllers/sep24";
import { moderateLimiter } from "../middlewares/rateLimiter";
import { apiKeyValidator } from "../middlewares/apiKeyValidator";

const router = express.Router();
router.use(apiKeyValidator);
// router.use(moderateLimiter);

/**
 * @swagger
 * tags:
 *   - name: SEP-24
 *     description: Endpoints for managing SEP-24 transactions, including initiating and querying transfers.
 */

/**
 * @swagger
 * /api/sep24/initiateTransfer24/{txType}:
 *   post:
 *     summary: Initiates a SEP-24 transfer
 *     tags: [SEP-24]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: txType
 *         schema:
 *           type: string
 *         required: true
 *         description: The transaction type (e.g., deposit or withdraw)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assetCode:
 *                 type: string
 *               stellarPublicKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transfer initiated successfully
 *       417:
 *         description: Expectation failed - transfer server error
 *       500:
 *         description: Internal server error
 */
router.post("/initiateTransfer24/:txType", authenticate, initiateTransfer24);

/**
 * @swagger
 * /api/sep24/queryTransfers24:
 *   get:
 *     summary: Query SEP-24 transfer history
 *     tags: [SEP-24]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     parameters:
 *       - in: query
 *         name: assetCode
 *         schema:
 *           type: string
 *         required: true
 *         description: The asset code to query (e.g., USDC)
 *     responses:
 *       200:
 *         description: Query successful
 *       417:
 *         description: Expectation failed - transfer server error
 *       500:
 *         description: Internal server error
 */
router.get("/queryTransfers24", authenticate, queryTransfers24);

export default router;
