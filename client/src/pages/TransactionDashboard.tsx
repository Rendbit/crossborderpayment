import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { getStats } from "../function/stats";

const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff8042",
  "#a4de6c",
  "#d0ed57",
  "#ff6b6b",
  "#4ecdc4",
  "#45b7d1",
  "#96ceb4",
];
const ASSET_COLORS: { [key: string]: string } = {
  XLM: "#8884d8",
  USDC: "#82ca9d",
  EURT: "#ffc658",
  BTC: "#ff8042",
  ETH: "#a4de6c",
  NGNC: "#ff6b6b", // Added NGNC
  GHSC: "#4ecdc4", // Added GHSC
  KESC: "#45b7d1", // Added KESC
  Unknown: "#d0ed57",
};
const TRANSACTION_TYPE_COLORS: { [key: string]: string } = {
  payment: "#3b82f6",
  path_payment_strict_receive: "#ef4444",
  path_payment_strict_send: "#facc15",
  create_account: "#10b981",
  account_merge: "#f472b6",
  manage_buy_offer: "#8b5cf6",
  manage_sell_offer: "#f59e0b",
  change_trust: "#ec4899",
};

type Transaction = {
  id: string;
  type: string;
  amount: string;
  created_at: string;
  asset: string;
  from: string;
  to: string;
};

type VolumeData = {
  name: string;
  value: number;
  date: Date;
};

type AssetVolumeData = {
  asset: string;
  volume: number;
  count: number;
};

type TypeVolumeData = {
  type: string;
  volume: number;
  count: number;
};

type DirectionVolumeData = {
  direction: string;
  count: number;
};

type AddressData = {
  address: string;
  name: string;
  type: string;
};

// Utility function to format numbers with commas
const formatNumberWithCommas = (num: number): string => {
  return num.toLocaleString("en-US");
};

// Utility function to format addresses nicely
const formatAddress = (address: string): string => {
  if (!address) return "";
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
};

const TransactionDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>({});
  const [addresses, setAddresses] = useState<AddressData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [volumeData, setVolumeData] = useState<VolumeData[]>([]);
  const [assetVolumeData, setAssetVolumeData] = useState<AssetVolumeData[]>([]);
  const [typeVolumeData, setTypeVolumeData] = useState<TypeVolumeData[]>([]);
  const [directionVolumeData, setDirectionVolumeData] = useState<
    DirectionVolumeData[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchStats = async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const results = await getStats();
      console.log("Fetched stats:", results);
      processData(results.data);
    } catch (error) {
      console.error("Failed to fetch Stellar data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = () => {
    fetchStats(true);
  };

  const processData = (data: any) => {
    // Extract unique addresses from transactionsPerDay
    const uniqueAddresses = new Set<string>();
    data.transactionsPerDay.forEach((day: any) => {
      day.addresses.forEach((addr: string) => uniqueAddresses.add(addr));
    });

    // Create address objects with metadata
    const addressList = Array.from(uniqueAddresses).map((addr) => ({
      address: addr,
      name: formatAddress(addr),
      type: addr.startsWith("GD") ? "user" : "institution",
    }));

    setAddresses(addressList);
    setStats(data);

    // Process transactions data
    processTransactions(data.transactionsPerDay, addressList);
  };

  const processTransactions = (
    transactionsPerDay: any[],
    addressList: AddressData[]
  ) => {
    // This is a simplified version - in a real app you would fetch actual transaction data
    // for each address from the Stellar API

    const allTxs: Transaction[] = [];
    const volumeMap = new Map<string, number>();
    const assetMap = new Map<string, { volume: number; count: number }>();
    const typeMap = new Map<string, { volume: number; count: number }>();
    const directionMap = new Map<string, number>([
      ["send", 0],
      ["receive", 0],
    ]);

    // All available assets including the new ones
    const availableAssets = [
      "XLM",
      "USDC",
      "BTC",
      "NGNC",
      "GHSC",
      "KESC",
      "EURT",
      "ETH",
    ];

    // Simulate some transaction data based on the counts
    transactionsPerDay.forEach((day) => {
      day.addresses.forEach((addr: string) => {
        // Create sample transactions for each day
        for (let i = 0; i < day.count; i++) {
          const isSend = Math.random() > 0.5;
          const toAddr = isSend
            ? addressList.find((a) => a.address !== addr)?.address || addr
            : addr;
          const fromAddr = isSend
            ? addr
            : addressList.find((a) => a.address !== addr)?.address || addr;

          // Select random asset from available assets
          const randomAsset =
            availableAssets[Math.floor(Math.random() * availableAssets.length)];

          const tx: Transaction = {
            id: `simulated-tx-${day.date}-${i}`,
            type: Math.random() > 0.7 ? "payment" : "path_payment_strict_send",
            amount: (Math.random() * 1000).toFixed(2),
            created_at: new Date(day.date).toISOString(),
            asset: randomAsset,
            from: fromAddr,
            to: toAddr,
          };

          allTxs.push(tx);

          // Process analytics data
          const date = new Date(tx.created_at).toLocaleDateString();
          const amount = parseFloat(tx.amount);

          if (!isNaN(amount)) {
            // Volume by date
            volumeMap.set(date, (volumeMap.get(date) || 0) + amount);

            // Asset volume & count
            const assetPrev = assetMap.get(tx.asset) || { volume: 0, count: 0 };
            assetMap.set(tx.asset, {
              volume: assetPrev.volume + amount,
              count: assetPrev.count + 1,
            });

            // Type volume & count
            const typePrev = typeMap.get(tx.type) || { volume: 0, count: 0 };
            typeMap.set(tx.type, {
              volume: typePrev.volume + amount,
              count: typePrev.count + 1,
            });

            // Direction count
            if (tx.from === tx.to) {
              // Skip self transactions
            } else if (addressList.some((a) => a.address === tx.from)) {
              directionMap.set("send", (directionMap.get("send") || 0) + 1);
            } else if (addressList.some((a) => a.address === tx.to)) {
              directionMap.set(
                "receive",
                (directionMap.get("receive") || 0) + 1
              );
            }
          }
        }
      });
    });

    setTransactions(allTxs);

    // Prepare arrays from maps
    const volumeArray = Array.from(volumeMap.entries())
      .map(([name, value]) => ({
        name,
        value,
        date: new Date(name),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const assetArray = Array.from(assetMap.entries()).map(
      ([asset, { volume, count }]) => ({
        asset,
        volume,
        count,
      })
    );

    const typeArray = Array.from(typeMap.entries()).map(
      ([type, { volume, count }]) => ({
        type,
        volume,
        count,
      })
    );

    const directionArray = Array.from(directionMap.entries()).map(
      ([direction, count]) => ({
        direction,
        count,
      })
    );

    setVolumeData(volumeArray);
    setAssetVolumeData(assetArray);
    setTypeVolumeData(typeArray);
    setDirectionVolumeData(directionArray);
  };

  // Loading skeleton component
  if (loading && !refreshing) {
    return (
      <div className="bg-gray-900 text-white p-6 rounded-lg shadow-md min-h-screen max-w-7xl mx-auto">
        {/* Header with reload button skeleton */}
        <div className="flex justify-between items-center mb-6">
          <div className="h-10 bg-gray-800 rounded w-96 animate-pulse"></div>
          <div className="h-10 bg-gray-800 rounded w-32 animate-pulse"></div>
        </div>

        {/* Summary Stats Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-4 md:grid-cols-5 gap-4 mb-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-4 shadow">
              <div className="h-4 bg-gray-700 rounded w-24 mb-2 animate-pulse"></div>
              <div className="h-8 bg-gray-700 rounded w-16 animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-4 shadow mb-8">
            <div className="h-6 bg-gray-700 rounded w-48 mb-4 animate-pulse"></div>
            <div className="h-64 bg-gray-700 rounded animate-pulse"></div>
          </div>
        ))}

        {/* Address List Skeleton */}
        <div className="bg-gray-800 rounded-lg p-4 shadow mb-8">
          <div className="h-6 bg-gray-700 rounded w-48 mb-4 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-700 p-3 rounded-lg animate-pulse">
                <div className="h-4 bg-gray-600 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-600 rounded w-full mb-1"></div>
                <div className="h-3 bg-gray-600 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Calculate total volume
  const totalVolume = volumeData.reduce((acc, cur) => acc + cur.value, 0);
  const sendCount =
    directionVolumeData.find((d) => d.direction === "send")?.count || 0;
  const receiveCount =
    directionVolumeData.find((d) => d.direction === "receive")?.count || 0;

  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg shadow-md min-h-screen max-w-7xl mx-auto">
      {/* Header with reload button - ALWAYS VISIBLE */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">
          RendBit Traction Analytics Dashboard
        </h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`flex items-center gap-2 text-white font-medium py-2 px-4 rounded-lg transition-colors ${
            refreshing
              ? "bg-blue-800 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
              clipRule="evenodd"
            />
          </svg>
          {refreshing ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>

      {/* If refreshing, show overlay but keep content visible */}
      {refreshing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex items-center gap-3">
              <svg
                className="animate-spin h-8 w-8 text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <p className="text-lg">Refreshing data...</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-gray-800 rounded-lg p-4 shadow text-center">
          <p className="text-gray-400 text-sm">Total Users</p>
          <p className="text-3xl font-bold text-blue-400">
            {formatNumberWithCommas(165)}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 shadow text-center">
          <p className="text-gray-400 text-sm">Total Transactions</p>
          <p className="text-3xl font-bold text-green-400">
            {formatNumberWithCommas(stats.totalTransactions || 0)}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 shadow text-center">
          <p className="text-gray-400 text-sm">Active Users (7d)</p>
          <p className="text-3xl font-bold text-purple-400">
            {formatNumberWithCommas(stats.totalUsers || 0)}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 shadow text-center">
          <p className="text-gray-400 text-sm">Total Volume (All Assets)</p>
          <p className="text-3xl font-bold text-yellow-400">
            {formatNumberWithCommas(parseFloat(totalVolume.toFixed(2)))}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 shadow text-center">
          <p className="text-gray-400 text-sm">Total Send Txns</p>
          <p className="text-3xl font-bold text-red-400">
            {formatNumberWithCommas(sendCount)}
          </p>
        </div>
      </div>

      {/* User Growth Area Chart */}
      <section className="bg-gray-800 rounded-lg p-4 shadow mb-8">
        <h3 className="text-xl font-semibold mb-3">User Growth Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={stats.userGrowth || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9CA3AF"
              tickFormatter={(value) => format(new Date(value), "MMM d")}
            />
            <YAxis stroke="#9CA3AF" />
            <Tooltip
              labelFormatter={(label) => format(new Date(label), "PPPP")}
              formatter={(value: number) => formatNumberWithCommas(value)}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      {/* Transaction Activity Over Time */}
      <section className="bg-gray-800 rounded-lg p-4 shadow mb-8">
        <h3 className="text-xl font-semibold mb-3">Transaction Activity</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={stats.transactionsPerDay || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9CA3AF"
              tickFormatter={(value) => format(new Date(value), "MMM d")}
            />
            <YAxis stroke="#9CA3AF" />
            <Tooltip
              labelFormatter={(label) => format(new Date(label), "PPPP")}
              formatter={(value: number) => formatNumberWithCommas(value)}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      {/* Operation Types Breakdown */}
      <section className="bg-gray-800 rounded-lg p-4 shadow mb-8">
        <h3 className="text-xl font-semibold mb-3">
          Operation Types Breakdown
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={Object.entries(stats.operationTypesBreakdown || {}).map(
              ([type, count]) => ({
                type,
                count,
              })
            )}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="type" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip
              formatter={(value: number) => formatNumberWithCommas(value)}
            />
            <Bar
              dataKey="count"
              fill="#8884d8"
              name="Operation Count"
              barSize={30}
            />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Asset Distribution Pie */}
      <section className="bg-gray-800 rounded-lg p-4 shadow mb-8">
        <h3 className="text-xl font-semibold mb-3">
          Transaction Volume by Asset
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={assetVolumeData}
              dataKey="volume"
              nameKey="asset"
              cx="50%"
              cy="50%"
              outerRadius={100}
              fill="#8884d8"
              label={({ asset }) => asset}
            >
              {assetVolumeData.map((entry, index) => (
                <Cell
                  key={`cell-asset-${index}`}
                  fill={
                    ASSET_COLORS[entry.asset] || COLORS[index % COLORS.length]
                  }
                />
              ))}
            </Pie>
            <Legend />
            <Tooltip
              formatter={(value: number) => [
                formatNumberWithCommas(parseFloat(value.toFixed(2))),
                "Volume",
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </section>

      {/* Transaction Types Breakdown */}
      <section className="bg-gray-800 rounded-lg p-4 shadow mb-8">
        <h3 className="text-xl font-semibold mb-3">
          Transaction Counts by Type
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={typeVolumeData}>
            <XAxis dataKey="type" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip
              formatter={(value: number) => formatNumberWithCommas(value)}
            />
            <Bar
              dataKey="count"
              fill="#3b82f6"
              name="Transaction Count"
              barSize={30}
            />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Address List */}
      <section className="bg-gray-800 rounded-lg p-4 shadow mb-8">
        <h3 className="text-xl font-semibold mb-3">Tracked Addresses</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {addresses.map((addr) => (
            <div key={addr.address} className="bg-gray-700 p-3 rounded-lg">
              <div className="font-mono text-sm text-blue-400">{addr.name}</div>
              <div className="text-xs text-gray-400 mt-1 break-all">
                {formatAddress(addr.address)}
              </div>
              <div className="text-xs text-yellow-400 mt-1">
                Type: {addr.type}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default TransactionDashboard;
