import React, { useEffect, useState } from "react";
import { Search, Globe, ArrowUpRight, ArrowRightLeft } from "lucide-react";
import ArrayTableLoader from "../loader/ArrayTableLoader";
import Cookies from "js-cookie";
import { getTransactionHistory } from "../../function/transaction";
import { useNavigate } from "react-router-dom";
import Alert from "../alert/Alert";
import { ArrowUp, ArrowDown } from "lucide-react";

interface TransactionTableProps {
  NumberOfTx?: number;
  isHistoryPage: boolean;
}

type SortDirection = "asc" | "desc";
interface SortConfig {
  key: string;
  direction: SortDirection;
}

const TransactionTable: React.FC<TransactionTableProps> = ({
  NumberOfTx,
  isHistoryPage,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [transactionHistory, setTransactionHistory] = useState<any[]>([]);
  const user = Cookies.get("token");
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [alertType, setAlertType] = useState("");
  const [activateWalletAlert, setActivateWalletAlert] = useState<string>("");
  const [isActivateWalletAlert, setIsActivateWalletAlert] =
    useState<boolean>(false);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  // new filters
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");

  const navigate = useNavigate();

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      navigate("/login");
    }
    handleGetTransactionHistory();
  }, []);

  async function handleGetTransactionHistory() {
    const storedTx = localStorage.getItem("uniqueTransactions");
    const parsedTx = JSON.parse(storedTx || "null");

    if (parsedTx) {
      setTransactionHistory(parsedTx);
    }
    if (!parsedTx) {
      setLoading(true);
    }
    try {
      if (!user) {
        return;
      }
      const response = await getTransactionHistory(user);

      if (!response.success) {
        if (response.message === "Login has expired") {
          localStorage.clear();
          Cookies.remove("token");
          navigate("/login");
        }
        if (
          response.message.includes(
            "Fund your wallet with at least 5 XLM to activate your account."
          )
        ) {
          setActivateWalletAlert(response.message);
          setIsActivateWalletAlert(true);
        } else {
          setMsg(response.message);
          setAlertType("error");
        }
        return;
      }
      console.log(response.data.transactions);

      setTransactionHistory(response.data.transactions);
      localStorage.setItem(
        "uniqueTransactions",
        JSON.stringify(response.data.transactions)
      );
    } catch (error: any) {
      if (error.message === "Login has expired") {
        localStorage.clear();
        Cookies.remove("token");
        navigate("/login");
      }
      if (
        error.message.includes(
          "Fund your wallet with at least 5 XLM to activate your account."
        )
      ) {
        setActivateWalletAlert(error.message);
        setIsActivateWalletAlert(true);
      } else {
        setMsg(error.message || "Failed to get all crypto transactions");
        setAlertType("error");
      }
    } finally {
      setLoading(false);
    }
  }

  const itemsPerPage = 10;

  // Transactions (limited if NumberOfTx given)
  const sourceTransactions = NumberOfTx
    ? (transactionHistory || []).slice(0, NumberOfTx)
    : transactionHistory || [];

  // 🔍 Search + Filters
  const filteredTransactions = sourceTransactions.filter((transaction: any) => {
    const search = searchText.toLowerCase();

    const matchesSearch =
      (transaction?.hash || "").toLowerCase().includes(search) ||
      (transaction?.from || "").toLowerCase().includes(search) ||
      (transaction?.to || "").toLowerCase().includes(search) ||
      (transaction?.tokenReceived || "").toLowerCase().includes(search) ||
      (transaction?.tokenSent || "").toLowerCase().includes(search) ||
      (transaction?.type || "").toLowerCase().includes(search) ||
      String(transaction?.amountReceived || transaction?.amountSent || "")
        .toLowerCase()
        .includes(search);

    const matchesType =
      filterType === "all" ? true : transaction?.type === filterType;

    const matchesDate = filterDate
      ? new Date(transaction?.date).toLocaleDateString() ===
        new Date(filterDate).toLocaleDateString()
      : true;

    return matchesSearch && matchesType && matchesDate;
  });

  // 🔽 Sorting
  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev && prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (!sortConfig) return 0;

    const { key, direction } = sortConfig;
    const order = direction === "asc" ? 1 : -1;

    let aValue = a[key] ?? "";
    let bValue = b[key] ?? "";

    // Special handling for date
    if (key === "date") {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    if (aValue < bValue) return -1 * order;
    if (aValue > bValue) return 1 * order;
    return 0;
  });

  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage) || 1;

  const currentTransactions = sortedTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  const renderSortArrow = (key: string) => {
    const isActive = sortConfig?.key === key;
    const direction = sortConfig?.direction;

    return (
      <span className="inline-flex flex-col ml-2">
        <ArrowUp
          size={9}
          className={
            isActive && direction === "asc"
              ? "text-[#0E7BB2] font-bold"
              : "text-gray-400 dark:text-gray-500"
          }
        />
        <ArrowDown
          size={9}
          className={
            isActive && direction === "desc"
              ? "text-[#0E7BB2] font-bold"
              : "text-gray-400 dark:text-gray-500"
          }
        />
      </span>
    );
  };

  return (
    <>
      {isActivateWalletAlert ? (
        <p className="text-black text-center flex justify-center items-center text-[20px] p-5 bg-red-300 rounded-md my-2">
          {isActivateWalletAlert && activateWalletAlert}
        </p>
      ) : (
        <section className="mt-6 bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg border border-[#E2E4E9] dark:border-gray-700">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold">Recent Transactions</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Display the recent transactions in the table below.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:flex-none">
                <Search
                  className="absolute left-2 top-2.5 text-gray-400 dark:text-gray-500"
                  size={16}
                />
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-8 pr-3 py-2 border focus:outline-0 focus:border-[#0E7BB2]  border-[#E2E4E9] dark:border-gray-700 rounded-lg text-sm w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Search transaction..."
                />
              </div>

              {/* Date filter */}
              <div className="relative">
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className={`px-2 py-2 border focus:outline-0 focus:border-[#0E7BB2] cursor-pointer border-[#E2E4E9] dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 peer
      ${
        !filterDate &&
        "[&::-webkit-datetime-edit]:invisible [&::-webkit-calendar-picker-indicator]:opacity-100"
      }`}
                />
                {!filterDate && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
                    Sort Date
                  </span>
                )}
              </div>

              {/* Type filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-2 py-2 border cursor-pointer focus:outline-0 focus:border-[#0E7BB2] border-[#E2E4E9] dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="all">All</option>
                <option value="send">Send</option>
                <option value="receive">Receive</option>
                <option value="swap">Swap</option>
              </select>

              {!isHistoryPage && (
                <button
                  onClick={() => navigate("/history")}
                  className="px-3 py-2 border border-[#E2E4E9] dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  See All
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500  dark:text-gray-400">
                  <th
                    className="pb-2 cursor-pointer"
                    onClick={() => handleSort("to")}
                  >
                    <div className="flex items-center">
                      <span>To / From </span> {renderSortArrow("to")}
                    </div>
                  </th>
                  <th
                    className="pb-2 cursor-pointer"
                    onClick={() => handleSort("amountSent")}
                  >
                    <div className="flex items-center">
                      <span>Amount </span> {renderSortArrow("amountSent")}
                    </div>
                  </th>
                  <th
                    className="pb-2 cursor-pointer"
                    onClick={() => handleSort("tokenSent")}
                  >
                    <div className="flex items-center">
                      <span>Token </span> {renderSortArrow("tokenSent")}
                    </div>
                  </th>
                  <th
                    className="pb-2 cursor-pointer"
                    onClick={() => handleSort("date")}
                  >
                    <div className="flex items-center">
                      <span>Date & Time</span> {renderSortArrow("date")}
                    </div>
                  </th>
                  <th
                    className="pb-2 cursor-pointer"
                    onClick={() => handleSort("type")}
                  >
                    <div className="flex items-center">
                      <span>Type</span> {renderSortArrow("type")}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 items-center">
                {loading ? (
                  <tr>
                    <ArrayTableLoader number={5} />
                  </tr>
                ) : currentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-400">
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  currentTransactions.map((tx: any, idx: number) => (
                    <tr
                      key={idx}
                      className="hover:bg-gray-50 cursor-pointer dark:hover:bg-gray-700 transition"
                    >
                      {/* From/To */}
                      <td className="py-3 font-medium break-all">
                        {tx.type === "receive" ? (
                          <>
                            From: {tx.from?.slice(0, 6)}...
                            {tx.from?.slice(-6)}
                          </>
                        ) : (
                          <>
                            To: {tx.to?.slice(0, 6)}...
                            {tx.to?.slice(-6)}
                          </>
                        )}
                      </td>

                      {/* Amount */}
                      <td>{tx.amountReceived || tx.amountSent}</td>

                      {/* Token */}
                      <td>{tx.tokenReceived || tx.tokenSent}</td>

                      {/* Date */}
                      <td>{formatDate(tx.date)}</td>

                      {/* Type */}
                      <td className="flex items-center mt-3 gap-1 capitalize">
                        {tx.type.includes("swap") ? (
                          <>
                            <ArrowRightLeft size={14} /> Swap
                          </>
                        ) : tx.type === "receive" ? (
                          <>
                            <Globe size={14} /> Receive
                          </>
                        ) : (
                          <>
                            <ArrowUpRight size={14} /> Send
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-gray-500 dark:text-gray-400">
                Page <span className="font-semibold">{currentPage}</span> of{" "}
                <span className="font-semibold">{totalPages}</span>
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </section>
      )}
      {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
    </>
  );
};

export default TransactionTable;
