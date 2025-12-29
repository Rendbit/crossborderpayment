import React, { useEffect, useState } from "react";
import {
  Search,
  CopyIcon,
  EyeIcon,
} from "lucide-react";
import Cookies from "js-cookie";
import { getPaymentRequestHistory } from "../../function/transaction";
import { useNavigate } from "react-router-dom";
import Alert from "../alert/Alert";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useAppContext } from "../../context/useContext";
import { LiaTelegramPlane } from "react-icons/lia";

interface TransactionTableProps {
  NumberOfTx?: number;
  isHistoryPage: boolean;
}

type SortDirection = "asc" | "desc";
interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface PaginationInfo {
  next: string | null;
  prev: string | null;
  count: number;
  cursor: string | null;
}

const RequestPaymentTable: React.FC<TransactionTableProps> = ({
  NumberOfTx,
  isHistoryPage,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [paymentRequestHistory, setPaymentRequestHistory] = useState<any[]>([]);
  const [paginationInfo, setPaginationInfo] = useState<PaginationInfo>({
    next: null,
    prev: null,
    count: 0,
    cursor: null,
  });
  const user = Cookies.get("token");
  const loggedInUser =  JSON.parse(localStorage.getItem("userData") || "{}");
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false); // New state for page navigation loading
  const [msg, setMsg] = useState("");
  const [alertType, setAlertType] = useState("");
  const [activateWalletAlert, setActivateWalletAlert] = useState<string>("");
  const [isActivateWalletAlert, setIsActivateWalletAlert] =
    useState<boolean>(false);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const { setIsRequestPaymentModalOpen } = useAppContext();

  // Pagination state
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [pageCursors, setPageCursors] = useState<{
    [key: number]: string | null;
  }>({ 1: null });

  // new filters
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");

  const navigate = useNavigate();

  // Items per page - fixed to 10
  const itemsPerPage = 10;

  // Load transactions from localStorage on component mount
  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      navigate("/login");
      return;
    }

    // Try to load from localStorage first
    const cachedPaymentRequestHistory = localStorage.getItem("uniquePaymentRequestHistory");
    const cachedPagination = localStorage.getItem("transactionPagination");

    if (cachedPaymentRequestHistory) {
      try {
        const transactions = JSON.parse(cachedPaymentRequestHistory);
        if (!isHistoryPage && NumberOfTx) {
          setPaymentRequestHistory(transactions.slice(0, NumberOfTx));
        } else {
          setPaymentRequestHistory(transactions);
        }

        if (cachedPagination) {
          const pagination = JSON.parse(cachedPagination);
          setPaginationInfo(pagination);
          if (pagination.count > 0) {
            const calculatedTotalPages = Math.ceil(
              pagination.count / itemsPerPage
            );
            setTotalPages(calculatedTotalPages);
          }
        }

        setInitialLoading(false);
      } catch (error) {
        console.error("Error parsing cached transactions:", error);
        // If parsing fails, clear corrupted data
        localStorage.removeItem("uniquePaymentRequestHistory");
        localStorage.removeItem("transactionPagination");
      }
    }

    // Always fetch fresh data
    handleGetpaymentRequestHistory();
  }, []);

  // Function to load transactions with pagination
  async function handleGetpaymentRequestHistory(
    cursor?: string | null,
    direction: "next" | "prev" = "next",
    targetPage?: number
  ) {
    try {
      if (!user) {
        return;
      }

      // Set loading states based on context
      if (!paymentRequestHistory.length) {
        setInitialLoading(true);
      } else {
        setPageLoading(true); // Show skeleton for page navigation
      }
      setLoading(true);

      const response = await getPaymentRequestHistory(user, itemsPerPage, cursor);

      if (!response.success) {
        if (response.message === "Login has expired") {
          localStorage.clear();
          Cookies.remove("token");
          navigate("/login");
          return;
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

      const transactions = response.data.paymentRequests;
      const paging = response.data.paging;

      // Update transaction history
      if (!isHistoryPage && NumberOfTx) {
        setPaymentRequestHistory(transactions.slice(0, NumberOfTx));
      } else {
        setPaymentRequestHistory(transactions);
      }

      // Update pagination info
      const newPaginationInfo = {
        next: paging.next,
        prev: paging.prev,
        count: paging.count,
        cursor: paging.cursor,
      };

      setPaginationInfo(newPaginationInfo);

      // Calculate total pages based on count
      if (paging.count > 0) {
        const calculatedTotalPages = Math.ceil(paging.count / itemsPerPage);
        setTotalPages(calculatedTotalPages);
      }

      // Update cursor stack for back navigation
      if (direction === "next" && currentCursor) {
        setCursorStack((prev) => [...prev, currentCursor]);
      }

      // Store cursor for this page
      if (targetPage) {
        setPageCursors((prev) => ({
          ...prev,
          [targetPage]: cursor || null,
        }));
      } else if (direction === "next") {
        const newPage = currentPage + 1;
        setPageCursors((prev) => ({
          ...prev,
          [newPage]: cursor || null,
        }));
      }

      // Store in localStorage for caching
      localStorage.setItem("uniquePaymentRequestHistory", JSON.stringify(transactions));
      localStorage.setItem(
        "transactionPagination",
        JSON.stringify(newPaginationInfo)
      );
    } catch (error: any) {
      if (error.message === "Login has expired") {
        localStorage.clear();
        Cookies.remove("token");
        navigate("/login");
        return;
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
      setInitialLoading(false);
      setPageLoading(false);
    }
  }

  // Handle next page
  const handleNextPage = () => {
    if (paginationInfo.next) {
      setCurrentCursor(paginationInfo.next);
      handleGetpaymentRequestHistory(paginationInfo.next, "next");
      setCurrentPage((prev) => prev + 1);
    }
  };

  // Handle previous page
  const handlePrevPage = () => {
    if (cursorStack.length > 0) {
      const prevCursor = cursorStack[cursorStack.length - 1];
      const newStack = cursorStack.slice(0, -1);

      setCursorStack(newStack);
      setCurrentCursor(prevCursor || null);
      handleGetpaymentRequestHistory(prevCursor, "prev");
      setCurrentPage((prev) => prev - 1);
    }
  };

  // Handle direct page navigation
  const handlePageClick = (pageNumber: number) => {
    if (pageNumber === currentPage) return;

    // If we already have the cursor for this page, use it
    if (pageCursors[pageNumber] !== undefined) {
      setCurrentCursor(pageCursors[pageNumber]);
      handleGetpaymentRequestHistory(pageCursors[pageNumber], "next", pageNumber);
      setCurrentPage(pageNumber);
    } else {
      console.warn(
        "Cannot jump to page",
        pageNumber,
        " - cursor not available"
      );
    }
  };

  // Generate page numbers for pagination - simplified style: < 1 2 3 ... last >
  const generatePageNumbers = () => {
    const pages: any = [];

    // If totalPages is 1 or less, just show current page
    if (totalPages <= 1) {
      pages.push(1);
      return pages;
    }

    // Always show first 3 pages
    for (let i = 1; i <= Math.min(3, totalPages); i++) {
      pages.push(i);
    }

    // Add ellipsis if there are more than 3 pages
    if (totalPages > 3) {
      pages.push("...");
      // Add last page
      pages.push(totalPages);
    }

    return pages;
  };

  // Search and filter functions (client-side for current page)
  const filteredTransactions = paymentRequestHistory?.filter((transaction: any) => {
    const search = searchText.toLowerCase();

    const matchesSearch =
      (transaction?.hash || "").toLowerCase()?.includes(search) ||
      (transaction?.fromUser?.primaryEmail || "").toLowerCase()?.includes(search) ||
      (transaction?.toUser?.primaryEmail || "").toLowerCase()?.includes(search) ||
      (transaction?.fromUser?.username || "").toLowerCase()?.includes(search) ||
      (transaction?.toUser?.username || "").toLowerCase()?.includes(search) ||
      (transaction?.tokenReceived || "").toLowerCase()?.includes(search) ||
      (transaction?.tokenSent || "")?.toLowerCase()?.includes(search) ||
      (transaction?.currency || "")?.toLowerCase()?.includes(search) ||
      (transaction?.status || "")?.toLowerCase()?.includes(search) ||
      String(transaction?.amount || "")
        .toLowerCase()
        .includes(search);

    // Filter by type based on logged-in user's email
    let matchesType = true;
    if (filterType !== "all") {
      const userEmail = loggedInUser?.primaryEmail?.toLowerCase();
      const fromEmail = transaction?.fromUser?.primaryEmail?.toLowerCase();
      
      if (filterType === "sent") {
        // Show transactions where user is the sender
        matchesType = fromEmail === userEmail;
      } else if (filterType === "received") {
        // Show transactions where user is NOT the sender (i.e., received from others)
        matchesType = fromEmail !== userEmail;
      }
    }

    const matchesDate = filterDate
      ? new Date(transaction?.createdAt)?.toLocaleDateString() ===
        new Date(filterDate)?.toLocaleDateString()
      : true;

    return matchesSearch && matchesType && matchesDate;
  });

  // Sorting (client-side for current page)
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

  // Reset pagination when filters change
  useEffect(() => {
    if (searchText || filterType !== "all" || filterDate) {
      setCurrentPage(1);
    }
  }, [searchText, filterType, filterDate]);

  // Determine which transactions to display
  const displayTransactions =
    searchText || filterType !== "all" || filterDate
      ? sortedTransactions.slice(0, itemsPerPage)
      : sortedTransactions;

  // Calculate showing range
  const getShowingRange = () => {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, paginationInfo.count);
    return { startItem, endItem };
  };

  const { startItem, endItem } = getShowingRange();

  const handleCopyLink = (requestId) => {
    const link = `${window.location.origin}/#/pay/${requestId}`;
    navigator.clipboard.writeText(link).then(() => {
      setMsg("Link copied to clipboard!");
      setAlertType("success");
    });
  };

  return (
    <>
      <section className="mt-6 bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg border border-[#E2E4E9] dark:border-gray-700">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold">Request Payment</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {paginationInfo.count > 0 ? (
                <>
                  Showing {startItem}-{endItem} of {paginationInfo.count}{" "}
                  payment requests
                  {isHistoryPage && ` • Page ${currentPage} of ${totalPages}`}
                </>
              ) : (
                "No payment requests found"
              )}
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
                placeholder="Search payment request..."
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
              <option value="sent">Sent</option>
              <option value="received">Received</option>
            </select>

            <button
                onClick={() => setIsRequestPaymentModalOpen(true)}
                className="px-3 py-2 border border-[#E2E4E9] bg-[#0E7BB2] dark:border-gray-700 rounded-lg text-sm hover:bg-[#0B5E8C] text-white"
              >
                New Request
            </button>

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
                  onClick={() => handleSort("currency")}
                >
                  <div className="flex items-center">
                    <span>Currency</span> {renderSortArrow("currency")}
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
                  onClick={() => handleSort("date")}
                >
                  <div className="flex items-center">
                    <span>Expiry Date & Time</span> {renderSortArrow("date")}
                  </div>
                </th>
                <th
                  className="pb-2 cursor-pointer"
                  onClick={() => handleSort("type")}
                >
                  <div className="flex items-center">
                    <span>Status</span> {renderSortArrow("type")}
                  </div>
                </th>
                <th
                  className="pb-2 cursor-pointer"
                  onClick={() => handleSort("type")}
                >
                  <div className="flex items-center">
                    <span>View</span> {renderSortArrow("type")}
                  </div>
                </th>
                <th
                  className="pb-2 cursor-pointer"
                  onClick={() => handleSort("type")}
                >
                  <div className="flex items-center">
                    <span>Copy Link</span> {renderSortArrow("type")}
                  </div>
                </th>
                <th
                  className="pb-2 cursor-pointer"
                  onClick={() => handleSort("type")}
                >
                  <div className="flex items-center">
                    <span>Prcess Payment</span> {renderSortArrow("type")}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 items-center">
              {initialLoading || pageLoading ? (
                // Show 10 skeleton rows on initial load or page navigation
                Array.from({ length: 10 }).map((_, index) => (
                  <tr key={`skeleton-${index}`}>
                    <td className="py-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </td>
                    <td className="py-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </td>
                    <td className="py-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </td>
                    <td className="py-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </td>
                    <td className="py-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </td>
                    <td className="py-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </td>
                  </tr>
                ))
              ) : displayTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400">
                    No records found.
                  </td>
                </tr>
              ) : (
                displayTransactions.map((tx: any, idx: number) => (
                  <tr
                    key={`${tx.hash}-${idx}`}
                    className="hover:bg-gray-50 cursor-pointer dark:hover:bg-gray-700 transition"
                  >
                    {/* From/To */}
                    <td className="py-3 font-medium break-all">
                      {tx?.type === "receive" ? (
                        <>
                          From: {tx?.fromUser?.username?.slice(0, 6)}...
                          {tx?.fromUser?.username?.slice(-6)}
                        </>
                      ) : (
                        <>
                          To: {tx?.toUser?.username?.slice(0, 6)}...
                          {tx?.toUser?.username?.slice(-6)}
                        </>
                      )}
                    </td>

                    {/* Currency */}
                    <td>{tx?.currency}</td>

                    {/* Amount */}
                    <td>{tx?.amount || tx?.amount || tx?.fee}</td>

                    {/* Token */}
                    {/* <td>{tx?.tokenReceived || tx?.tokenSent}</td> */}

                    {/* Hash */}
                    <td>{formatDate(tx?.expiresAt)}</td>

                    {/* Status */}
                    <td className="capitalize">{tx?.status}</td>

                    {/* Link */}
                    <td className="capitalize">
                      <EyeIcon onClick={() => navigate(`/edit-request-payment/${tx.requestId}`)} className="w-4 h-4 text-gray-500 dark:text-gray-400 cursor-pointer" />
                    </td>

                    <td className="capitalize">
                      <CopyIcon onClick={() => handleCopyLink(tx?.requestId)} className="w-4 h-4 text-gray-500 dark:text-gray-400 cursor-pointer" />
                    </td>

                    <td className="capitalize">
                      <LiaTelegramPlane onClick={() => navigate(`/pay/${tx.requestId}`)} className="w-4 h-4 text-gray-500 dark:text-gray-400 cursor-pointer" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {(paginationInfo.next || cursorStack.length > 0 || totalPages > 1) &&
          isHistoryPage && (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
              {/* Page Info */}
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {paginationInfo.count > 0 && (
                  <>
                    Showing {startItem}-{endItem} of {paginationInfo.count}{" "}
                    transactions
                  </>
                )}
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center space-x-1">
                {/* Previous Arrow */}
                <button
                  onClick={handlePrevPage}
                  disabled={cursorStack.length === 0 || pageLoading}
                  className={`flex items-center justify-center w-8 h-8 rounded-md ${
                    cursorStack.length === 0 || pageLoading
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  &lt;
                </button>

                {/* Page Numbers - Simplified: < 1 2 3 ... last > */}
                {generatePageNumbers().map((page, index) => (
                  <button
                    key={index}
                    onClick={() =>
                      typeof page === "number" && handlePageClick(page)
                    }
                    disabled={page === "..." || pageLoading}
                    className={`min-w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-all ${
                      page === currentPage
                        ? "bg-[#0E7BB2] text-white"
                        : page === "..."
                        ? "cursor-default text-gray-500"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    } ${pageLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {page}
                  </button>
                ))}

                {/* Next Arrow */}
                <button
                  onClick={handleNextPage}
                  disabled={!paginationInfo.next || pageLoading}
                  className={`flex items-center justify-center w-8 h-8 rounded-md ${
                    !paginationInfo.next || pageLoading
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  &gt;
                </button>
              </div>

              {/* Current Page Indicator */}
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </div>
            </div>
          )}
      </section>
      {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
    </>
  );
};

export default RequestPaymentTable;