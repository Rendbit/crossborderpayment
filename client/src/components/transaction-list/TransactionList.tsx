import React from "react";

const transactions = [
  {
    id: 1,
    name: "Goodness Amadasun",
    time: "10:30 AM",
    amount: "+₦5000",
    type: "Receive",
    initials: "GA",
    color: "bg-gray-800 text-white",
  },
  {
    id: 2,
    name: "Goodness Amadasun",
    time: "10:30 AM",
    amount: "+₦5000",
    type: "Receive",
    initials: "GA",
    color: "bg-gray-800 text-white",
  },
  {
    id: 3,
    name: "Frank Stark",
    time: "11:00 AM",
    amount: "-₦3000",
    type: "Transfer",
    initials: "FS",
    color: "bg-gray-800 text-white",
  },
  {
    id: 4,
    name: "Goodness Amadasun",
    time: "10:30 AM",
    amount: "+₦5000",
    type: "Receive",
    initials: "GA",
    color: "bg-gray-800 text-white",
  },
];

export default function TransactionList() {
  return (
    <div className="mx-auto shadow mt-3 rounded-xl p-4 bg-white">
      {transactions.map((tx, index) => (
        <div key={tx.id}>
          <div className="flex items-center justify-between py-3">
            {/* Left Section */}
            <div className="flex items-center space-x-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${tx.color}`}
              >
                {tx.initials}
              </div>
              <div>
                <p className="font-medium text-gray-900">{tx.name}</p>
                <p className="text-sm text-gray-500">{tx.time}</p>
              </div>
            </div>

            {/* Right Section */}
            <div className="text-right">
              <p
                className={`font-semibold ${
                  tx.amount.startsWith("+") ? "text-green-600" : "text-red-600"
                }`}
              >
                {tx.amount}
              </p>
              <p className="text-sm text-gray-500">{tx.type}</p>
            </div>
          </div>

          {/* Divider except last */}
          {index !== transactions.length - 1 && (
            <hr className="border-gray-200" />
          )}
        </div>
      ))}
    </div>
  );
}
