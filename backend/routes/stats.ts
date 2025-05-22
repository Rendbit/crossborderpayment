import { Router } from "express";
import { moderateLimiter } from "../middlewares/rateLimiter";
import {
  getStats
} from "../controllers/stats";
const router = Router();

// router.use(moderateLimiter);

/**
 * @swagger
 * tags:
 *   - name: Stats
 *     description: Endpoints related to platform statistics
 */

/**
 * @swagger
 * /all:
 *   get:
 *     summary: Retrieve platform statistics
 *     tags:
 *       - Stats
 *     description: Returns aggregated statistics related to the platform.
 *     responses:
 *       200:
 *         description: Successfully retrieved statistics.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 // Define properties returned by getStats here
 *       500:
 *         description: Internal server error.
 */
router.get("/all", getStats);


export default router;
