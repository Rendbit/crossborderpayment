import { Router } from "express";
import {
  createRecurringPayment,
  getRecurringPayment,
  listRecurringPayments,
  cancelRecurringPayment,
} from "../controllers/recurringPayment";
import { authenticate } from "../middlewares/authMiddleWare";
import { moderateLimiter } from "../middlewares/rateLimiter";

const router = Router();
router.use(moderateLimiter);

/**
 * @swagger
 * tags:
 *   - name: RecurringPayment
 *     description: Recurring Payment endpoints for setting up automated payments
 */

/**
 * @swagger
 * /api/recurringPayment/create:
 *   post:
 *     summary: Create a new recurring payment
 *     tags: [RecurringPayment]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, currency, toUser, paymentMethod, frequency, startDate, pinCode]
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Payment amount
 *               currency:
 *                 type: string
 *                 description: Currency code (e.g., USD, XLM, EUR)
 *               toUser:
 *                 type: string
 *                 description: Recipient's email, username, or Stellar public key
 *               paymentMethod:
 *                 type: string
 *                 enum: [crypto, fiat, both]
 *                 description: Payment method preference
 *               frequency:
 *                 type: string
 *                 enum: [daily, weekly, bi_weekly, monthly, quarterly, yearly]
 *                 description: Payment frequency
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Start date for recurring payments
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: Optional end date for recurring payments
 *               description:
 *                 type: string
 *                 description: Optional payment description
 *               pinCode:
 *                 type: string
 *                 description: User's PIN code for verification
 *               metadata:
 *                 type: object
 *                 description: Additional metadata
 *     responses:
 *       201:
 *         description: Recurring payment created successfully
 */
router.post("/create", authenticate, createRecurringPayment);

/**
 * @swagger
 * /api/recurringPayment/get:
 *   get:
 *     summary: Get a specific recurring payment
 *     tags: [RecurringPayment]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     parameters:
 *       - in: query
 *         name: scheduleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Recurring payment schedule ID
 *     responses:
 *       200:
 *         description: Recurring payment retrieved successfully
 */
router.get("/get", authenticate, getRecurringPayment);

/**
 * @swagger
 * /api/recurringPayment/list:
 *   get:
 *     summary: List recurring payments (sent/received)
 *     tags: [RecurringPayment]
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
 *           enum: [active, paused, cancelled, completed]
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
 *         description: Recurring payments retrieved successfully
 */
router.get("/list", authenticate, listRecurringPayments);

/**
 * @swagger
 * /api/recurringPayment/cancel:
 *   post:
 *     summary: Cancel a recurring payment
 *     tags: [RecurringPayment]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [scheduleId]
 *             properties:
 *               scheduleId:
 *                 type: string
 *                 description: Recurring payment schedule ID
 *               reason:
 *                 type: string
 *                 description: Optional cancellation reason
 *     responses:
 *       200:
 *         description: Recurring payment cancelled successfully
 */
router.post("/cancel", authenticate, cancelRecurringPayment);

export default router;
