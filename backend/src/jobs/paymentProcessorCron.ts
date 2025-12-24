import cron from "node-cron";
import { batchPaymentProcessor } from "../services/batchPaymentProcessor";

class PaymentProcessorJob {
  private isProcessing = false;
  // private readonly PROCESSING_INTERVAL = "*/1 * * * *"; // Every 5 minutes
  private readonly PROCESSING_INTERVAL = "*/10 * * * * *"; // Every second
  private readonly MONITORING_INTERVAL = "0 */1 * * *"; // Every hour
  private processingJob: any  = null;
  private monitoringJob: any = null;

  start(): void {
    console.log("Starting Payment Processor Job...");

    // Main processing job - runs every 5 minutes
    this.processingJob = cron.schedule(this.PROCESSING_INTERVAL, async () => {
      if (this.isProcessing) {
        console.log("Processing already in progress, skipping...");
        return;
      }

      try {
        this.isProcessing = true;
        await batchPaymentProcessor.processDuePayments();
      } catch (error) {
        console.error("Error in payment processor job:", error);
      } finally {
        this.isProcessing = false;
      }
    });

    // Monitoring job - runs every hour
    this.monitoringJob = cron.schedule(this.MONITORING_INTERVAL, async () => {
      try {
        const stats = await batchPaymentProcessor.getQueueStats();
        this.logQueueStats(stats);

        // Alert if queue is getting large
        if (stats.dueCount > 100) {
          console.warn(
            `Warning: ${stats.dueCount} payments pending processing`
          );
        }

        if (stats.retryCount > 10) {
          console.warn(`Warning: ${stats.retryCount} payments in retry queue`);
        }
      } catch (error) {
        console.error("Error in monitoring job:", error);
      }
    });

    console.log("Payment Processor Job started successfully");
  }

  private logQueueStats(stats: any): void {
    console.log("Payment Queue Statistics:");
    console.log(`   Due payments: ${stats.dueCount}`);
    console.log(`   Retry queue: ${stats.retryCount}`);
    console.log(`   Active users: ${stats.activeUsersCount}`);
    console.log(`   Next due date: ${stats.nextDueDate || "None"}`);
    console.log(`   Last processed: ${stats.lastProcessedDate || "Never"}`);
  }

  stop(): void {
    console.log("Stopping Payment Processor Job...");

    if (this.processingJob) {
      this.processingJob.stop();
    }

    if (this.monitoringJob) {
      this.monitoringJob.stop();
    }
  }
}

// Create and export singleton
export const paymentProcessorJob = new PaymentProcessorJob();
