/**
 * STATISTICS CONTROLLER
 * @developer COAT
 * @author Rendbit
 */

import { Server, NotFoundError } from "stellar-sdk";
import { User } from "../models/User";
import httpStatus from "http-status";

type User = {
  stellarWalletAddress: string;
  createdAt: string;
};

let users: Record<string, User> = {};

interface Stats {
  totalUsers: number;
  totalTransactions: number;
  latestTransactionTime: string | null;
  operationTypesBreakdown: Record<string, number>;
  transactionsPerDay: { date: string; count: number }[];
  userGrowth: { date: string; count: number }[];
  activeUsersLast7Days: number;
}

// Cache setup
let cachedStats: Stats | null = null;
let lastUpdated: number | null = null;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const server = new Server(process.env.STELLAR_HORIZON_SERVER as string);

// Utility
const formatDate = (date: string | Date): string =>
  new Date(date).toISOString().slice(0, 10);

const chartify = (
  obj: Record<string, number>
): { date: string; count: number }[] =>
  Object.entries(obj)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

/**
 * Fetches users from DB and formats them to Record<string, FormattedUser>
 */
const getFormattedUsers = async (): Promise<Record<string, User>> => {
  try {
    const usersArr = await User.find({
      stellarPublicKey: { $exists: true, $ne: null },
    });
    const formatted: Record<string, User> = {};
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
};

// Fetch all transactions from a user
const fetchAllTransactions = async (address: string): Promise<any[]> => {
  const allTxs: any[] = [];
  try {
    let page = await server
      .transactions()
      .forAccount(address)
      .limit(200)
      .order("desc")
      .call();

    while (page.records.length > 0) {
      allTxs.push(...page.records);
      if (!page.next) break;
      page = await page.next();
    }
  } catch (error: any) {
    if (error instanceof NotFoundError || error?.response?.status === 404) {
      // console.warn(`No transactions found or account not found: ${address}`);
      return []; // Skip if account has no transactions or is not found
    } else {
      console.error(`Error fetching transactions for ${address}:`, error);
      throw error;
    }
  }

  return allTxs;
};

// Generate the stats
const generateStats = async (): Promise<Stats> => {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - 7);

  const txPerDay: Record<string, { count: number; addresses: Set<string> }> = {};
  const userGrowth: Record<string, number> = {};
  const opTypeCounter: Record<string, number> = {};
  const seenTxIds = new Set<string>();
  let totalTxs = 0;
  let latestTxTime: string | null = null;
  let activeUsers = 0;

  for (const user of Object.values(users)) {
    const address = user.stellarWalletAddress;
    const txs = await fetchAllTransactions(address);

    if (!txs.length) continue;

    let isActive = false;

    for (const tx of txs) {
      if (seenTxIds.has(tx.id)) continue;
      seenTxIds.add(tx.id);
      totalTxs++;

      const date = formatDate(tx.created_at);

      if (!txPerDay[date]) {
        txPerDay[date] = { count: 0, addresses: new Set<string>() };
      }

      txPerDay[date].count++;
      txPerDay[date].addresses.add(address);

      if (!latestTxTime || new Date(tx.created_at) > new Date(latestTxTime)) {
        latestTxTime = tx.created_at;
      }

      if (!isActive && new Date(tx.created_at) >= cutoff) {
        activeUsers++;
        isActive = true;
      }

      const opsPage = await server.operations().forTransaction(tx.id).call();
      for (const op of opsPage.records) {
        const type = (op as any).type;
        opTypeCounter[type] = (opTypeCounter[type] || 0) + 1;
      }
    }

    const signUpDate = formatDate(user.createdAt);
    userGrowth[signUpDate] = (userGrowth[signUpDate] || 0) + 1;
  }

  const transactionsPerDay = Object.entries(txPerDay)
    .map(([date, { count, addresses }]) => ({
      date,
      count,
      addresses: Array.from(addresses),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    totalUsers: Object.keys(users).length,
    totalTransactions: totalTxs,
    latestTransactionTime: latestTxTime,
    operationTypesBreakdown: opTypeCounter,
    transactionsPerDay,
    userGrowth: chartify(userGrowth),
    activeUsersLast7Days: activeUsers,
  };
};

// Stats endpoint
export const getStats = async (req: any, res: any) => {
  try {
    const now = Date.now();
    const from = req.query.from ? new Date(req.query.from as string) : null;
    const to = req.query.to ? new Date(req.query.to as string) : null;
    users = await getFormattedUsers();
    if (!cachedStats || !lastUpdated || now - lastUpdated > CACHE_TTL_MS) {
      cachedStats = await generateStats();
      lastUpdated = now;
    }
    const filterByDateRange = (data: { date: string; count: number }[]) => {
      return data.filter(({ date }) => {
        const d = new Date(date);
        return (!from || d >= from) && (!to || d <= to);
      });
    };

    return res.status(httpStatus.OK).json({
      data: {
        ...cachedStats,
        transactionsPerDay: filterByDateRange(cachedStats.transactionsPerDay),
        userGrowth: filterByDateRange(cachedStats.userGrowth),
      },
      status: httpStatus.OK,
      success: true,
    });
  } catch (error: any) {
    console.error("Error fetching all stats:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error fetching all stats",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
    });
  }
};
