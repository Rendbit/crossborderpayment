import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type TransactionPoint = {
  date: string;
  sent: number;
  received: number;
  sentAssets: string[];
  receivedAssets: string[];
};

interface Props {
  address: string;
}

const TransactionGraph: React.FC<Props> = ({ address }) => {
  const [data, setData] = useState<TransactionPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;

    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `https://horizon.stellar.org/accounts/${address}/payments?limit=200&order=desc`
        );
        const json = await res.json();
        const txs = json._embedded.records.filter(
          (tx: any) => tx.type === "payment"
        );

        const processed: Record<string, TransactionPoint> = {};

        txs.forEach((tx: any) => {
          const date = new Date(tx.created_at).toLocaleDateString();
          const amount = parseFloat(tx.amount);
          const type = tx.from === address ? "sent" : "received";
          const assetType =
            tx.asset_type === "native" ? "XLM" : `${tx.asset_code}`;

          if (!processed[date]) {
            processed[date] = {
              date,
              sent: 0,
              received: 0,
              sentAssets: [],
              receivedAssets: [],
            };
          }

          processed[date][type] += amount;
          if (type === "sent") {
            processed[date].sentAssets.push(assetType);
          } else {
            processed[date].receivedAssets.push(assetType);
          }
        });

        setData(Object.values(processed).reverse());
      } catch (err) {
        console.error("Error fetching Stellar transactions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [address]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      const point = payload[0]?.payload;
      return (
        <div className="bg-[#1e1e1e] p-3 rounded shadow text-sm text-white border border-gray-600">
          <p className="font-bold mb-1">{label}</p>
          <p>
            Sent: {point?.sent} (
            {(point?.sentAssets ?? []).join(", ") || "-"})
          </p>
          <p>
            Received: {point?.received} (
            {(point?.receivedAssets ?? []).join(", ") || "-"})
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading)
    return <p className="text-white">Loading transaction graph...</p>;
  if (!data.length) return <p className="text-white">No transactions found.</p>;

  return (
    <div className="p-4 rounded-lg shadow-md">
      <h2 className="text-white text-lg mb-4">Transaction History</h2>
      <ResponsiveContainer width="100%" height={170}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="date" stroke="#aaa" />
          <YAxis stroke="#aaa" />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="basis"
            dataKey="sent"
            stroke="#f87171"
            name="Withdrawals"
            strokeWidth={3}
            dot={false}
          />
          <Line
            type="basis"
            dataKey="received"
            stroke="#34d399"
            name="Deposits"
            strokeWidth={3}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TransactionGraph;
