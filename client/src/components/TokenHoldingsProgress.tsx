import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Props {
  address: string;
}

interface AssetBalance {
  name: string;
  balance: number;
  color: string;
}

const COLORS = [
  "#4caf50", // Green
  "#2196f3", // Blue
  "#ff9800", // Orange
  "#9c27b0", // Purple
  "#f44336", // Red
  "#00bcd4", // Cyan
  "#8bc34a", // Light Green
  "#ffeb3b", // Yellow
];

const TokenHoldingsProgress: React.FC<Props> = ({ address }) => {
  const [data, setData] = useState<AssetBalance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;

    const fetchBalances = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `https://horizon.stellar.org/accounts/${address}`
        );
        const json = await res.json();
        const balances = json.balances;

        // Filter out zero balances and map assets
        const assets = balances
          .filter((b: any) => parseFloat(b.balance) > 0)
          .map((b: any) => {
            const assetCode = b.asset_type === "native" ? "XLM" : b.asset_code;
            return {
              name: assetCode,
              balance: parseFloat(b.balance),
            };
          });

        // Sort assets by balance descending
        assets.sort((a, b) => b.balance - a.balance);

        // Calculate total balance
        const total = assets.reduce((sum, a) => sum + a.balance, 0);

        // Assign colors and calculate percentages
        const topAssets = assets.slice(0, 3).map((a, index) => ({
          ...a,
          color: COLORS[index % COLORS.length],
        }));

        const otherBalance = assets
          .slice(3)
          .reduce((sum, a) => sum + a.balance, 0);

        const others =
          otherBalance > 0
            ? [
                {
                  name: "Others",
                  balance: otherBalance,
                  color: "#ccc",
                },
              ]
            : [];

        setData([...topAssets, ...others]);
      } catch (err) {
        console.error("Error fetching balances:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
  }, [address]);

  if (loading) return <p className="text-white">Loading balances...</p>;
  if (!data.length) return <p className="text-white">No assets found.</p>;

  return (
    <div>
      {/* <h2 className="text-white text-lg mb-4">Token Holdings</h2> */}
      <div className="w-full">
        {/* Bar */}
        <div className="flex h-2.5 rounded-full overflow-hidden mb-3">
          {data.map((token, idx) => {
            const totalBalance = data.reduce((sum, t) => sum + t.balance, 0);
            const percentage = (token.balance / totalBalance) * 100;
            return (
              <div
          key={idx}
          className="h-full"
          style={{
            width: `${percentage}%`,
            backgroundColor: token.color,
          }}
          title={`${token.name}: ${token.balance.toFixed(2)} (${percentage.toFixed(2)}%)`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="md:flex block justify-between text-white text-sm">
          {data.map((token, idx) => (
            <div key={idx} title={`${token.name}: ${token.balance.toFixed(2)}`} className="flex items-center space-x-1">
              <span
                className="inline-block w-3 h-3 mr-2 rounded-full"
                style={{ backgroundColor: token.color }}
              ></span>
              <span>
                {token.name}({token.balance.toFixed(2)})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TokenHoldingsProgress;
