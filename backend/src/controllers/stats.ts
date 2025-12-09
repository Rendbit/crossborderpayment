// STATISTICS CONTROLLER - OPTIMIZED VERSION
import { NotFoundError, Horizon } from "stellar-sdk";
import { User } from "../models/User";
import httpStatus from "http-status";

type FormattedUser = {
  stellarWalletAddress: string;
  createdAt: string;
};

let users: Record<string, FormattedUser> = {};

interface Stats {
  totalUsers: number;
  totalTransactions: number;
  latestTransactionTime: string | null;
  operationTypesBreakdown: Record<string, number>;
  transactionsPerDay: { date: string; count: number; addresses: string[] }[];
  userGrowth: { date: string; count: number }[];
  activeUsersLast7Days: number;
}

// Cache setup
let cachedStats: Stats | null = null;
let lastUpdated: number | null = null;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// Utility functions
const formatDate = (date: string | Date): string =>
  new Date(date).toISOString().slice(0, 10);

const chartify = (
  obj: Record<string, number>
): { date: string; count: number }[] =>
  Object.entries(obj)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

/**
 * Fetches users from DB and formats them
 */
const getFormattedUsers = async (): Promise<Record<string, FormattedUser>> => {
  try {
    const usersArr = await User.find({
      stellarPublicKey: { $exists: true, $ne: null },
    })
      .select("username stellarPublicKey createdAt")
      .lean();

    const formatted: Record<string, FormattedUser> = {};
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

// Get Stellar server instance
const getStellarServer = () => {
  const network = process.env.STELLAR_NETWORK || "testnet";
  if (network === "public") {
    return new Horizon.Server(
      process.env.STELLAR_PUBLIC_SERVER || "https://horizon.stellar.org"
    );
  } else {
    return new Horizon.Server(
      process.env.STELLAR_TESTNET_SERVER ||
        "https://horizon-testnet.stellar.org"
    );
  }
};

/**
 * Fetch transactions with pagination limit (to prevent infinite loading)
 */
const fetchTransactionsWithLimit = async (
  address: string,
  limit: number = 100
): Promise<any[]> => {
  const allTxs: any = [];
  try {
    const server = getStellarServer();
    let page = await server
      .transactions()
      .forAccount(address)
      .limit(50) // Smaller page size for better performance
      .order("desc")
      .call();

    let fetched = 0;
    while (page.records.length > 0 && fetched < limit) {
      allTxs.push(...page.records);
      fetched += page.records.length;

      if (!page.next || fetched >= limit) break;
      page = await page.next();
    }
  } catch (error: any) {
    if (error instanceof NotFoundError || error?.response?.status === 404) {
      return [];
    } else {
      console.error(
        `Error fetching transactions for ${address.slice(0, 8)}...:`,
        error.message
      );
      // Don't throw, just return empty to continue with other users
      return [];
    }
  }

  return allTxs;
};

/**
 * Batch fetch operations for multiple transaction IDs
 */
const batchFetchOperations = async (
  txIds: string[],
  batchSize: number = 20
): Promise<Record<string, any[]>> => {
  const server = getStellarServer();
  const operationsByTx: Record<string, any[]> = {};

  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < txIds.length; i += batchSize) {
    const batch = txIds.slice(i, i + batchSize);
    const promises = batch.map(async (txId) => {
      try {
        const ops = await server
          .operations()
          .forTransaction(txId)
          .limit(10)
          .call();
        return { txId, operations: ops.records };
      } catch (error) {
        console.error(
          `Error fetching operations for tx ${txId.slice(0, 8)}...:`,
          error
        );
        return { txId, operations: [] };
      }
    });

    const results = await Promise.all(promises);
    results.forEach(({ txId, operations }) => {
      operationsByTx[txId] = operations;
    });

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < txIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return operationsByTx;
};

/**
 * Optimized stats generation
 */
const generateStats = async (): Promise<Stats> => {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30); // Limit to last 30 days for performance

  const txPerDay: Record<string, { count: number; addresses: Set<string> }> =
    {};
  const userGrowth: Record<string, number> = {};
  const opTypeCounter: Record<string, number> = {};
  const seenTxIds = new Set<string>();
  const allTxIds: string[] = [];
  let totalTxs = 0;
  let latestTxTime: string | null = null;
  const activeUserSet = new Set<string>();

  // First, process user growth data (this is fast)
  Object.values(users).forEach((user) => {
    const signUpDate = formatDate(user.createdAt);
    userGrowth[signUpDate] = (userGrowth[signUpDate] || 0) + 1;
  });

  // Process transactions in parallel with limits
  const userAddresses = Object.values(users).map((u) => u.stellarWalletAddress);

  // Limit to reasonable number of users for performance
  const maxUsersToProcess = 50; // Adjust based on your needs
  const usersToProcess = userAddresses.slice(0, maxUsersToProcess);

  console.log(`Processing ${usersToProcess.length} users for stats...`);

  // Fetch transactions for all users in parallel with timeout
  const transactionPromises = usersToProcess.map(async (address) => {
    try {
      const txs = await fetchTransactionsWithLimit(address, 50); // Limit to 50 transactions per user
      return { address, txs };
    } catch (error) {
      console.error(
        `Failed to fetch transactions for ${address.slice(0, 8)}...:`,
        error
      );
      return { address, txs: [] };
    }
  });

  const userTransactions = await Promise.all(transactionPromises);

  // Collect all transaction IDs for batch operations fetch
  const allTransactions: Array<{ tx: any; address: string }> = [];

  userTransactions.forEach(({ address, txs }) => {
    txs.forEach((tx) => {
      const txDate = new Date(tx.created_at);

      // Only include transactions from last 30 days for performance
      if (txDate >= thirtyDaysAgo) {
        allTransactions.push({ tx, address });
        allTxIds.push(tx.id);
      }
    });
  });

  // Batch fetch operations for all transactions
  console.log(`Fetching operations for ${allTxIds.length} transactions...`);
  const operationsByTx = await batchFetchOperations(allTxIds);

  // Process all transactions
  allTransactions.forEach(({ tx, address }) => {
    if (seenTxIds.has(tx.id)) return;

    seenTxIds.add(tx.id);
    totalTxs++;

    const date = formatDate(tx.created_at);
    const txDate = new Date(tx.created_at);

    if (!txPerDay[date]) {
      txPerDay[date] = { count: 0, addresses: new Set<string>() };
    }

    txPerDay[date].count++;
    txPerDay[date].addresses.add(address);

    if (!latestTxTime || txDate > new Date(latestTxTime)) {
      latestTxTime = tx.created_at;
    }

    // Check if active in last 7 days
    if (txDate >= sevenDaysAgo) {
      activeUserSet.add(address);
    }

    // Count operation types from cached operations
    const operations = operationsByTx[tx.id] || [];
    operations.forEach((op: any) => {
      const type = op.type;
      opTypeCounter[type] = (opTypeCounter[type] || 0) + 1;
    });
  });

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
    activeUsersLast7Days: activeUserSet.size,
  };
};

// Stats endpoint
export const getStats = async (req: any, res: any) => {
  try {
    const now = Date.now();

    // Check cache first
    if (cachedStats && lastUpdated && now - lastUpdated < CACHE_TTL_MS) {
      console.log("Returning cached stats");
      return res.status(httpStatus.OK).json({
        data: cachedStats,
        status: httpStatus.OK,
        success: true,
      });
    }

    console.log("Generating fresh stats...");

    // Update users from database
    users = await getFormattedUsers();

    // Generate new stats
    cachedStats = await generateStats();
    lastUpdated = now;

    console.log("Stats generation complete");

    return res.status(httpStatus.OK).json({
      data: cachedStats,
      status: httpStatus.OK,
      success: true,
    });
  } catch (error: any) {
    console.error("Error fetching all stats:", error);

    // Return cached data if available (even if stale) as fallback
    if (cachedStats) {
      console.log("Returning stale cached data due to error");
      return res.status(httpStatus.OK).json({
        data: cachedStats,
        status: httpStatus.OK,
        success: true,
        message: "Using cached data due to generation error",
      });
    }

    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error fetching all stats",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
    });
  }
};
