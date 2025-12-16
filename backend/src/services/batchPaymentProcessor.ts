import mongoose from "mongoose";
import { RecurringPayment } from "../models/RecurringPayment";
import { User } from "../models/User";
import { PinHelper } from "../helpers/pin.helper";
import { BlockchainFactory } from "../providers/blockchainFactory";
import { logSecurityEvent } from "../utils/security";
import { emitEvent } from "../microservices/rabbitmq";
import { nanoid } from "nanoid";

export interface PaymentProcessingResult {
  scheduleId: string;
  success: boolean;
  error?: string;
  txHash?: string;
  paymentRef?: string;
  userId?: string;
  amount?: number;
  currency?: string;
}

export interface BatchProcessingStats {
  processed: number;
  failed: number;
  retried: number;
  skipped: number;
  totalTime: number;
  details: PaymentProcessingResult[];
}

export class BatchPaymentProcessor {
  private readonly BATCH_SIZE = 50;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MINUTES = [5, 15, 60];

  /**
   * Main method to process all due payments
   */
  async processDuePayments(): Promise<BatchProcessingStats> {
    const startTime = Date.now();
    const stats: BatchProcessingStats = {
      processed: 0,
      failed: 0,
      retried: 0,
      skipped: 0,
      totalTime: 0,
      details: [],
    };

    try {
      console.log("Starting batch payment processing...");

      const duePayments = await this.getDuePayments();

      if (duePayments.length === 0) {
        console.log("No payments due for processing");
        stats.totalTime = Date.now() - startTime;
        return stats;
      }

      console.log(`Found ${duePayments.length} due payments`);

      for (const payment of duePayments) {
        try {
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
            userId: payment.fromUser._id?.toString(),
            amount: payment.amount,
            currency: payment.currency,
          });
        }
      }

      stats.totalTime = Date.now() - startTime;
      console.log(`Batch processing completed in ${stats.totalTime}ms`);
      console.log(`   Processed: ${stats.processed}`);
      console.log(`   Retried: ${stats.retried}`);
      console.log(`   Failed: ${stats.failed}`);

      if (stats.processed > 0 || stats.failed > 0) {
        logSecurityEvent(
          "batch_payments_processed",
          "system",
          {
            processed: stats.processed,
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

    return await RecurringPayment.find({
      status: "active",
      pinVerified: true,
      $or: [
        { nextPaymentDate: { $lte: now } },
        { "metadata.retryAt": { $lte: now, $exists: true } },
      ],
    })
      .populate("fromUser", "_id username stellarPublicKey primaryEmail")
      .populate("toUser", "_id username stellarPublicKey primaryEmail")
      .sort({ nextPaymentDate: 1 })
      .limit(this.BATCH_SIZE)
      .lean();
  }

  private async processPayment(payment: any): Promise<PaymentProcessingResult> {
    const session = await mongoose.startSession();
    let result: PaymentProcessingResult = {
      scheduleId: payment.scheduleId,
      success: false,
      userId: payment.fromUser._id?.toString(),
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
        throw new Error("Payment no longer active");
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
        new Date(payment.nextPaymentDate),
        payment.frequency
      );

      const updateData: any = {
        lastProcessedAt: new Date(),
        nextPaymentDate,
        processingAttempts: 0,
        lastProcessingError: null,
        $push: {} as any,
      };

      if (paymentResult.blockchainTxHash) {
        updateData.$push.blockchainTxHashes = paymentResult.blockchainTxHash;
      }
      if (paymentResult.fiatPaymentRef) {
        updateData.$push.fiatPaymentRefs = paymentResult.fiatPaymentRef;
      }

      if (payment.metadata?.retryAt) {
        updateData.$unset = {
          "metadata.retryAt": "",
          "metadata.retryAttempts": "",
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
        transactionDetails: `Recurring payment: ${payment.scheduleId}`,
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
        processingAttempts: currentAttempts + 1,
        lastProcessingError: error,
        nextPaymentDate: retryAt,
        $set: {
          "metadata.retryAt": retryAt,
          "metadata.retryAttempts": currentAttempts + 1,
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

  private calculateNextPaymentDate(currentDate: Date, frequency: string): Date {
    const nextDate = new Date(currentDate);

    switch (frequency) {
      case "daily":
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case "weekly":
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case "bi_weekly":
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case "monthly":
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case "quarterly":
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case "yearly":
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        throw new Error(`Unknown frequency: ${frequency}`);
    }

    return nextDate;
  }

  async getQueueStats(): Promise<{
    dueCount: number;
    retryCount: number;
    nextDueDate: Date | null;
    lastProcessedDate: Date | null;
    activeUsersCount: number;
  }> {
    const now = new Date();

    const [dueCount, retryCount, nextDue, lastProcessed, activeUsers] =
      await Promise.all([
        RecurringPayment.countDocuments({
          status: "active",
          pinVerified: true,
          nextPaymentDate: { $lte: now },
          "metadata.retryAt": { $exists: false },
        }),

        RecurringPayment.countDocuments({
          status: "active",
          "metadata.retryAt": { $lte: now, $exists: true },
        }),

        RecurringPayment.findOne({
          status: "active",
          pinVerified: true,
          nextPaymentDate: { $gt: now },
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
        $unset: { "metadata.retryAt": "", "metadata.retryAttempts": "" },
      }
    );

    return await this.processPayment(payment);
  }
}

export const batchPaymentProcessor = new BatchPaymentProcessor();
