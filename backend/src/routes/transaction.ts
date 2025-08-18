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
  getTransactions,
  paymentPreview,
  swapPreview,
  strictSendPreview,
  strictReceivePreview,
} from "../controllers/transaction";
import { apiKeyValidator } from "../middlewares/apiKeyValidator";

const router = express.Router();
router.use(apiKeyValidator);

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
 *     description: Allows a user to add a trustline for a specific asset on the Stellar network.
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
 *                 description: The asset code to add trustline for (e.g., USDC, NATIVE)
 *                 example: USDC
 *     responses:
 *       200:
 *         description: Trustline added successfully
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
 *                       description: Transaction hash
 *                 message:
 *                   type: string
 *                 status:
 *                   type: integer
 *                 success:
 *                   type: boolean
 *       400:
 *         description: Bad request (e.g., invalid asset code)
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
 *     description: Allows a user to remove a trustline for a specific asset on the Stellar network.
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
 *                 description: The asset code to remove trustline for (e.g., USDC, NATIVE)
 *                 example: USDC
 *     responses:
 *       200:
 *         description: Trustline removed successfully
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
 *                       description: Transaction hash
 *                 message:
 *                   type: string
 *                 status:
 *                   type: integer
 *                 success:
 *                   type: boolean
 *       400:
 *         description: Bad request (e.g., invalid asset code)
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
 *     description: Send a payment transaction to another Stellar address with optional fiat details.
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
 *                 description: Asset code to send (e.g., USDC, NATIVE)
 *                 example: USDC
 *               address:
 *                 type: string
 *                 description: Destination Stellar public key
 *                 example: GA6HCMBLTZS5VYYP56H2O...
 *               amount:
 *                 type: string
 *                 description: Amount to send
 *                 example: "50"
 *               transactionDetails:
 *                 type: string
 *                 description: Optional transaction details/memo
 *               currencyType:
 *                 type: string
 *                 enum: [FIAT, CRYPTO]
 *                 description: Type of transaction (fiat or crypto)
 *               accountNumber:
 *                 type: string
 *                 description: Required for FIAT transactions - recipient account number
 *               accountName:
 *                 type: string
 *                 description: Required for FIAT transactions - recipient account name
 *               bankName:
 *                 type: string
 *                 description: Required for FIAT transactions - recipient bank name
 *     responses:
 *       200:
 *         description: Payment successful
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
 *                       description: Transaction hash
 *                 status:
 *                   type: integer
 *                 success:
 *                   type: boolean
 *       400:
 *         description: Validation error (e.g., invalid address, insufficient balance)
 *       500:
 *         description: Internal server error
 */
router.post("/payment", authenticate, payment);

/**
 * @swagger
 * /api/transaction/preview/payment:
 *   post:
 *     tags: [Transaction]
 *     summary: Preview a payment transaction
 *     description: Preview payment details before executing the actual transaction.
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
 *                 description: Asset code to send (e.g., USDC, NATIVE)
 *                 example: USDC
 *               address:
 *                 type: string
 *                 description: Destination Stellar public key
 *                 example: GA6HCMBLTZS5VYYP56H2O...
 *               amount:
 *                 type: string
 *                 description: Amount to send
 *                 example: "50"
 *               transactionDetails:
 *                 type: string
 *                 description: Optional transaction details/memo
 *               currencyType:
 *                 type: string
 *                 enum: [FIAT, CRYPTO]
 *                 description: Type of transaction (fiat or crypto)
 *               accountNumber:
 *                 type: string
 *                 description: Required for FIAT transactions - recipient account number
 *               accountName:
 *                 type: string
 *                 description: Required for FIAT transactions - recipient account name
 *               bankName:
 *                 type: string
 *                 description: Required for FIAT transactions - recipient bank name
 *     responses:
 *       200:
 *         description: Payment preview successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentDetails:
 *                       type: object
 *                       properties:
 *                         sourceAddress:
 *                           type: string
 *                         destinationAddress:
 *                           type: string
 *                         asset:
 *                           type: object
 *                         amount:
 *                           type: string
 *                         fee:
 *                           type: string
 *                         totalDebit:
 *                           type: string
 *                         availableBalance:
 *                           type: string
 *                         network:
 *                           type: string
 *                         memo:
 *                           type: string
 *                         expiration:
 *                           type: string
 *                         fiatDetails:
 *                           type: object
 *                           properties:
 *                             accountNumber:
 *                               type: string
 *                             accountName:
 *                               type: string
 *                             bankName:
 *                               type: string
 *                 status:
 *                   type: integer
 *                 success:
 *                   type: boolean
 *       400:
 *         description: Validation error (e.g., invalid address, insufficient balance)
 *       500:
 *         description: Internal server error
 */
router.post("/preview/payment", authenticate, paymentPreview);

/**
 * @swagger
 * /api/transaction/swap:
 *   post:
 *     summary: Execute an asset swap
 *     description: Swaps one asset for another on the Stellar network using path payments.
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
 *             required:
 *               - sourceAssetCode
 *               - desAssetCode
 *               - sourceAmount
 *               - slippage
 *             properties:
 *               sourceAssetCode:
 *                 type: string
 *                 description: Asset code to swap from (e.g., NATIVE, USDC)
 *                 example: 'NATIVE'
 *               desAssetCode:
 *                 type: string
 *                 description: Asset code to swap to (e.g., BTC, ETH)
 *                 example: 'BTC'
 *               sourceAmount:
 *                 type: number
 *                 description: Amount of source asset to swap
 *                 example: 1
 *               slippage:
 *                 type: number
 *                 description: Slippage tolerance percentage (0-100)
 *                 example: 2.5
 *     responses:
 *       200:
 *         description: Swap executed successfully
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
 *                       description: Transaction hash
 *                 status:
 *                   type: integer
 *                 success:
 *                   type: boolean
 *       400:
 *         description: Bad request (e.g., invalid assets, no path found)
 *       500:
 *         description: Internal server error
 */
router.post("/swap", authenticate, swap);

/**
 * @swagger
 * /api/transaction/preview/swap:
 *   post:
 *     summary: Preview an asset swap
 *     description: Previews the details of an asset swap before execution.
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
 *             required:
 *               - sourceAssetCode
 *               - desAssetCode
 *               - sourceAmount
 *               - slippage
 *             properties:
 *               sourceAssetCode:
 *                 type: string
 *                 description: Asset code to swap from (e.g., NATIVE, USDC)
 *                 example: 'NATIVE'
 *               desAssetCode:
 *                 type: string
 *                 description: Asset code to swap to (e.g., BTC, ETH)
 *                 example: 'BTC'
 *               sourceAmount:
 *                 type: number
 *                 description: Amount of source asset to swap
 *                 example: 1
 *               slippage:
 *                 type: number
 *                 description: Slippage tolerance percentage (0-100)
 *                 example: 2.5
 *     responses:
 *       200:
 *         description: Swap preview successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     swapDetails:
 *                       type: object
 *                       properties:
 *                         sourceAsset:
 *                           type: string
 *                         destinationAsset:
 *                           type: string
 *                         sourceAmount:
 *                           type: string
 *                         expectedDestinationAmount:
 *                           type: string
 *                         minimumReceived:
 *                           type: string
 *                         slippage:
 *                           type: string
 *                         fee:
 *                           type: string
 *                         network:
 *                           type: string
 *                         exchangeRate:
 *                           type: string
 *                         priceImpact:
 *                           type: string
 *                         route:
 *                           type: array
 *                           items:
 *                             type: object
 *                 status:
 *                   type: integer
 *                 success:
 *                   type: boolean
 *       400:
 *         description: Bad request (e.g., invalid assets, no path found)
 *       500:
 *         description: Internal server error
 */
router.post("/preview/swap", authenticate, swapPreview);

/**
 * @swagger
 * /api/transaction/strictSend:
 *   post:
 *     summary: Execute a strict send path payment
 *     description: |
 *       Performs a path payment where the source amount is fixed and the destination amount is variable.
 *       The sender will send exactly the specified amount of the source asset.
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
 *             required:
 *               - sourceAssetCode
 *               - assetCode
 *               - amount
 *               - desAddress
 *               - slippage
 *             properties:
 *               assetCode:
 *                 type: string
 *                 description: Asset code you're sending (e.g., "NATIVE")
 *                 example: "NATIVE"
 *               amount:
 *                 type: number
 *                 minimum: 0.0000001
 *                 description: Exact amount you're sending (must be > 0)
 *                 example: 10
 *               desAddress:
 *                 type: string
 *                 description: Recipient's Stellar address
 *                 example: "GDNJkmf8NL39W72v2jb8np1z93VjTm6g2F4Jrrp6zGz1ZGmEdJpDp3B5"
 *               slippage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 default: 1
 *                 description: Slippage tolerance percentage (0-100)
 *                 example: 2.5
 *     responses:
 *       200:
 *         description: Transaction successful
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
 *                       description: Transaction hash
 *                       example: "XQNzHgkqGRBdyDJMZqF"
 *                 status:
 *                   type: integer
 *                 success:
 *                   type: boolean
 *       400:
 *         description: |
 *           Possible errors:
 *           - Invalid destination address
 *           - Source amount must be > 0
 *           - No valid path found
 *           - Insufficient balance
 *           - Invalid confirmation token
 *       500:
 *         description: Internal server error
 */
router.post("/strictSend", authenticate, strictSend);

/**
 * @swagger
 * /api/transaction/preview/strictSend:
 *   post:
 *     summary: Preview a strict send path payment
 *     description: |
 *       Calculates the expected transaction details without executing.
 *       Returns destination amount estimate and confirmation token for actual execution.
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
 *             required:
 *               - assetCode
 *               - amount
 *               - desAddress
 *               - slippage
 *             properties:
 *               assetCode:
 *                 type: string
 *                 description: Asset code you're sending (e.g., "NATIVE")
 *                 example: "NATIVE"
 *               amount:
 *                 type: number
 *                 minimum: 0.0000001
 *                 description: Exact amount you're sending (must be > 0)
 *                 example: 10
 *               desAddress:
 *                 type: string
 *                 description: Recipient's Stellar address
 *                 example: "GDNJkmf8NL39W72v2jb8np1z93VjTm6g2F4Jrrp6zGz1ZGmEdJpDp3B5"
 *               slippage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 default: 1
 *                 description: Slippage tolerance percentage (0-100)
 *                 example: 2.5
 *     responses:
 *       200:
 *         description: Preview successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactionDetails:
 *                       type: object
 *                       properties:
 *                         sourceAsset:
 *                           type: string
 *                         destinationAsset:
 *                           type: string
 *                         sourceAmount:
 *                           type: number
 *                         estimatedDestinationAmount:
 *                           type: string
 *                         minimumDestinationAmount:
 *                           type: string
 *                         destinationAddress:
 *                           type: string
 *                         slippage:
 *                           type: string
 *                         fee:
 *                           type: string
 *                         network:
 *                           type: string
 *                 status:
 *                   type: integer
 *                 success:
 *                   type: boolean
 *       400:
 *         description: Invalid parameters or no path found
 *       500:
 *         description: Internal server error
 */
router.post("/preview/strictSend", authenticate, strictSendPreview);

/**
 * @swagger
 * /api/transaction/strictReceive:
 *   post:
 *     summary: Execute a strict receive path payment
 *     description: |
 *       Performs a path payment where the destination amount is fixed and the source amount is variable.
 *       The recipient will receive exactly the specified amount of the destination asset.
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
 *             required:
 *               - sourceAssetCode
 *               - desAssetCode
 *               - desAmount
 *               - desAddress
 *               - slippage
 *             properties:
 *               sourceAssetCode:
 *                 type: string
 *                 description: Asset code you're sending (e.g., "NGNC")
 *                 example: "NGNC"
 *               desAssetCode:
 *                 type: string
 *                 description: Asset code recipient receives (e.g., "GHSC")
 *                 example: "GHSC"
 *               desAmount:
 *                 type: number
 *                 minimum: 0.0000001
 *                 description: Exact amount recipient will receive (must be > 0)
 *                 example: 10
 *               desAddress:
 *                 type: string
 *                 description: Recipient's Stellar address
 *                 example: "GDNJkmf8NL39W72v2jb8np1z93VjTm6g2F4Jrrp6zGz1ZGmEdJpDp3B5"
 *               slippage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 default: 1
 *                 description: Slippage tolerance percentage (0-100)
 *                 example: 2.5
 *     responses:
 *       200:
 *         description: Transaction successful
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
 *                       description: Transaction hash
 *                       example: "XQNzHgkqGRBdyDJMZqF"
 *                 status:
 *                   type: integer
 *                 success:
 *                   type: boolean
 *       400:
 *         description: |
 *           Possible errors:
 *           - Invalid destination address
 *           - Destination amount must be > 0
 *           - No valid path found
 *           - Insufficient balance
 *           - Invalid confirmation token
 *       500:
 *         description: Internal server error
 */
router.post("/strictReceive", authenticate, strictReceive);

/**
 * @swagger
 * /api/transaction/preview/strictReceive:
 *   post:
 *     summary: Preview a strict receive path payment
 *     description: |
 *       Calculates the expected transaction details without executing.
 *       Returns source amount estimate and confirmation token for actual execution.
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
 *             required:
 *               - sourceAssetCode
 *               - desAssetCode
 *               - desAmount
 *               - desAddress
 *               - slippage
 *             properties:
 *               sourceAssetCode:
 *                 type: string
 *                 description: Asset code you're sending (e.g., "NGNC")
 *                 example: "NGNC"
 *               desAssetCode:
 *                 type: string
 *                 description: Asset code recipient receives (e.g., "GHSC")
 *                 example: "GHSC"
 *               desAmount:
 *                 type: number
 *                 minimum: 0.0000001
 *                 description: Exact amount recipient will receive (must be > 0)
 *                 example: 10
 *               desAddress:
 *                 type: string
 *                 description: Recipient's Stellar address
 *                 example: "GDNJkmf8NL39W72v2jb8np1z93VjTm6g2F4Jrrp6zGz1ZGmEdJpDp3B5"
 *               slippage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 default: 1
 *                 description: Slippage tolerance percentage (0-100)
 *                 example: 2.5
 *     responses:
 *       200:
 *         description: Preview successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactionDetails:
 *                       type: object
 *                       properties:
 *                         sourceAsset:
 *                           type: string
 *                         destinationAsset:
 *                           type: string
 *                         sourceAmount:
 *                           type: number
 *                         destinationAmount:
 *                           type: number
 *                         destinationAddress:
 *                           type: string
 *                         slippage:
 *                           type: string
 *                         estimatedSendMax:
 *                           type: string
 *                         fee:
 *                           type: string
 *                         network:
 *                           type: string
 *                 status:
 *                   type: integer
 *                 success:
 *                   type: boolean
 *       400:
 *         description: Invalid parameters or no path found
 *       500:
 *         description: Internal server error
 */
router.post("/preview/strictReceive", authenticate, strictReceivePreview);

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
 *         description: Fiat transaction history retrieved successfully
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
 *       400:
 *         description: Bad request (e.g., invalid pagination parameters)
 *       500:
 *         description: Internal server error
 */
router.get("/fiat-all", authenticate, getFiatTransactions);

/**
 * @swagger
 * /api/transaction/crypto-all:
 *   get:
 *     summary: Get paginated crypto transaction history
 *     description: Retrieves crypto transaction history from the Stellar network for the authenticated user with pagination support.
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *           default: 10
 *         description: Number of transactions to return per page (max 200)
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Pagination cursor from the previous response
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order (asc for oldest first, desc for newest first)
 *     responses:
 *       200:
 *         description: Crypto transaction history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/StellarTransaction'
 *                     operations:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/StellarOperation'
 *                     paging:
 *                       $ref: '#/components/schemas/PaginationInfo'
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Bad request (e.g., invalid parameters)
 *       404:
 *         description: Invalid Credentials or not activated
 *       500:
 *         description: Internal server error
 */
router.get("/crypto-all", authenticate, getTransactions);

/**
 * @swagger
 * components:
 *   schemas:
 *     StellarTransaction:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         memo:
 *           type: string
 *         memo_type:
 *           type: string
 *         operation_count:
 *           type: integer
 *         successful:
 *           type: boolean
 *         paging_token:
 *           type: string
 *         source_account:
 *           type: string
 *         fee_paid:
 *           type: integer
 *         ledger:
 *           type: integer
 *
 *     StellarOperation:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         type:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         transaction_hash:
 *           type: string
 *         source_account:
 *           type: string
 *         asset_type:
 *           type: string
 *         asset_code:
 *           type: string
 *         asset_issuer:
 *           type: string
 *         amount:
 *           type: string
 *
 *     PaginationInfo:
 *       type: object
 *       properties:
 *         next:
 *           type: string
 *           nullable: true
 *           description: Cursor for next page
 *         prev:
 *           type: string
 *           nullable: true
 *           description: Cursor for previous page
 *         count:
 *           type: integer
 *           description: Number of items in current page
 *         cursor:
 *           type: string
 *           nullable: true
 *           description: Last paging token in current page
 */
router.get("/crypto-all", authenticate, getTransactions);

export default router;
