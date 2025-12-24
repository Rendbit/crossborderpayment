import { Router } from "express";
import {
  createPaymentRequest,
  getPaymentRequest,
  listPaymentRequests,
  processPaymentRequest,
  cancelPaymentRequest,
  editPaymentRequest,
  generatePaymentQRCode,
  validatePaymentLink,
} from "../controllers/paymentRequest";
import { authenticate } from "../middlewares/authMiddleWare";
import { moderateLimiter } from "../middlewares/rateLimiter";

const router = Router();
router.use(moderateLimiter);

/**
 * @swagger
 * tags:
 *   - name: PaymentRequest
 *     description: Payment Request endpoints for requesting and processing payments
 */

/**
 * @swagger
 * /api/paymentRequest/create:
 *   post:
 *     summary: Create a new payment request
 *     tags: [PaymentRequest]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, currency, toUser, paymentMethod, expiresIn]
 *             properties:
 *               amount:
 *                 type: string
 *                 description: Payment amount
 *               currency:
 *                 type: string
 *                 description: Currency code (e.g., NGN, GHS, KES, XLM)
 *               toUser:
 *                 type: string
 *                 description: Recipient's email, username, or Stellar public key
 *               paymentMethod:
 *                 type: string
 *                 enum: [crypto, fiat, both]
 *                 description: Payment method preference
 *               expiresIn:
 *                 type: number
 *                 description: Days until request expires (1-30)
 *               description:
 *                 type: string
 *                 description: Optional payment description
 *               metadata:
 *                 type: object
 *                 required: true
 *                 properties:
 *                   invoiceNumber:
 *                     type: string
 *                     required: true
 *                     description: Invoice number for the payment request
 *                   invoiceDateAndTime:
 *                     type: string
 *                     format: date-time
 *                     required: true
 *                     description: Date and time when invoice was created
 *     responses:
 *       201:
 *         description: Payment request created successfully
 */
router.post("/create", authenticate, createPaymentRequest);

/**
 * @swagger
 * /api/paymentRequest/edit:
 *   put:
 *     summary: Edit an existing payment request
 *     tags: [PaymentRequest]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [requestId]
 *             properties:
 *               requestId:
 *                 type: string
 *                 description: Payment request ID
 *               amount:
 *                 type: string
 *                 description: New payment amount (optional)
 *               currency:
 *                 type: string
 *                 description: New currency code (optional)
 *               description:
 *                 type: string
 *                 description: New payment description (optional)
 *               expiresIn:
 *                 type: number
 *                 description: New days until request expires (1-30) (optional)
 *               metadata:
 *                 type: object
 *                 properties:
 *                   invoiceNumber:
 *                     type: string
 *                     description: New invoice number (optional)
 *                   invoiceDateAndTime:
 *                     type: string
 *                     format: date-time
 *                     description: New invoice date and time (optional)
 *     responses:
 *       200:
 *         description: Payment request updated successfully
 */
router.put("/edit", authenticate, editPaymentRequest);

/**
 * @swagger
 * /api/paymentRequest/get:
 *   get:
 *     summary: Get a specific payment request
 *     tags: [PaymentRequest]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     parameters:
 *       - in: query
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment request ID
 *     responses:
 *       200:
 *         description: Payment request retrieved successfully
 */
router.get("/get", authenticate, getPaymentRequest);

/**
 * @swagger
 * /api/paymentRequest/list:
 *   get:
 *     summary: List payment requests (sent/received)
 *     tags: [PaymentRequest]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, cancelled, expired]
 *         description: Filter by status
 *       - in: query
 *         name: direction
 *         schema:
 *           type: string
 *           enum: [sent, received, all]
 *           default: all
 *         description: Filter by direction (sent or received)
 *     responses:
 *       200:
 *         description: Payment requests retrieved successfully
 */
router.get("/list", authenticate, listPaymentRequests);

/**
 * @swagger
 * /api/paymentRequest/process:
 *   post:
 *     summary: Process (pay) a payment request
 *     tags: [PaymentRequest]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [requestId, paymentMethod, pinCode]
 *             properties:
 *               requestId:
 *                 type: string
 *                 description: Payment request ID
 *               paymentMethod:
 *                 type: string
 *                 enum: [crypto, fiat]
 *                 description: Payment method to use
 *               pinCode:
 *                 type: string
 *                 description: User's PIN code for verification
 *               transactionDetails:
 *                 type: string
 *                 description: Optional transaction details
 *     responses:
 *       200:
 *         description: Payment processed successfully
 */
router.post("/process", authenticate, processPaymentRequest);

/**
 * @swagger
 * /api/paymentRequest/cancel:
 *   post:
 *     summary: Cancel a payment request
 *     tags: [PaymentRequest]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [requestId]
 *             properties:
 *               requestId:
 *                 type: string
 *                 description: Payment request ID
 *               reason:
 *                 type: string
 *                 description: Optional cancellation reason
 *     responses:
 *       200:
 *         description: Payment request cancelled successfully
 */
router.post("/cancel", authenticate, cancelPaymentRequest);

/**
 * @swagger
 * /api/paymentRequest/generate-qr:
 *   post:
 *     summary: Generate QR code for payment request
 *     tags: [PaymentRequest]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [requestId]
 *             properties:
 *               requestId:
 *                 type: string
 *                 description: Payment request ID
 *               size:
 *                 type: integer
 *                 default: 300
 *                 description: QR code size in pixels
 *     responses:
 *       200:
 *         description: QR code generated successfully
 */
router.post("/generate-qr", authenticate, generatePaymentQRCode);

/**
 * @swagger
 * /api/paymentRequest/validate-link:
 *   post:
 *     summary: Validate a payment link
 *     tags: [PaymentRequest]
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [linkId]
 *             properties:
 *               linkId:
 *                 type: string
 *                 description: Payment link ID from the URL
 *     responses:
 *       200:
 *         description: Payment link validated successfully
 */
router.post("/validate-link", validatePaymentLink);

export default router;
