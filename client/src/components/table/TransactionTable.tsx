import React, { useState } from "react";
import { BiSearch } from "react-icons/bi";
import ArrayTableLoader from "../loader/ArrayTableLoader";
import { formateDecimal } from "../../utils";

interface TransactionTableProps {
  name: string;
  tableType: string;
  transactionHistory: any;
  loadingTx: boolean;
  setSearchText: any;
  searchText: string;
}

const TransactionTable: React.FC<TransactionTableProps> = ({
  name,
  tableType,
  transactionHistory,
  loadingTx,
  setSearchText,
  searchText,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredTransactions = transactionHistory?.filter((transaction: any) =>
    (tableType === "fiat"
      ? transaction?.id
      : transaction?.transaction_hash
    )?.includes(searchText?.toLowerCase())
  );

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const currentTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <div className="mt-10 space-y-6">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <h2 className="text-white text-2xl font-semibold">{name}</h2>
      <div className="relative w-full max-w-sm">
        <BiSearch className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-500 text-lg" />
        <input
          onChange={(e) => setSearchText(e.target.value)}
          type="text"
          placeholder="Search by Transaction ID"
          className="pl-10 pr-4 py-2 w-full text-sm rounded-lg bg-[#171b2d] text-white placeholder:text-gray-400 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <table className="min-w-full text-sm text-white bg-[#050d2a]">
        <thead className="bg-[#050d2a] text-left text-gray-300 text-xs uppercase tracking-wider">
          <tr>
            <th className="px-6 py-4">#</th>
            <th className="px-6 py-4">Transaction ID</th>
            <th className="px-6 py-4">Amount</th>
            <th className="px-6 py-4">Type</th>
            <th className="px-6 py-4">{tableType === "fiat" ? "From/To" : "Asset"}</th>
            <th className="px-6 py-4">View</th>
            {tableType !== "fiat" && <th className="px-6 py-4">Date</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {loadingTx ? (
            <tr>
              <td colSpan={7}>
                <ArrayTableLoader number={7} />
              </td>
            </tr>
          ) : currentTransactions.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-6 text-center text-gray-400">
                No transactions found.
              </td>
            </tr>
          ) : (
            currentTransactions.map((tx: any, index: number) => (
              <tr
                key={index}
                className="hover:bg-[#171b2d] transition-all duration-200"
              >
                <td className="px-6 py-4 text-gray-400">
                  {(currentPage - 1) * itemsPerPage + index + 1}.
                </td>
                <td className="px-6 py-4 break-all">
                  [
                  {tableType === "fiat"
                    ? `${tx?.id?.slice(0, 6)}...${tx?.id?.slice(-6)}`
                    : `${tx?.transaction_hash?.slice(0, 6)}...${tx?.transaction_hash?.slice(-6)}`}
                  ]
                </td>
                <td className="px-6 py-4">{formateDecimal(Number(tableType === "fiat" ? tx?.amount_in : tx?.amount)) || "N/A"}</td>
                <td className="px-6 py-4 capitalize">
                  {tableType === "fiat" ? tx?.kind : tx?.type}
                </td>
                <td className="px-6 py-4">
                  {tableType === "fiat"
                    ? tx?.kind === "deposit"
                      ? `${tx?.to?.slice(0, 6)}...${tx?.to?.slice(-6)}`
                      : tx.to || "N/A"
                    : tx?.asset_code || "N/A"}
                </td>
                <td className="px-6 py-4">
                  <a
                    href={
                      tableType === "fiat"
                        ? tx?.more_info_url
                        : `https://stellar.expert/explorer/public/tx/${tx?.transaction_hash}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline hover:text-blue-600 transition"
                  >
                    View
                  </a>
                </td>
                {tableType !== "fiat" && (
                  <td className="px-6 py-4 text-gray-400">
                    {new Date(tx?.created_at).toLocaleDateString()}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  
    <div className="flex items-center justify-between">
      <button
        onClick={handlePrevPage}
        disabled={currentPage === 1}
        className="px-4 py-2 text-sm bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-40"
      >
        Previous
      </button>
      <span className="text-gray-300">
        Page <span className="font-semibold">{currentPage}</span> of{" "}
        <span className="font-semibold">{totalPages}</span>
      </span>
      <button
        onClick={handleNextPage}
        disabled={currentPage === totalPages}
        className="px-4 py-2 text-sm bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-40"
      >
        Next
      </button>
    </div>
  </div>
  
  );
};

export default TransactionTable;
