import { NotFoundError, Horizon } from "stellar-sdk";
import { IStatsProvider } from "../../types/blockchain";

export class StellarStats implements IStatsProvider {
  private getServer(): Horizon.Server {
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
  }

  private formatDate(date: string | Date): string {
    return new Date(date).toISOString().slice(0, 10);
  }

  async fetchTransactionsWithLimit(
    address: string,
    limit: number = 100
  ): Promise<any[]> {
    const allTxs: any = [];
    try {
      const server = this.getServer();
      let page = await server
        .transactions()
        .forAccount(address)
        .limit(50)
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
        return [];
      }
    }

    return allTxs;
  }

  async batchFetchOperations(
    txIds: string[],
    batchSize: number = 20
  ): Promise<Record<string, any[]>> {
    const server = this.getServer();
    const operationsByTx: Record<string, any[]> = {};

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

      if (i + batchSize < txIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return operationsByTx;
  }

  async generateStats(users: Record<string, any>): Promise<{
    totalUsers: number;
    totalTransactions: number;
    latestTransactionTime: string | null;
    operationTypesBreakdown: Record<string, number>;
    transactionsPerDay: { date: string; count: number; addresses: string[] }[];
    userGrowth: { date: string; count: number }[];
    activeUsersLast7Days: number;
  }> {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const txPerDay: Record<string, { count: number; addresses: Set<string> }> =
      {};
    const userGrowth: Record<string, number> = {};
    const opTypeCounter: Record<string, number> = {};
    const seenTxIds = new Set<string>();
    const allTxIds: string[] = [];
    let totalTxs = 0;
    let latestTxTime: string | null = null;
    const activeUserSet = new Set<string>();

    // Process user growth data
    Object.values(users).forEach((user: any) => {
      const signUpDate = this.formatDate(user.createdAt);
      userGrowth[signUpDate] = (userGrowth[signUpDate] || 0) + 1;
    });

    // Process transactions
    const userAddresses = Object.values(users).map(
      (u: any) => u.stellarWalletAddress
    );
    const maxUsersToProcess = 50;
    const usersToProcess = userAddresses.slice(0, maxUsersToProcess);

    console.log(`Processing ${usersToProcess.length} users for stats...`);

    const transactionPromises = usersToProcess.map(async (address) => {
      try {
        const txs = await this.fetchTransactionsWithLimit(address, 50);
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
    const allTransactions: Array<{ tx: any; address: string }> = [];

    userTransactions.forEach(({ address, txs }) => {
      txs.forEach((tx) => {
        const txDate = new Date(tx.created_at);
        if (txDate >= thirtyDaysAgo) {
          allTransactions.push({ tx, address });
          allTxIds.push(tx.id);
        }
      });
    });

    console.log(`Fetching operations for ${allTxIds.length} transactions...`);
    const operationsByTx = await this.batchFetchOperations(allTxIds);

    allTransactions.forEach(({ tx, address }) => {
      if (seenTxIds.has(tx.id)) return;

      seenTxIds.add(tx.id);
      totalTxs++;

      const date = this.formatDate(tx.created_at);
      const txDate = new Date(tx.created_at);

      if (!txPerDay[date]) {
        txPerDay[date] = { count: 0, addresses: new Set<string>() };
      }

      txPerDay[date].count++;
      txPerDay[date].addresses.add(address);

      if (!latestTxTime || txDate > new Date(latestTxTime)) {
        latestTxTime = tx.created_at;
      }

      if (txDate >= sevenDaysAgo) {
        activeUserSet.add(address);
      }

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

    const chartify = (
      obj: Record<string, number>
    ): { date: string; count: number }[] =>
      Object.entries(obj)
        .map(([date, count]) => ({ date, count }))
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

    return {
      totalUsers: Object.keys(users).length,
      totalTransactions: totalTxs,
      latestTransactionTime: latestTxTime,
      operationTypesBreakdown: opTypeCounter,
      transactionsPerDay,
      userGrowth: chartify(userGrowth),
      activeUsersLast7Days: activeUserSet.size,
    };
  }
}
