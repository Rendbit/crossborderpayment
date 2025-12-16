import httpStatus from "http-status";
import { User } from "../models/User";
import { BlockchainFactory } from "../providers/blockchainFactory";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
let cachedStats: any = null;
let lastUpdated: number | null = null;

export class StatsService {
  async getFormattedUsers(): Promise<
    Record<
      string,
      {
        stellarWalletAddress: string;
        createdAt: string;
      }
    >
  > {
    try {
      const usersArr = await User.find({
        stellarPublicKey: { $exists: true, $ne: null },
      })
        .select("username stellarPublicKey createdAt")
        .lean();

      const formatted: Record<string, any> = {};
      usersArr.forEach((user, index) => {
        const key = user.username || `user${index + 1}`;
        formatted[key] = {
          stellarWalletAddress: user.stellarPublicKey!,
          createdAt: user.createdAt.toISOString(),
        };
      });
      return formatted;
    } catch (error) {
      console.error("Error fetching formatted users:", error);
      throw new Error("Failed to fetch formatted users");
    }
  }

  async getStats(): Promise<{
    status: number;
    data: any;
    success: boolean;
    message?: string;
  }> {
    try {
      const now = Date.now();

      // Check cache first
      if (cachedStats && lastUpdated && now - lastUpdated < CACHE_TTL_MS) {
        console.log("Returning cached stats");
        return {
          status: httpStatus.OK,
          data: cachedStats,
          success: true,
        };
      }

      // Get users
      const users = await this.getFormattedUsers();

      // Get stats provider from factory
      const statsProvider = BlockchainFactory.getStatsProvider("stellar");

      // Generate stats using provider
      cachedStats = await statsProvider.generateStats(users);
      lastUpdated = now;

      console.log("Stats generation complete");

      return {
        status: httpStatus.OK,
        data: cachedStats,
        success: true,
      };
    } catch (error: any) {
      console.error("Error fetching all stats:", error);

      // Return cached data if available
      if (cachedStats) {
        console.log("Returning stale cached data due to error");
        return {
          status: httpStatus.OK,
          data: cachedStats,
          success: true,
          message: "Using cached data due to generation error",
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: null,
        success: false,
        message: error.message || "Error fetching all stats",
      };
    }
  }
}
