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
// router.use(moderateLimiter);

/**
 * @swagger
 * tags:
 *   - name: Horizon-Query
 *     description: Endpoints for interacting with the Stellar network, including asset management, trust lines, conversion rates, and payment paths.
 */

/**
 * @swagger
 * /api/horizonQueries/getConversionRates:
 *   post:
 *     summary: Get currency conversion rates
 *     description: Convert an amount from one currency or asset symbol to another using CoinMarketCap API.
 *     tags:
 *       - Conversion
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
 *               - inputSymbol
 *               - outputSymbol
 *             properties:
 *               inputAmount:
 *                 type: number
 *                 example: 100
 *                 description: The amount to convert.
 *               inputSymbol:
 *                 type: string
 *                 example: XLM
 *                 description: Symbol of the currency to convert from.
 *               outputSymbol:
 *                 type: string
 *                 example: NGN
 *                 description: Symbol of the currency to convert to.
 *     responses:
 *       200:
 *         description: Successfully retrieved conversion rate
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     inputAmount:
 *                       type: number
 *                       example: 100
 *                     inputSymbol:
 *                       type: string
 *                       example: XLM
 *                     outputSymbol:
 *                       type: string
 *                       example: NGN
 *                     originalAmount:
 *                       type: number
 *                       example: 100
 *                     convertedAmount:
 *                       type: number
 *                       example: 152300
 *                     rate:
 *                       type: number
 *                       example: 1523
 *       400:
 *         description: Invalid request payload
 *       500:
 *         description: Internal server error
 */
router.post("/getConversionRates", getConversionRates);

/**
 * @swagger
 * /api/horizonQueries/getAllWalletAssets:
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
router.get("/getAllWalletAssets", authenticate, getAllWalletAssets);

/**
 * @swagger
 * /api/horizonQueries/getAllTrustLines:
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
router.get("/getAllTrustLines", getAllTrustLines);

/**
 * @swagger
 * /api/horizonQueries/path:
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
 * /api/horizonQueries/fetch-assets:
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
 * /api/horizonQueries/fetch-user-details:
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
