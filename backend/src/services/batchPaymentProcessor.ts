import mongoose from "mongoose";
import { RecurringPayment } from "../models/RecurringPayment";
import { User } from "../models/User";
import { PinHelper } from "../helpers/pin.helper";
import { BlockchainFactory } from "../providers/blockchainFactory";
import { logSecurityEvent } from "../utils/security";
import { emitEvent } from "../microservices/rabbitmq";
import { nanoid } from "nanoid";
import { RecurringFrequency } from "./recurringPayment";

export interface PaymentProcessingResult {
  scheduleId: string;
  success: boolean;
  error?: string;
  txHash?: string;
  paymentRef?: string;
  userId?: string;
  amount?: number;
  currency?: string;
  status?: string;
}

export interface BatchProcessingStats {
  processed: number;
  failed: number;
  retried: number;
  skipped: number;
  paused: number;
  totalTime: number;
  details: PaymentProcessingResult[];
}

export class BatchPaymentProcessor {
  private readonly BATCH_SIZE = 50;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MINUTES = [5, 15, 60];

  async processDuePayments(): Promise<BatchProcessingStats> {
    const startTime = Date.now();
    const stats: BatchProcessingStats = {
      processed: 0,
      failed: 0,
      retried: 0,
      skipped: 0,
      paused: 0,
      totalTime: 0,
      details: [],
    };

    try {
      console.log("Starting batch payment processing...");
      console.log("Current time:", new Date().toISOString());

      const duePayments = await this.getDuePayments();

      if (duePayments.length === 0) {
        stats.totalTime = Date.now() - startTime;
        return stats;
      }

      // console.log(`Found ${duePayments.length} due payments`);

      for (const payment of duePayments) {
        try {
          const pauseCheck = await this.checkPauseStatus(payment);

          if (pauseCheck.isPaused) {
            stats.paused++;
            stats.details.push({
              scheduleId: payment.scheduleId,
              success: false,
              error: `Payment paused: ${pauseCheck.reason}`,
              status: "paused",
              userId: payment.fromUser?._id?.toString(),
              amount: payment.amount,
              currency: payment.currency,
            });
            console.log(
              `Payment ${payment.scheduleId} is paused: ${pauseCheck.reason}`
            );
            continue;
          }

          const result = await this.processPayment(payment);
          stats.details.push(result);

          if (result.success) {
            stats.processed++;
            console.log(`Processed payment ${payment.scheduleId}`);
          } else {
            const shouldRetry = await this.handleProcessingFailure(
              payment,
              result.error || "Unknown error"
            );

            if (shouldRetry) {
              stats.retried++;
              console.log(`Scheduled retry for ${payment.scheduleId}`);
            } else {
              stats.failed++;
              console.log(
                `Failed payment ${payment.scheduleId}: ${result.error}`
              );
            }
          }
        } catch (error: any) {
          console.error(`Error processing ${payment.scheduleId}:`, error);
          stats.failed++;
          stats.details.push({
            scheduleId: payment.scheduleId,
            success: false,
            error: error.message,
            userId: payment.fromUser?._id?.toString(),
            amount: payment.amount,
            currency: payment.currency,
          });
        }
      }

      stats.totalTime = Date.now() - startTime;
      console.log(`Batch processing completed in ${stats.totalTime}ms`);
      console.log(`   Processed: ${stats.processed}`);
      console.log(`   Paused: ${stats.paused}`);
      console.log(`   Retried: ${stats.retried}`);
      console.log(`   Failed: ${stats.failed}`);

      if (stats.processed > 0 || stats.failed > 0 || stats.paused > 0) {
        logSecurityEvent(
          "batch_payments_processed",
          "system",
          {
            processed: stats.processed,
            paused: stats.paused,
            failed: stats.failed,
            retried: stats.retried,
            totalTime: stats.totalTime,
            batchSize: duePayments.length,
          },
          "low"
        );
      }

      return stats;
    } catch (error: any) {
      console.error("Error in batch payment processing:", error);
      stats.totalTime = Date.now() - startTime;

      logSecurityEvent(
        "batch_payment_processing_error",
        "system",
        {
          error: error.message,
          totalTime: stats.totalTime,
        },
        "high"
      );

      return stats;
    }
  }

  private async getDuePayments(): Promise<any[]> {
    const now = new Date();

    console.log("Looking for due payments...");
    console.log("Now (UTC):", now.toISOString());
    console.log("Now (local):", now.toString());

    const payments = await RecurringPayment.find({
      status: "active",
      pinVerified: true,
      nextPaymentDate: { $lte: now },
      $or: [
        { "metadata.retryAt": { $exists: false } },
        { "metadata.retryAt": { $lte: now } },
      ],
    })
      .populate("fromUser", "_id username stellarPublicKey primaryEmail")
      .populate("toUser", "_id username stellarPublicKey primaryEmail")
      .sort({ nextPaymentDate: 1 })
      .limit(this.BATCH_SIZE)
      .lean();

    payments.forEach((payment: any) => {
      console.log(`Payment ${payment.scheduleId}:`);
      console.log(`  Next payment date: ${payment.nextPaymentDate}`);
      console.log(`  Frequency: ${payment.frequency}`);
      console.log(
        `  Custom times: ${JSON.stringify(payment.metadata?.customTimes)}`
      );
      console.log(
        `  Now is after nextPaymentDate: ${
          now >= new Date(payment.nextPaymentDate)
        }`
      );
    });

    return payments;
  }

  private async checkPauseStatus(
    payment: any
  ): Promise<{ isPaused: boolean; reason?: string }> {
    if (payment.status === "paused") {
      return { isPaused: true, reason: "Payment status is paused" };
    }

    if (payment.metadata?.pauseEnabled) {
      const now = new Date();
      const pauseStart = payment.metadata.pauseStartDate
        ? new Date(payment.metadata.pauseStartDate)
        : null;
      const pauseEnd = payment.metadata.pauseEndDate
        ? new Date(payment.metadata.pauseEndDate)
        : null;

      if (pauseStart && pauseEnd && now >= pauseStart && now <= pauseEnd) {
        return {
          isPaused: true,
          reason:
            payment.metadata.pauseReason ||
            `Paused from ${pauseStart.toISOString()} to ${pauseEnd.toISOString()}`,
        };
      }

      if (pauseEnd && now > pauseEnd) {
        await RecurringPayment.updateOne(
          { _id: payment._id },
          {
            $set: {
              "metadata.pauseEnabled": false,
              "metadata.pauseStartDate": null,
              "metadata.pauseEndDate": null,
              "metadata.pauseReason": null,
            },
          }
        );
      }
    }

    return { isPaused: false };
  }

  private async processPayment(payment: any): Promise<PaymentProcessingResult> {
    const session = await mongoose.startSession();
    let result: PaymentProcessingResult = {
      scheduleId: payment.scheduleId,
      success: false,
      userId: payment.fromUser?._id?.toString(),
      amount: payment.amount,
      currency: payment.currency,
    };

    try {
      session.startTransaction();

      const currentPayment = await RecurringPayment.findOne({
        _id: payment._id,
        status: "active",
      }).session(session);

      if (!currentPayment) {
        throw new Error("Payment not found or not active");
      }

      const pauseCheck = await this.checkPauseStatus(currentPayment.toObject());
      if (pauseCheck.isPaused) {
        await session.abortTransaction();
        return {
          scheduleId: payment.scheduleId,
          success: false,
          error: pauseCheck.reason,
          status: "paused",
          userId: payment.fromUser?._id?.toString(),
          amount: payment.amount,
          currency: payment.currency,
        };
      }

      const senderUser = await User.findById(payment.fromUser._id)
        .select("+encryptedPrivateKey +pinCode")
        .session(session);

      if (!senderUser) {
        throw new Error("Sender user not found");
      }

      const pinResult = await PinHelper.getDecryptedPrivateKey(
        senderUser.toObject()
      );

      if (!pinResult.success) {
        throw new Error(pinResult.error || "PIN verification failed");
      }

      const paymentResult = await this.executePayment(
        payment,
        senderUser,
        pinResult.decryptedPrivateKey!,
        session
      );

      const nextPaymentDate = this.calculateNextPaymentDate(
        new Date(),
        payment.frequency as RecurringFrequency,
        payment.metadata
      );

      console.log(
        `Calculated next payment date for ${payment.scheduleId}:`,
        nextPaymentDate
      );

      const updateData: any = {
        lastProcessedAt: new Date(),
        nextPaymentDate,
        $inc: { "metadata.totalProcessedCount": 1 },
        $set: {
          "metadata.lastProcessedDate": new Date(),
          "metadata.lastProcessedAmount": payment.amount,
          "metadata.lastProcessedCurrency": payment.currency,
          processingAttempts: 0,
          lastProcessingError: null,
        },
        $push: {} as any,
      };

      if (paymentResult.blockchainTxHash) {
        updateData.$push.blockchainTxHashes = paymentResult.blockchainTxHash;
        updateData.$set["metadata.lastBlockchainTxHash"] =
          paymentResult.blockchainTxHash;
      }
      if (paymentResult.fiatPaymentRef) {
        updateData.$push.fiatPaymentRefs = paymentResult.fiatPaymentRef;
        updateData.$set["metadata.lastFiatPaymentRef"] =
          paymentResult.fiatPaymentRef;
      }

      if (payment.metadata?.retryAt) {
        updateData.$unset = {
          "metadata.retryAt": "",
          "metadata.retryAttempts": "",
          "metadata.lastError": "",
        };
      }

      if (payment.endDate && nextPaymentDate > new Date(payment.endDate)) {
        updateData.status = "completed";
      }

      await RecurringPayment.updateOne({ _id: payment._id }, updateData, {
        session,
      });

      await session.commitTransaction();

      result.success = true;
      result.txHash = paymentResult.blockchainTxHash;
      result.paymentRef = paymentResult.fiatPaymentRef;

      await this.emitPaymentEvents(payment, paymentResult, nextPaymentDate);
    } catch (error: any) {
      await session.abortTransaction();
      result.error = error.message;
      console.error(
        `Payment processing failed for ${payment.scheduleId}:`,
        error
      );
    } finally {
      session.endSession();
    }

    return result;
  }

  private async executePayment(
    payment: any,
    senderUser: any,
    privateKey: string,
    session: mongoose.ClientSession
  ): Promise<{ blockchainTxHash?: string; fiatPaymentRef?: string }> {
    if (payment.paymentMethod !== "fiat") {
      const blockchain = BlockchainFactory.getTransactionProvider("stellar");

      const paymentParams: any = {
        user: {
          ...senderUser.toObject(),
          privateKey: privateKey,
        },
        assetCode: payment.currency === "XLM" ? "NATIVE" : payment.currency,
        address: payment.toUser.stellarPublicKey,
        amount: payment.amount.toString(),
        transactionDetails: payment,
        pinCode: senderUser.toObject().pinCode,
      };

      const paymentResult = await blockchain.payment(paymentParams);

      return {
        blockchainTxHash: paymentResult.data.hash,
      };
    } else {
      const fiatPaymentRef = `fiat_${nanoid(16)}`;
      console.log(
        `Processing fiat payment: ${payment.amount} ${payment.currency}`
      );

      return {
        fiatPaymentRef,
      };
    }
  }

  private async handleProcessingFailure(
    payment: any,
    error: string
  ): Promise<boolean> {
    const currentAttempts = payment.processingAttempts || 0;

    if (currentAttempts >= this.MAX_RETRY_ATTEMPTS) {
      await RecurringPayment.updateOne(
        { _id: payment._id },
        {
          status: "paused",
          lastProcessingError: error,
          processingAttempts: currentAttempts + 1,
          $inc: { "metadata.failedCount": 1 },
          $set: {
            "metadata.lastFailedAttempt": new Date(),
            "metadata.failureReason": error,
          },
        }
      );

      await emitEvent("recurring:payment:failed", {
        scheduleId: payment.scheduleId,
        fromUser: payment.fromUser._id,
        toUser: payment.toUser._id,
        amount: payment.amount,
        currency: payment.currency,
        error,
        attempts: currentAttempts + 1,
      }).catch((err) => console.error("Error emitting failure event:", err));

      return false;
    }

    const retryDelay = this.RETRY_DELAY_MINUTES[currentAttempts] || 60;
    const retryAt = new Date(Date.now() + retryDelay * 60000);

    await RecurringPayment.updateOne(
      { _id: payment._id },
      {
        $inc: { processingAttempts: 1 },
        $set: {
          lastProcessingError: error,
          nextPaymentDate: retryAt,
          "metadata.retryAt": retryAt,
          "metadata.retryAttempts": (payment.metadata?.retryAttempts || 0) + 1,
          "metadata.lastError": error,
        },
      }
    );

    return true;
  }

  private async emitPaymentEvents(
    payment: any,
    paymentResult: { blockchainTxHash?: string; fiatPaymentRef?: string },
    nextPaymentDate: Date
  ): Promise<void> {
    const events = [];

    events.push(
      emitEvent("recurring:payment:processed", {
        scheduleId: payment.scheduleId,
        fromUser: payment.fromUser._id,
        toUser: payment.toUser._id,
        amount: payment.amount,
        currency: payment.currency,
        blockchainTxHash: paymentResult.blockchainTxHash,
        fiatPaymentRef: paymentResult.fiatPaymentRef,
        nextPaymentDate,
      }).catch((err) =>
        console.error("Error emitting payment processed event:", err)
      )
    );

    events.push(
      emitEvent("send:notification", {
        userId: payment.toUser._id,
        type: "recurring_payment_received",
        title: "Recurring Payment Received",
        message: `You have received ${payment.amount} ${payment.currency} from ${payment.fromUser.username}`,
        data: {
          scheduleId: payment.scheduleId,
          amount: payment.amount,
          currency: payment.currency,
          fromUser: payment.fromUser.username,
          txHash: paymentResult.blockchainTxHash,
          paymentRef: paymentResult.fiatPaymentRef,
        },
      }).catch((err) =>
        console.error("Error emitting notification event:", err)
      )
    );

    await Promise.all(events);
  }

  calculateNextPaymentDate(
    baseDate: Date,
    frequency: RecurringFrequency,
    metadata: any
  ): Date {
    console.log(
      `Calculating next payment date from base: ${baseDate.toISOString()}`
    );
    console.log(`Frequency: ${frequency}`);
    console.log(`Metadata: ${JSON.stringify(metadata)}`);

    const customTimes = metadata?.customTimes || [];
    const nextDate = new Date(baseDate);

    switch (frequency) {
      case RecurringFrequency.HOURLY:
        return this.calculateHourlyNextDate(baseDate, metadata);
      case RecurringFrequency.DAILY:
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case RecurringFrequency.WEEKLY:
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case RecurringFrequency.BI_WEEKLY:
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case RecurringFrequency.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case RecurringFrequency.QUARTERLY:
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case RecurringFrequency.YEARLY:
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      case RecurringFrequency.CUSTOM:
        return this.calculateCustomNextDate(baseDate, metadata);
      default:
        nextDate.setDate(nextDate.getDate() + 1);
    }

    if (customTimes.length > 0) {
      const [hours, minutes] = customTimes[0].split(":").map(Number);
      nextDate.setHours(hours, minutes, 0, 0);
    } else {
      nextDate.setHours(baseDate.getHours(), baseDate.getMinutes(), 0, 0);
    }

    const result = this.applyExclusions(nextDate, metadata);
    console.log(`Calculated next date: ${result.toISOString()}`);
    return result;
  }

  private calculateHourlyNextDate(baseDate: Date, metadata: any): Date {
    const scheduleWindow = metadata?.scheduleWindow || {};
    const hourlyInterval = metadata?.hourlyInterval || 1;
    const startHour = scheduleWindow.startHour ?? 0;
    const endHour = scheduleWindow.endHour ?? 23;

    let nextDate = new Date(baseDate);

    nextDate.setHours(nextDate.getHours() + hourlyInterval);

    nextDate = this.adjustToScheduleWindow(nextDate, metadata);

    nextDate = this.applyExclusions(nextDate, metadata);

    return nextDate;
  }

  private calculateCustomNextDate(baseDate: Date, metadata: any): Date {
    const customTimes = metadata?.customTimes || [];
    const scheduleWindow = metadata?.scheduleWindow || {};
    const startHour = scheduleWindow.startHour ?? 0;
    const endHour = scheduleWindow.endHour ?? 23;

    if (customTimes.length === 0) {
      const nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + 1);
      return this.applyExclusions(nextDate, metadata);
    }

    const sortedTimes = [...customTimes].sort();

    const currentHour = baseDate.getUTCHours();
    const currentMinute = baseDate.getUTCMinutes();
    const currentTimeStr = `${currentHour
      .toString()
      .padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`;

    console.log(`Current time (UTC): ${currentTimeStr}`);
    console.log(`Sorted custom times: ${sortedTimes}`);

    for (const time of sortedTimes) {
      if (time > currentTimeStr) {
        const [hours, minutes] = time.split(":").map(Number);
        const nextDate = new Date(baseDate);
        nextDate.setUTCHours(hours, minutes, 0, 0);

        if (hours >= startHour && hours <= endHour) {
          console.log(
            `Found next time today: ${time}, date: ${nextDate.toISOString()}`
          );
          return this.applyExclusions(nextDate, metadata);
        }
      }
    }

    const [hours, minutes] = sortedTimes[0].split(":").map(Number);
    const nextDate = new Date(baseDate);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    nextDate.setUTCHours(hours, minutes, 0, 0);

    console.log(
      `Using first time tomorrow: ${
        sortedTimes[0]
      }, date: ${nextDate.toISOString()}`
    );

    return this.applyExclusions(nextDate, metadata);
  }

  private adjustToScheduleWindow(date: Date, metadata: any): Date {
    const scheduleWindow = metadata?.scheduleWindow || {};
    const startHour = scheduleWindow.startHour ?? 0;
    const endHour = scheduleWindow.endHour ?? 23;

    const result = new Date(date);
    const currentHour = result.getUTCHours();

    console.log(
      `Adjusting to schedule window: currentHour=${currentHour}, startHour=${startHour}, endHour=${endHour}`
    );

    if (currentHour < startHour) {
      result.setUTCHours(startHour, 0, 0, 0);
      console.log(`Adjusted to start hour: ${result.toISOString()}`);
    } else if (currentHour >= endHour) {
      result.setUTCDate(result.getUTCDate() + 1);
      result.setUTCHours(startHour, 0, 0, 0);
      console.log(`Adjusted to start hour tomorrow: ${result.toISOString()}`);
    }

    return result;
  }

  private applyExclusions(date: Date, metadata: any): Date {
    const result = new Date(date);
    const excludedDays = metadata?.excludedDays || [];
    const excludedHours = metadata?.excludedHours || [];
    const excludedDates = metadata?.excludedDates || [];
    const skipWeekends = metadata?.skipWeekends ?? true;

    let needsAdjustment = false;

    console.log(`Applying exclusions to: ${result.toISOString()}`);
    console.log(
      `Excluded days: ${excludedDays}, Skip weekends: ${skipWeekends}`
    );

    do {
      needsAdjustment = false;

      const dayOfWeek = result.getUTCDay();
      console.log(`Day of week: ${dayOfWeek}`);

      if (excludedDays.includes(dayOfWeek)) {
        result.setUTCDate(result.getUTCDate() + 1);
        result.setUTCHours(0, 0, 0, 0);
        needsAdjustment = true;
        console.log(
          `Skipped excluded day ${dayOfWeek}, new date: ${result.toISOString()}`
        );
        continue;
      }

      if (skipWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
        result.setUTCDate(result.getUTCDate() + (dayOfWeek === 0 ? 1 : 2));
        result.setUTCHours(0, 0, 0, 0);
        needsAdjustment = true;
        console.log(
          `Skipped weekend day ${dayOfWeek}, new date: ${result.toISOString()}`
        );
        continue;
      }

      const hour = result.getUTCHours();
      if (excludedHours.includes(hour)) {
        result.setUTCHours(hour + 1, 0, 0, 0);
        needsAdjustment = true;
        console.log(
          `Skipped excluded hour ${hour}, new date: ${result.toISOString()}`
        );
        continue;
      }

      const dateString = result.toISOString().split("T")[0];
      const isExcludedDate = excludedDates.some((excludedDate: Date) => {
        const excludedDateStr = new Date(excludedDate)
          .toISOString()
          .split("T")[0];
        return excludedDateStr === dateString;
      });

      if (isExcludedDate) {
        result.setUTCDate(result.getUTCDate() + 1);
        result.setUTCHours(0, 0, 0, 0);
        needsAdjustment = true;
        console.log(
          `Skipped excluded date ${dateString}, new date: ${result.toISOString()}`
        );
        continue;
      }
    } while (needsAdjustment);

    console.log(`Final date after exclusions: ${result.toISOString()}`);
    return result;
  }

  async getQueueStats(): Promise<{
    dueCount: number;
    retryCount: number;
    pausedCount: number;
    nextDueDate: Date | null;
    lastProcessedDate: Date | null;
    activeUsersCount: number;
  }> {
    const now = new Date();

    const [
      dueCount,
      retryCount,
      pausedCount,
      nextDue,
      lastProcessed,
      activeUsers,
    ] = await Promise.all([
      RecurringPayment.countDocuments({
        status: "active",
        pinVerified: true,
        nextPaymentDate: { $lte: now },
        "metadata.retryAt": { $exists: false },
        "metadata.pauseEnabled": false,
      }),

      RecurringPayment.countDocuments({
        status: "active",
        "metadata.retryAt": { $lte: now, $exists: true },
      }),

      RecurringPayment.countDocuments({
        status: "paused",
      }),

      RecurringPayment.findOne({
        status: "active",
        pinVerified: true,
        nextPaymentDate: { $gt: now },
        "metadata.pauseEnabled": false,
      })
        .sort({ nextPaymentDate: 1 })
        .select("nextPaymentDate")
        .lean(),

      RecurringPayment.findOne({
        status: { $in: ["active", "completed"] },
        lastProcessedAt: { $exists: true },
      })
        .sort({ lastProcessedAt: -1 })
        .select("lastProcessedAt")
        .lean(),

      RecurringPayment.aggregate([
        { $match: { status: "active", pinVerified: true } },
        { $group: { _id: "$fromUser" } },
        { $count: "uniqueUsers" },
      ]),
    ]);

    return {
      dueCount,
      retryCount,
      pausedCount,
      nextDueDate: nextDue?.nextPaymentDate || null,
      lastProcessedDate: lastProcessed?.lastProcessedAt || null,
      activeUsersCount: activeUsers[0]?.uniqueUsers || 0,
    };
  }

  async retryPayment(scheduleId: string): Promise<PaymentProcessingResult> {
    const payment = await RecurringPayment.findOne({
      scheduleId,
      status: "active",
    })
      .populate("fromUser", "_id username stellarPublicKey")
      .populate("toUser", "_id username stellarPublicKey")
      .lean();

    if (!payment) {
      return {
        scheduleId,
        success: false,
        error: "Payment not found or not active",
      };
    }

    await RecurringPayment.updateOne(
      { _id: payment._id },
      {
        nextPaymentDate: new Date(),
        $unset: {
          "metadata.retryAt": "",
          "metadata.retryAttempts": "",
          "metadata.lastError": "",
        },
      }
    );

    return await this.processPayment(payment);
  }

  async pausePayment(scheduleId: string, reason?: string): Promise<boolean> {
    const result = await RecurringPayment.updateOne(
      { scheduleId, status: "active" },
      {
        status: "paused",
        $set: {
          "metadata.pauseEnabled": true,
          "metadata.pauseReason": reason || "Manually paused by system",
          "metadata.pauseStartDate": new Date(),
        },
      }
    );

    return result.modifiedCount > 0;
  }

  async resumePayment(scheduleId: string): Promise<boolean> {
    const result = await RecurringPayment.updateOne(
      { scheduleId, status: "paused" },
      {
        status: "active",
        $set: {
          "metadata.pauseEnabled": false,
          "metadata.pauseEndDate": new Date(),
        },
        $unset: {
          "metadata.pauseStartDate": "",
          "metadata.pauseReason": "",
        },
      }
    );

    return result.modifiedCount > 0;
  }
}

export const batchPaymentProcessor = new BatchPaymentProcessor();
