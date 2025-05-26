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
];
const ASSET_COLORS: { [key: string]: string } = {
  XLM: "#8884d8",
  USDC: "#82ca9d",
  EURT: "#ffc658",
  BTC: "#ff8042",
  ETH: "#a4de6c",
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
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    // In a real app, you would fetch this data from your API
    // For now, we'll use the sample data directly
    const fetchStats = async () => {
      try {
        const results = await getStats();
        console.log("Fetched stats:", results);
        // setStats(results.data);
        processData(results.data)
      } catch (error) {
        console.error("Failed to fetch Stellar data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const processData = (data: any) => {
    // Extract unique addresses from transactionsPerDay
    const uniqueAddresses = new Set<string>();
    data.transactionsPerDay.forEach((day: any) => {
      day.addresses.forEach((addr: string) => uniqueAddresses.add(addr));
    });

    // Create address objects with metadata
    const addressList = Array.from(uniqueAddresses).map((addr) => ({
      address: addr,
      name: addr.slice(0, 6) + "..." + addr.slice(-4),
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

          const tx: Transaction = {
            id: `simulated-tx-${day.date}-${i}`,
            type: Math.random() > 0.7 ? "payment" : "path_payment_strict_send",
            amount: (Math.random() * 1000).toFixed(2),
            created_at: new Date(day.date).toISOString(),
            asset: ["XLM", "USDC", "BTC"][Math.floor(Math.random() * 3)],
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <p className="text-xl">Loading data...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg shadow-md min-h-screen max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">RendBit Traction Analytics Dashboard</h2>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-gray-800 rounded-lg p-4 shadow text-center">
          <p className="text-gray-400 text-sm">Total Users</p>
          <p className="text-3xl font-bold text-blue-400">
            165
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 shadow text-center">
          <p className="text-gray-400 text-sm">Total Transactions</p>
          <p className="text-3xl font-bold text-green-400">
            {stats.totalTransactions || 0}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 shadow text-center">
          <p className="text-gray-400 text-sm">Active Users (7d)</p>
          <p className="text-3xl font-bold text-purple-400">
            {stats.totalUsers || 0}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 shadow text-center">
          <p className="text-gray-400 text-sm">Total Volume (All Assets)</p>
          <p className="text-3xl font-bold text-yellow-400">
            {volumeData.reduce((acc, cur) => acc + cur.value, 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 shadow text-center">
          <p className="text-gray-400 text-sm">Total Send Txns</p>
          <p className="text-3xl font-bold text-red-400">
            {directionVolumeData.find((d) => d.direction === "send")?.count ||
              0}
          </p>
        </div>
        {/* <div className="bg-gray-800 rounded-lg p-4 shadow text-center">
          <p className="text-gray-400 text-sm">Total Receive Txns</p>
          <p className="text-3xl font-bold text-green-400">
            {directionVolumeData.find((d) => d.direction === "receive")
              ?.count || 0}
          </p>
        </div> */}
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
            <Tooltip />
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
            <Tooltip formatter={(value: number) => value.toFixed(2)} />
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
            <Tooltip />
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
              <div className="text-xs text-gray-400 mt-1">{addr.address}</div>
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
