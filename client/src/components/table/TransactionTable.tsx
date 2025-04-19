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
    <div className=" mt-5 ">
      <div className="md:flex block items-center md:justify-between mb-10">
        <p className="text-[#ffffff] sm:text-[20px]">{name}</p>
        <div className="flex items-center gap-2 border rounded-full py-[6px] px-3">
          <BiSearch />
          <input
            onChange={(e) => setSearchText(e.target.value)}
            type="text"
            className="bg-white outline-none w-[200px] p-2 rounded-md text-[12px] text-[black]"
            placeholder="Filter Transactions by ID"
          />
        </div>
      </div>
      <div className="border border-[#B2B2B27A] rounded-[4px]">
        <div className="relative overflow-auto">
          {loadingTx ? (
            <ArrayTableLoader number={7} />
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-[12px] text-[#ffffff]">
                <tr>
                  <th className="px-6 py-3">S/N</th>
                  <th className="px-6 py-3">Transaction ID</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Transaction Type</th>
                  <th className="px-6 py-3">
                    {tableType === "fiat" ? "From/To" : "Asset Code"}
                  </th>

                  <th className="px-6 py-3">View</th>
                  {tableType !== "fiat" && <th className="px-6 py-3">Date</th>}
                </tr>
              </thead>
              <tbody>
                {!currentTransactions.length ? (
                  <tr>
                    <td className="px-6 py-4 text-white">No transaction.</td>
                  </tr>
                ) : (
                  currentTransactions.map((transaction: any, index: number) => (
                    <tr
                      key={index}
                      className="text-[12px] text-white border-t border-[#FFFFFF]/50"
                    >
                      <td className="px-6 py-4">
                        {(currentPage - 1) * itemsPerPage + index + 1}.
                      </td>
                      <td className="px-6 py-4">
                        [{tableType === "fiat"
                          ? `${transaction?.id?.slice(
                              0,
                              6
                            )}......${transaction?.id?.slice(-6)}`
                          : `${transaction?.transaction_hash?.slice(
                              0,
                              6
                            )}......${transaction?.transaction_hash?.slice(
                              -6
                            )}`}]
                      </td>
                      <td className="px-6 py-4">
                        {tableType === "fiat"
                          ? formateDecimal(Number(transaction?.amount_in)) || "N/A"
                          : formateDecimal(Number(transaction?.amount)) || "N/A"}
                      </td>
                      <td className="px-6 py-4 capitalize">
                        {tableType === "fiat"
                          ? transaction?.kind
                          : transaction?.type}
                      </td>
                      <td className="px-6 py-4 capitalize">
                        {tableType === "fiat"
                          ? transaction?.kind === "deposit"
                            ? `${transaction?.to.slice(
                                0,
                                6
                              )}......${transaction?.to.slice(-6)}`
                            : transaction.to || "N/A"
                          : transaction?.asset_code || "N/A"}
                      </td>

                      <td className="px-6 py-4">
                        <a
                          href={
                            tableType === "fiat"
                              ? transaction?.more_info_url
                              : `https://stellar.expert/explorer/public/tx/${transaction?.transaction_hash}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white underline"
                        >
                          View Details
                        </a>
                      </td>
                      {tableType !== "fiat" && (
                        <td className="px-6 py-4">
                          {new Date(transaction?.created_at).toDateString()}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="flex justify-between mt-4">
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-white">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default TransactionTable;
