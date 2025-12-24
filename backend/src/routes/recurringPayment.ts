import { Router } from "express";
import {
  createRecurringPayment,
  getRecurringPayment,
  listRecurringPayments,
  cancelRecurringPayment,
  editRecurringPayment,
  getProcessingStats,
  processRecurringPayment,
} from "../controllers/recurringPayment";
import { authenticate } from "../middlewares/authMiddleWare";
import { moderateLimiter } from "../middlewares/rateLimiter";

const router = Router();
router.use(moderateLimiter);

/**
 * @swagger
 * tags:
 *   - name: RecurringPayment
 *     description: Recurring Payment endpoints for setting up automated payments with custom scheduling
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
 *             required:
 *               - amount
 *               - toUser
 *               - frequency
 *               - startDate
 *               - pinCode
 *             properties:
 *               amount:
 *                 type: string
 *                 example: "25.50"
 *                 description: Amount as a string with up to 2 decimal places
 *               currency:
 *                 type: string
 *                 example: "XLM"
 *                 default: "XLM"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               toUser:
 *                 type: string
 *                 example: "GABCD123..."
 *               paymentMethod:
 *                 type: string
 *                 enum: [crypto, fiat, both]
 *                 default: both
 *               frequency:
 *                 type: string
 *                 enum:
 *                   - hourly
 *                   - daily
 *                   - weekly
 *                   - bi_weekly
 *                   - monthly
 *                   - quarterly
 *                   - yearly
 *                   - custom
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-12-16T09:00:00Z"
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-01-16T09:00:00Z"
 *               pinCode:
 *                 type: string
 *                 pattern: "^[0-9]{4}$"
 *                 example: "1234"
 *               metadata:
 *                 type: object
 *                 properties:
 *                   scheduleTimes:
 *                     type: array
 *                     items:
 *                       type: string
 *                       pattern: "^(\\d{1,2}):([0-5][0-9])\\s*(AM|PM)$"
 *                       example: "9:00 AM"
 *                   hourlyInterval:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 24
 *                   specificHours:
 *                     type: array
 *                     items:
 *                       type: string
 *                       pattern: "^(\\d{1,2}):([0-5][0-9])\\s*(AM|PM)$"
 *                       example: "12:00 PM"
 *                   customDatetimes:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         date:
 *                           type: string
 *                           format: date
 *                           example: "2025-12-17"
 *                         time:
 *                           type: string
 *                           pattern: "^(\\d{1,2}):([0-5][0-9])\\s*(AM|PM)$"
 *                           example: "2:30 PM"
 *                   scheduleWindow:
 *                     type: object
 *                     properties:
 *                       startHour:
 *                         type: integer
 *                         minimum: 0
 *                         maximum: 23
 *                         default: 0
 *                       endHour:
 *                         type: integer
 *                         minimum: 0
 *                         maximum: 23
 *                         default: 23
 *                       timezone:
 *                         type: string
 *                         default: "UTC"
 *                   timezone:
 *                     type: string
 *                     default: "UTC"
 *                   skipWeekends:
 *                     type: boolean
 *                     default: false
 *                   excludedDays:
 *                     type: array
 *                     items:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 6
 *                   excludedHours:
 *                     type: array
 *                     items:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 23
 *                   excludedDates:
 *                     type: array
 *                     items:
 *                       type: string
 *                       format: date
 *                   pauseEnabled:
 *                     type: boolean
 *                     default: false
 *                   pauseStartDate:
 *                     type: string
 *                     format: date-time
 *                   pauseEndDate:
 *                     type: string
 *                     format: date-time
 *                   pauseReason:
 *                     type: string
 *                     maxLength: 500
 *     responses:
 *       201:
 *         description: Recurring payment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     recurringPayment:
 *                       type: object
 *                       properties:
 *                         scheduleId:
 *                           type: string
 *                         metadata:
 *                           type: object
 *                           properties:
 *                             scheduleTimes:
 *                               type: array
 *                               items:
 *                                 type: string
 *                             warnings:
 *                               type: array
 *                               items:
 *                                 type: string
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post("/create", authenticate, createRecurringPayment);

/**
 * @swagger
 * /api/recurringPayment/edit:
 *   put:
 *     summary: Edit an existing recurring payment
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
 *             required: [scheduleId, pinCode]
 *             properties:
 *               scheduleId:
 *                 type: string
 *               amount:
 *                 type: string
 *                 example: "100.00"
 *               currency:
 *                 type: string
 *               description:
 *                 type: string
 *               frequency:
 *                 type: string
 *                 enum:
 *                   - hourly
 *                   - daily
 *                   - weekly
 *                   - bi_weekly
 *                   - monthly
 *                   - quarterly
 *                   - yearly
 *                   - custom
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               metadata:
 *                 type: object
 *                 properties:
 *                   # 12-hour format fields can be updated here
 *                   scheduleTimes:
 *                     type: array
 *                     items:
 *                       type: string
 *                       pattern: "^(\d{1,2}):([0-5][0-9])\s*(AM|PM)$"
 *                       example: "9:00 AM"
 *                   specificHours:
 *                     type: array
 *                     items:
 *                       type: string
 *                       pattern: "^(\d{1,2}):([0-5][0-9])\s*(AM|PM)$"
 *                       example: "12:00 PM"
 *                   customDatetimes:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         date:
 *                           type: string
 *                           format: date
 *                         time:
 *                           type: string
 *                           pattern: "^(\d{1,2}):([0-5][0-9])\s*(AM|PM)$"
 *                   timezone:
 *                     type: string
 *                     default: UTC
 *                   # Other metadata fields...
 *               pinCode:
 *                 type: string
 *                 pattern: "^[0-9]{4}$"
 *     responses:
 *       200:
 *         description: Recurring payment updated successfully
 *       400:
 *         description: Bad request - validation errors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Times will be automatically sorted to: 9:00 AM, 2:30 PM"
 */
router.put("/edit", authenticate, editRecurringPayment);

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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     recurringPayment:
 *                       type: object
 *                       properties:
 *                         scheduleId:
 *                           type: string
 *                         amount:
 *                           type: number
 *                         currency:
 *                           type: string
 *                         frequency:
 *                           type: string
 *                         nextPaymentDate:
 *                           type: string
 *                           format: date-time
 *                         metadata:
 *                           type: object
 *                           properties:
 *                             # FRONTEND DISPLAY - Always 12-hour format
 *                             scheduleTimes:
 *                               type: array
 *                               items:
 *                                 type: string
 *                               description: Times in 12-hour format for display
 *                               example: ["9:00 AM", "2:30 PM"]
 *                             specificHours:
 *                               type: array
 *                               items:
 *                                 type: string
 *                               description: Hours in 12-hour format for display
 *                               example: ["9:00 AM", "6:00 PM"]
 *                             customDatetimes:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   date:
 *                                     type: string
 *                                     format: date
 *                                   time12h:
 *                                     type: string
 *                               description: Custom datetimes with 12-hour time for display
 *                               example: [{"date": "2025-12-17", "time12h": "2:30 PM"}]
 *                             timezone:
 *                               type: string
 *                               example: "America/New_York"
 *                             isCurrentlyPaused:
 *                               type: boolean
 *                               description: Indicates if payment is currently paused
 *                             pauseReason:
 *                               type: string
 *                               description: Reason for pause if applicable
 *       404:
 *         description: Recurring payment not found
 */
router.get("/get", authenticate, getRecurringPayment);

/**
 * @swagger
 * /api/recurringPayment/list:
 *   get:
 *     summary: List recurring payments
 *     tags: [RecurringPayment]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *           default: "1"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *           default: "10"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, paused, cancelled, completed]
 *       - in: query
 *         name: direction
 *         schema:
 *           type: string
 *           enum: [sent, received, all]
 *           default: all
 *     responses:
 *       200:
 *         description: Recurring payments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     recurringPayments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           scheduleId:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           currency:
 *                             type: string
 *                           frequency:
 *                             type: string
 *                           status:
 *                             type: string
 *                           nextPaymentDate:
 *                             type: string
 *                             format: date-time
 *                           metadata:
 *                             type: object
 *                             properties:
 *                               scheduleTimes:
 *                                 type: array
 *                                 items:
 *                                   type: string
 *                                 example: ["9:00 AM", "2:30 PM"]
 *                               isCurrentlyPaused:
 *                                 type: boolean
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: number
 *                         limit:
 *                           type: number
 *                         total:
 *                           type: number
 *                         totalPages:
 *                           type: number
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
 *               reason:
 *                 type: string
 *                 maxLength: 200
 *               pinCode:
 *                 type: string
 *                 pattern: "^[0-9]{4}$"
 *     responses:
 *       200:
 *         description: Recurring payment cancelled successfully
 *       403:
 *         description: Receiver can only cancel during an active pause period
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Receiver can only cancel during an active pause period"
 */
router.post("/cancel", authenticate, cancelRecurringPayment);

/**
 * @swagger
 * /api/recurringPayment/process:
 *   get:
 *     summary: Process recurring payments (System/Admin only)
 *     tags: [RecurringPayment]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     parameters:
 *       - in: query
 *         name: scheduleId
 *         schema:
 *           type: string
 *         description: Specific schedule ID to process (optional for system users)
 *     responses:
 *       200:
 *         description: Payments processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     processed:
 *                       type: number
 *                     paused:
 *                       type: number
 *                     failed:
 *                       type: number
 *                     details:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           scheduleId:
 *                             type: string
 *                           success:
 *                             type: boolean
 *                           status:
 *                             type: string
 *                             enum: [processed, paused, skipped_due_to_window, skipped_due_to_exclusion]
 *       403:
 *         description: Only system users can process all payments
 */
router.get("/process", authenticate, processRecurringPayment);

/**
 * @swagger
 * /api/recurringPayment/stats:
 *   get:
 *     summary: Get processing statistics (System/Admin only)
 *     tags: [RecurringPayment]
 *     security:
 *       - bearerAuth: []
 *       - apiKey: []
 *     responses:
 *       200:
 *         description: Processing statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     dueCount:
 *                       type: number
 *                       description: Number of payments due for processing
 *                     pausedCount:
 *                       type: number
 *                       description: Number of paused payments
 *                     retryCount:
 *                       type: number
 *                       description: Number of payments in retry queue
 *                     nextDueDate:
 *                       type: string
 *                       format: date-time
 *                       description: Next payment due date
 *                     lastProcessedDate:
 *                       type: string
 *                       format: date-time
 *                       description: Last payment processing date
 *                     activeUsersCount:
 *                       type: number
 *                       description: Number of active users with recurring payments
 */
router.get("/stats", authenticate, getProcessingStats);

export default router;
