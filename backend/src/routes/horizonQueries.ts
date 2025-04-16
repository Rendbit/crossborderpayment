import express from "express";
import {
  fetchAssets,
  fetchUserDetailsWithInput,
  getAllTrustLines,
  getAllWalletAssets,
  getConversionRates,
  getPath,
} from "../controllers/horizonQueries";
import { moderateLimiter } from "../middlewares/rateLimiter";
import { authenticate } from "../middlewares/authMiddleWare";
import { apiKeyValidator } from "../middlewares/apiKeyValidator";

const router = express.Router();
router.use(apiKeyValidator);
router.use(moderateLimiter);

/**
 * @swagger
 * tags:
 *   - name: Horizon-Query
 *     description: Endpoints for interacting with the Stellar network, including asset management, trust lines, conversion rates, and payment paths.
 */

/**
 * @swagger
 * /api/horizonQuery/conversion:
 *   post:
 *     summary: Get conversion rates between XLM and a fiat currency
 *     description: Fetches conversion rates for XLM to a given currency and vice versa using CoinMarketCap API.
 *     tags:
 *       - Horizon-Query
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
 *               - inputAmount
 *               - symbol
 *             properties:
 *               inputAmount:
 *                 type: number
 *                 example: 50
 *               symbol:
 *                 type: string
 *                 example: NGN
 *     responses:
 *       200:
 *         description: Conversion rates fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     xlmToCurrency:
 *                       type: number
 *                     currencyToXlm:
 *                       type: number
 *                     usdToCurrencyRate:
 *                       type: number
 *                     currencyToUsd:
 *                       type: number
 *                 status:
 *                   type: number
 *                   example: 200
 *                 success:
 *                   type: boolean
 *                   example: true
 *       417:
 *         description: Expectation failed - Conversion API error
 *       500:
 *         description: Internal server error
 */
router.post("/conversion", getConversionRates);

/**
 * @swagger
 * /api/horizonQuery/assets:
 *   get:
 *     summary: Get all wallet assets for a user from Stellar Horizon
 *     tags:
 *       - Horizon-Query
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     parameters:
 *       - in: query
 *         name: currencyType
 *         schema:
 *           type: string
 *         required: true
 *         example: usd
 *         description: The currency type for conversion (e.g., usd, ngn)
 *     responses:
 *       200:
 *         description: Successfully fetched all wallet assets.
 *       417:
 *         description: Failed to get all assets from Horizon.
 *       500:
 *         description: Internal server error.
 */
router.get("/assets", authenticate, getAllWalletAssets);

/**
 * @swagger
 * /api/horizonQuery/trustlines:
 *   get:
 *     summary: Get all available trust lines (public assets)
 *     tags:
 *       - Horizon-Query
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     responses:
 *       200:
 *         description: Successfully fetched public trust lines.
 *       500:
 *         description: Internal server error.
 */
router.get("/trustlines", getAllTrustLines);

/**
 * @swagger
 * /api/horizonQuery/path:
 *   post:
 *     summary: Get payment path on Stellar network
 *     tags:
 *       - Horizon-Query
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
 *               - txType
 *               - sourceAssetCode
 *               - desAssetCode
 *               - amount
 *             properties:
 *               txType:
 *                 type: string
 *                 enum: [send, receive]
 *                 example: send
 *               sourceAssetCode:
 *                 type: string
 *                 example: USDC
 *               desAssetCode:
 *                 type: string
 *                 example: NGNC
 *               amount:
 *                 type: number
 *                 example: 10
 *     responses:
 *       200:
 *         description: Successfully retrieved path
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal server error
 */
router.post("/path", getPath);

/**
 * @swagger
 * /api/horizonQuery/fetch-assets:
 *   post:
 *     summary: Fetch assets from Stellar Expert API
 *     tags:
 *       - Horizon-Query
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
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         required: false
 *         example: 10
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: Successfully fetched assets
 *       400:
 *         description: Invalid request
 *       417:
 *         description: Failed to fetch assets
 *       500:
 *         description: Internal server error
 */
router.post("/fetch-assets", fetchAssets);

/**
 * @swagger
 * /api/horizonQuery/fetch-user-details:
 *   post:
 *     summary: Fetch user details using input and search type
 *     tags:
 *       - Horizon-Query
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
 *               - searchType
 *               - input
 *             properties:
 *               searchType:
 *                 type: string
 *                 description: The user field to search by (e.g. 'username', 'primaryEmail', 'rendbitId')
 *                 example: username
 *               input:
 *                 type: string
 *                 description: The input value to search for
 *                 example: johndoe
 *     responses:
 *       200:
 *         description: User details fetched successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post("/fetch-user-details", fetchUserDetailsWithInput);

export default router;
