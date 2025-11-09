import React, { useEffect, useState } from "react";
import { GoChevronDown } from "react-icons/go";
import TopNav from "../components/top-nav/TopNav";
import Cookies from "js-cookie";
import TransactionTable from "../components/table/TransactionTable";
import { useNavigate } from "react-router-dom";
import { getAllTrustLines, getMyAssets } from "../function/horizonQuery";
import { getProfile } from "../function/user";
import {
  addTrustLine,
  getTransactionHistory,
  removeTrustLine,
} from "../function/transaction";
import {
  formateDecimal,
  formatNumberWithCommas,
  getAssetDisplayName,
  getSpendableBalance,
} from "../utils";
import { Banknote, ArrowRightLeft, Send, Eye, EyeClosed } from "lucide-react";
import { BsBank } from "react-icons/bs";
import { useAppContext } from "../context/useContext";
import { CgAdd, CgRemove } from "react-icons/cg";
import { BiInfoCircle } from "react-icons/bi";
import AddCurrencyModal from "../components/modals/add-currency";
import RemoveCurrencyModal from "../components/modals/remove-currency";

const Dashboard: React.FC = () => {
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [currencyChange, setCurrencyChange] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [isUpdatingBalance, setIsUpdatingBalance] = useState(false);
  const user = Cookies.get("token");
  const [walletAssets, setWalletAssets] = useState<any>();
  const [selectedTrustLine, setSelectedTrustLine] = useState<any>();
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingWalletAssets, setLoadingWalletAssets] =
    useState<boolean>(false);
  const [PUBLIC_ASSETS, setPublic_Assets] = useState<any>([]);
  const [loadingPUBLIC_ASSETS, setLoadingPUBLIC_ASSETS] =
    useState<boolean>(false);

  const assets = [
    { symbol: "NGNC", name: "Nigerian Naira", displaySymbol: "NGN" },
    { symbol: "KHSC", name: "Kenyan Shilling", displaySymbol: "KES" },
    { symbol: "GHSC", name: "Ghanaian Cedi", displaySymbol: "GHS" },
  ];

  const [selectedAsset, setSelectedAsset] = useState<any>();

  // Track ongoing operations for progress indicators
  const [ongoingOperations, setOngoingOperations] = useState<{
    [key: string]: "adding" | "removing";
  }>({});

  // Get selected currency from localStorage or default to NGN
  const getInitialSelectedCurrency = () => {
    const storedCurrency = localStorage.getItem("selectedCurrency");
    return storedCurrency || assets[0].displaySymbol; // Default to NGN
  };

  const [selectedCurrency, setSelectedCurrency] = useState(
    getInitialSelectedCurrency
  );
  const [transactionHistory, setTransactionHistory] = useState<any[]>([]);
  const [convertPrice, setConvertPrice] = useState<any>(0);
  const [searchText, setSearchText] = useState<string>("");
  const [loadingTx, setLoadingTx] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>("");
  const [alertType, setAlertType] = useState<string>("");
  const [activateWalletAlert, setActivateWalletAlert] = useState<string>("");
  const [isActivateWalletAlert, setIsActivateWalletAlert] =
    useState<boolean>(false);
  const [address, setAddress] = useState<string>("");
  const [hasAutoAddedNGNC, setHasAutoAddedNGNC] = useState(false);
  const [isBalanceHidden, setIsBalanceHidden] = useState<boolean>(false);

  // Track available assets in state to ensure reactivity
  const [availableAssets, setAvailableAssets] = useState<string[]>([]);

  // Auto-hide messages after 5 seconds
  useEffect(() => {
    if (msg) {
      const timer = setTimeout(() => {
        setMsg("");
        setAlertType("");
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [msg]);

  const toggleBalanceVisibility = () => {
    const newState = !isBalanceHidden;
    setIsBalanceHidden(newState);
    localStorage.setItem("isBalanceHidden", JSON.stringify(newState));
  };

  useEffect(() => {
    const storedVisibility = localStorage.getItem("isBalanceHidden");
    if (storedVisibility !== null) {
      setIsBalanceHidden(JSON.parse(storedVisibility));
    }
  }, []);

  const {
    setIsAddMoneyModalOpen,
    setIsAddCurrencyModalOpen,
    setIsSendMoneyModalOpen,
    setIsRemoveCurrencyModalOpen,
    isAddCurrencyModalOpen,
    isRemoveCurrencyModalOpen,
    setUserData,
    theme,
  } = useAppContext();

  const navigate = useNavigate();

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      navigate("/login");
    }
    const storedUserData = localStorage.getItem("userData");
    const parsedUserData = JSON.parse(storedUserData || "null");
    setAddress(parsedUserData?.stellarPublicKey || "");
    handleGetProfile();

    // Use the selected currency (from localStorage or default NGN) when loading assets
    handleGetMyAssets(selectedCurrency);
    handleGetAllTrustLines();
    handleGetTransactionHistory();
  }, []);

  // Update available assets whenever walletAssets or PUBLIC_ASSETS change
  useEffect(() => {
    if (walletAssets && PUBLIC_ASSETS) {
      const walletAssetCodes =
        walletAssets?.allWalletAssets?.map((asset: any) => asset?.asset_code) ||
        [];

      const updatedAvailableAssets = Object.keys(PUBLIC_ASSETS)?.filter(
        (key) =>
          !walletAssetCodes?.includes(
            PUBLIC_ASSETS[key]?.code?.toUpperCase()
          ) && PUBLIC_ASSETS[key].code !== "native"
      );

      setAvailableAssets(updatedAvailableAssets || []);
    }
  }, [walletAssets, PUBLIC_ASSETS]);

  // Function to handle currency change and update balances
  const handleCurrencyChange = async (currency: any) => {
    setCurrencyChange(false);

    // Save selected currency to localStorage
    localStorage.setItem("selectedCurrency", currency.displaySymbol);
    setSelectedCurrency(currency.displaySymbol);

    setIsUpdatingBalance(true);

    try {
      await updateBalancesForCurrency(currency.displaySymbol);
    } catch (error) {
      console.error("Failed to update balances:", error);
    } finally {
      setIsUpdatingBalance(false);
    }
  };

  // Function to update balances based on selected currency
  const updateBalancesForCurrency = async (targetCurrency: string) => {
    try {
      if (!user) return;

      const response = await getMyAssets(user, targetCurrency);

      if (response.success) {
        setWalletAssets(response.data);
        setCurrentPrice(
          response.data.allWalletTotalBalanceInSelectedCurrency || 0
        );
        setConvertPrice(response.data.allWalletTotalBalanceInUsd || 0);

        // Update localStorage with new currency data
        localStorage.setItem("walletAssets", JSON.stringify(response.data));
        localStorage.setItem(
          "allWalletTotalBalanceInSelectedCurrency",
          JSON.stringify(response.data.allWalletTotalBalanceInSelectedCurrency)
        );
        localStorage.setItem(
          "allWalletTotalBalanceInUsd",
          JSON.stringify(response.data.allWalletTotalBalanceInUsd)
        );
      }
    } catch (error) {
      console.error("Failed to update balances for currency:", error);
      setMsg("Failed to update currency conversion");
      setAlertType("error");
    }
  };

  const hasNGNC = walletAssets?.allWalletAssets.some(
    (asset: any) => asset?.asset_code === "NGNC"
  );
  const hasXLM = walletAssets?.allWalletAssets.some(
    (asset: any) => asset?.asset_code === "NATIVE"
  );

  // Check if XLM balance is at least 5
  const xlmAsset = walletAssets?.allWalletAssets.find(
    (asset: any) => asset?.asset_code === "NATIVE"
  );
  const xlmBalance = parseFloat(xlmAsset?.balance || 0);

  useEffect(() => {
    const autoAddNGNC = async () => {
      if (walletAssets?.allWalletAssets?.length > 0 && !hasAutoAddedNGNC) {
        const hasNGNC = walletAssets?.allWalletAssets.some(
          (asset: any) => asset?.asset_code === "NGNC"
        );
        const hasXLM = walletAssets?.allWalletAssets.some(
          (asset: any) => asset?.asset_code === "NATIVE"
        );

        // Check if XLM balance is at least 5
        const xlmAsset = walletAssets?.allWalletAssets.find(
          (asset: any) => asset?.asset_code === "NATIVE"
        );
        const xlmBalance = parseFloat(xlmAsset?.balance || 0);

        if (hasXLM && !hasNGNC && user && xlmBalance >= 5) {
          try {
            setLoading(true);
            const response = await addTrustLine("NGNC", user);
            if (response.success) {
              setMsg("NGNC automatically added to your wallet");
              setAlertType("success");
              setHasAutoAddedNGNC(true);
              await handleGetMyAssets(selectedCurrency); // Use current selected currency
              await handleGetAllTrustLines();
            }
          } catch (error: any) {
            console.error("Failed to auto-add NGNC:", error);
            setMsg("Failed to automatically add NGNC");
            setAlertType("error");
          } finally {
            setLoading(false);
          }
        }
      }
    };

    autoAddNGNC();
  }, [walletAssets, user, hasAutoAddedNGNC, selectedCurrency]);

  useEffect(() => {
    const storedAllWalletTotalBalanceInSelectedCurrency = localStorage.getItem(
      "allWalletTotalBalanceInSelectedCurrency"
    );
    const storedAllWalletTotalBalanceInUsd = localStorage.getItem(
      "allWalletTotalBalanceInUsd"
    );
    const parsedAllWalletTotalBalanceInSelectedCurrency = JSON.parse(
      storedAllWalletTotalBalanceInSelectedCurrency || "null"
    );
    const parsedAllWalletTotalBalanceInUsd = JSON.parse(
      storedAllWalletTotalBalanceInUsd || "null"
    );
    setCurrentPrice(parsedAllWalletTotalBalanceInSelectedCurrency || 0);
    setConvertPrice(parsedAllWalletTotalBalanceInUsd || 0);
  }, [walletAssets]);

  async function handleGetMyAssets(currency?: string) {
    // Use the provided currency or the current selected currency
    const selectedCurrencyToUse = currency || selectedCurrency;
    const storedWalletAssets = localStorage.getItem("walletAssets");
    const storedAllWalletTotalBalanceInSelectedCurrency = localStorage.getItem(
      "allWalletTotalBalanceInSelectedCurrency"
    );
    const storedAllWalletTotalBalanceInUsd = localStorage.getItem(
      "allWalletTotalBalanceInUsd"
    );
    const parsedWalletAssets = JSON.parse(storedWalletAssets || "null");
    const parsedAllWalletTotalBalanceInSelectedCurrency = JSON.parse(
      storedAllWalletTotalBalanceInSelectedCurrency || "null"
    );
    const parsedAllWalletTotalBalanceInUsd = JSON.parse(
      storedAllWalletTotalBalanceInUsd || "null"
    );

    if (
      parsedWalletAssets &&
      parsedAllWalletTotalBalanceInSelectedCurrency &&
      parsedAllWalletTotalBalanceInUsd
    ) {
      setWalletAssets(parsedWalletAssets);
      setCurrentPrice(parsedAllWalletTotalBalanceInSelectedCurrency || 0);
      setConvertPrice(parsedAllWalletTotalBalanceInUsd || 0);
    }

    if (
      !parsedWalletAssets ||
      !parsedAllWalletTotalBalanceInSelectedCurrency ||
      !parsedAllWalletTotalBalanceInUsd
    ) {
      setLoadingWalletAssets(true);
    }

    try {
      if (!user) {
        setLoadingWalletAssets(false);
        return;
      }

      const response = await getMyAssets(user, selectedCurrencyToUse);
      if (!response.success) {
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
        setLoadingWalletAssets(false);
        return;
      }

      setWalletAssets(response?.data);
      localStorage.setItem("walletAssets", JSON.stringify(response?.data));
    } catch (error: any) {
      if (
        error.message.includes(
          "Fund your wallet with at least 5 XLM to activate your account."
        )
      ) {
        setActivateWalletAlert(error.message);
        setIsActivateWalletAlert(true);
      } else {
        setMsg(error.message || "Failed to get all wallet assets");
        setAlertType("error");
      }
    } finally {
      setLoadingWalletAssets(false);
    }
  }

  async function handleGetAllTrustLines() {
    const storedPUBLIC_ASSETS = localStorage.getItem("PUBLIC_ASSETS");
    const parsedPUBLIC_ASSETS = JSON.parse(storedPUBLIC_ASSETS || "null");

    if (parsedPUBLIC_ASSETS) {
      setPublic_Assets(parsedPUBLIC_ASSETS);
    }
    if (!parsedPUBLIC_ASSETS) {
      setLoadingPUBLIC_ASSETS(true);
    }

    try {
      if (!user) {
        setLoadingPUBLIC_ASSETS(false);
        return;
      }

      const response = await getAllTrustLines(user);
      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        setLoading(false);
        return;
      }

      setPublic_Assets(response.data.trustLines);
      localStorage.setItem(
        "PUBLIC_ASSETS",
        JSON.stringify(response.data.trustLines)
      );
    } catch (error: any) {
      setMsg(error.message || "Failed to get all trustlines");
      setAlertType("error");
    } finally {
      setLoadingPUBLIC_ASSETS(false);
    }
  }

  async function handleGetProfile() {
    const storedUserData = localStorage.getItem("userData");
    const parsedUserData = JSON.parse(storedUserData || "null");

    if (parsedUserData) {
      setUserData(parsedUserData);
    }
    if (!parsedUserData) {
      setLoadingUserData(true);
    }

    try {
      if (!user) {
        return;
      }

      const response = await getProfile(user);
      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        if (response.message === "Login has expired") {
          localStorage.clear();
          Cookies.remove("token");
          navigate("/login");
        }
      }
      setUserData(response.data);
    } catch (error: any) {
      if (error.message === "Login has expired") {
        localStorage.clear();
        Cookies.remove("token");
        navigate("/login");
      }
      setMsg(error.message || "Failed to fetch profile details");
      setAlertType("error");
    } finally {
      setLoadingUserData(false);
    }
  }

  async function handlRemoveTrustLine() {
    setLoading(true);
    try {
      if (!user) {
        setLoading(false);
        return;
      }

      const removedAssetCode = selectedTrustLine.asset_code;

      // FIX 1: Start progress indicator immediately (before removing from frontend)
      setOngoingOperations((prev) => ({
        ...prev,
        [removedAssetCode]: "removing",
      }));

      // Close modal immediately
      setSelectedTrustLine(null);
      setIsRemoveCurrencyModalOpen(false);

      // Call backend API first
      const response = await removeTrustLine(removedAssetCode, user);

      if (!response.success) {
        setMsg(`Failed to remove ${removedAssetCode}: ${response.message}`);
        setAlertType("error");
        // Remove progress indicator on failure
        setOngoingOperations((prev) => {
          const newOps = { ...prev };
          delete newOps[removedAssetCode];
          return newOps;
        });
        return;
      }

      // Only update frontend after successful backend removal
      const updatedWalletAssets = {
        ...walletAssets,
        allWalletAssets:
          walletAssets?.allWalletAssets?.filter(
            (asset: any) => asset?.asset_code !== removedAssetCode
          ) || [],
      };

      setWalletAssets(updatedWalletAssets);
      localStorage.setItem("walletAssets", JSON.stringify(updatedWalletAssets));

      // Update available assets
      setAvailableAssets((prev) => {
        const newAvailableAssets = [...prev, removedAssetCode];
        return newAvailableAssets;
      });

      setMsg(`${removedAssetCode} removed from your wallet`);
      setAlertType("success");

      // Remove progress indicator
      setOngoingOperations((prev) => {
        const newOps = { ...prev };
        delete newOps[removedAssetCode];
        return newOps;
      });

      // Refresh data to ensure consistency
      await handleGetMyAssets(selectedCurrency);
      await handleGetAllTrustLines();
      await handleGetTransactionHistory();
    } catch (error: any) {
      console.error("Failed to remove trustline:", error);
      setMsg(`Failed to remove asset: ${error.message}`);
      setAlertType("error");
      // Remove progress indicator on error
      const removedAssetCode = selectedTrustLine.asset_code;
      setOngoingOperations((prev) => {
        const newOps = { ...prev };
        delete newOps[removedAssetCode];
        return newOps;
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleAddTrustLine(selectedAsset?: any) {
    setLoading(true);
    try {
      if (!user) {
        setMsg("Please log in to add assets");
        setAlertType("error");
        setLoading(false);
        return;
      }

      if (
        !selectedAsset ||
        (!selectedAsset.code && !selectedAsset.asset_code)
      ) {
        setMsg("Please select a valid asset");
        setAlertType("error");
        setLoading(false);
        return;
      }

      const assetCode = selectedAsset?.code || selectedAsset?.asset_code;

      if (!assetCode || typeof assetCode !== "string") {
        setMsg("Invalid asset selected");
        setAlertType("error");
        setLoading(false);
        return;
      }

      if (!PUBLIC_ASSETS[assetCode]) {
        setMsg("Selected asset is not available");
        setAlertType("error");
        setLoading(false);
        return;
      }

      // FIX: Start progress indicator and update UI immediately
      setOngoingOperations((prev) => ({
        ...prev,
        [assetCode]: "adding",
      }));

      // FIX: Create the new asset object immediately for optimistic UI update
      const newAsset = {
        asset_code: assetCode,
        asset_name: PUBLIC_ASSETS[assetCode]?.name || assetCode,
        balance: "0",
        equivalentBalanceInUsd: "0",
        image:
          PUBLIC_ASSETS[assetCode]?.image || "./images/default-currency.png",
      };

      // FIX: Update wallet assets optimistically immediately
      const updatedWalletAssets = {
        ...walletAssets,
        allWalletAssets: [...(walletAssets?.allWalletAssets || []), newAsset],
      };

      setWalletAssets(updatedWalletAssets);
      localStorage.setItem("walletAssets", JSON.stringify(updatedWalletAssets));

      // FIX: Update available assets immediately
      setAvailableAssets((prev) => prev.filter((code) => code !== assetCode));

      // Close modal after UI update
      setSelectedAsset(null);
      setIsAddCurrencyModalOpen(false);

      // Then make the backend call
      const response = await addTrustLine(assetCode, user);

      if (!response.success) {
        // If backend fails, revert the optimistic update
        setWalletAssets(walletAssets); // Revert to previous state
        setAvailableAssets((prev) => [...prev, assetCode]); // Add back to available
        setMsg(`Failed to add ${assetCode}: ${response.message}`);
        setAlertType("error");
      } else {
        setMsg(`${assetCode} added to your wallet`);
        setAlertType("success");

        // Refresh data to ensure consistency with backend
        await handleGetMyAssets(selectedCurrency);
        await handleGetAllTrustLines();
        await handleGetTransactionHistory();
      }

      // Remove progress indicator regardless of outcome
      setOngoingOperations((prev) => {
        const newOps = { ...prev };
        delete newOps[assetCode];
        return newOps;
      });
    } catch (error: any) {
      console.error("Failed to add trustline:", error);

      // Revert optimistic updates on error
      const assetCode = selectedAsset?.code || selectedAsset?.asset_code;
      if (assetCode) {
        setWalletAssets(walletAssets);
        setAvailableAssets((prev) => [...prev, assetCode]);
        setOngoingOperations((prev) => {
          const newOps = { ...prev };
          delete newOps[assetCode];
          return newOps;
        });
      }

      setMsg(`Failed to add asset: ${error.message}`);
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleGetTransactionHistory() {
    const storedTx = localStorage.getItem("uniqueTransactions");
    const parsedTx = JSON.parse(storedTx || "null");

    if (parsedTx) {
      setTransactionHistory(parsedTx);
    }
    if (!parsedTx) {
      setLoadingTx(true);
    }

    try {
      if (!user) {
        setLoadingTx(false);
        return;
      }

      const response = await getTransactionHistory(user);
      if (!response.success) {
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
        setLoadingTx(false);
        return;
      }

      const uniqueTransactions = Array.from(
        new Map(
          response.data.transactions.map((item: any) => [
            item.transaction_hash,
            item,
          ])
        ).values()
      );
      setTransactionHistory(uniqueTransactions);
    } catch (error: any) {
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
      setLoadingTx(false);
    }
  }

  const walletAssetCodes =
    walletAssets?.allWalletAssets?.map((asset: any) => asset?.asset_code) || [];

  const removableAssets = walletAssets?.allWalletAssets?.filter(
    (asset: any) => asset?.asset_code !== "NATIVE"
  );
  const allAssets: any[] = walletAssets?.allWalletAssets || [];

  // Loading skeleton for balance
  const BalanceSkeleton = () => (
    <div className="flex flex-col gap-2">
      <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      <div className="h-12 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
    </div>
  );

  // Loading skeleton for asset cards
  const AssetCardSkeleton = () => (
    <div className="p-4 md:p-6 rounded-lg border border-[#D9D9D9] dark:border-gray-700 flex flex-col gap-4">
      {/* Asset Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
      </div>

      {/* Asset Balance Skeleton */}
      <div className="flex mt-[50px] py-[20px] justify-center items-center">
        <div className="flex flex-col gap-2 items-center">
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      </div>

      {/* Action Button Skeleton */}
      <div className="flex justify-end">
        <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>
    </div>
  );

  // Loading skeleton for action buttons
  const ActionButtonSkeleton = () => (
    <div className="flex flex-wrap justify-center gap-3">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="px-4 py-3 flex items-center gap-2 text-sm bg-white dark:bg-gray-800 border border-[#D9D9D9] dark:border-gray-700 rounded-lg"
        >
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      ))}
    </div>
  );

  // Function to check if asset can be removed
  const canRemoveAsset = (asset: any) => {
    // Don't show remove button for XLM (NATIVE) or default assets
    return (
      asset?.asset_code?.toUpperCase() !== "NATIVE" &&
      !asset?.isDefault &&
      asset?.asset_code?.toUpperCase() !== "NGNC"
    );
  };

  return (
    <>
      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 text-gray-900 dark:text-gray-100">
        <TopNav page="Dashboard" />

        {msg ===
          " Fund your wallet with at least 5 XLM to activate your account" ||
        msg ===
          "Account Inactive. This wallet needs a minimum balance of 5 XLM to be created on the network. Activate your account to continue." ? (
          <button
            onClick={() => setIsAddMoneyModalOpen(true)}
            className={`mb-4 underline rounded-lg text-center text-[#0E7BB2]`}
          >
            Account Inactive. This wallet needs a minimum balance of 5 XLM to be
            created on the network. Activate your account to continue.
          </button>
        ) : null}

        {/* Auto-hiding alert messages - REMOVED SUCCESS MESSAGES */}
        {msg &&
          alertType === "error" &&
          msg !==
            "Account Inactive. This wallet needs a minimum balance of 5 XLM to be created on the network. Activate your account to continue." && (
            <div
              className={`mb-4 p-4 rounded-lg text-center ${
                alertType !== "error"
                  ? "bg-[#0E7BB2] text-[#0a143f]"
                  : "bg-[#b04242] text-[#5d0d0d]"
              }`}
            >
              {msg}
            </div>
          )}

        {/* Balances */}
        <section className="mt-6 bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg border border-[#D9D9D9] dark:border-gray-700">
          {/* Balance Card */}
          <div className="w-full bg-white dark:bg-gray-800 p-6 md:p-8 mb-6">
            {/* Top Controls */}
            <div className="flex justify-between items-start mb-6">
              {/* Left Side: Title + Main Balance */}
              <div className="flex flex-col gap-2">
                {loadingWalletAssets ? (
                  <BalanceSkeleton />
                ) : (
                  <>
                    <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
                      TOTAL AVAILABLE BALANCE
                    </h3>

                    {/* Main Balance */}
                    <div className="flex items-center gap-2">
                      <p className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white">
                        {selectedCurrency}{" "}
                        {isBalanceHidden
                          ? "•••••••"
                          : formatNumberWithCommas(currentPrice?.toFixed(2)) ||
                            "0.00"}
                      </p>
                      {isUpdatingBalance && (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                      )}
                    </div>

                    {/* Equivalent in USD - Always shows USD */}
                    <p className="text-sm md:text-base text-gray-500 dark:text-gray-300">
                      ≈{" "}
                      {isBalanceHidden
                        ? "•••••••"
                        : formatNumberWithCommas(convertPrice?.toFixed(2)) ||
                          "0.00"}{" "}
                      USD
                    </p>
                  </>
                )}
              </div>

              {/* Right Side: Eye + Currency Selector */}
              <div className="flex items-center gap-3 mt-1">
                <button
                  onClick={toggleBalanceVisibility}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition"
                >
                  {isBalanceHidden ? <EyeClosed /> : <Eye />}
                </button>

                <div className="relative">
                  <span
                    className="inline-flex items-center text-sm md:text-base font-semibold text-gray-900 dark:text-white cursor-pointer px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    onClick={() => setCurrencyChange(!currencyChange)}
                  >
                    {selectedCurrency} <GoChevronDown className="ml-1" />
                  </span>

                  {currencyChange && (
                    <div className="absolute top-full mt-1 right-0 w-max bg-white dark:bg-gray-800 border border-[#E2E4E9] dark:border-gray-700 rounded shadow z-50">
                      {assets.map((currency, index) => (
                        <p
                          key={index}
                          className="px-4 py-2 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer whitespace-nowrap transition"
                          onClick={() => handleCurrencyChange(currency)}
                        >
                          {currency.displaySymbol}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Assets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 mb-6">
              {loadingWalletAssets ? (
                // Show skeleton loaders when loading
                <>
                  <AssetCardSkeleton />
                  <AssetCardSkeleton />
                </>
              ) : (
                (() => {
                  const shouldShowDefaults =
                    allAssets.length === 0 ||
                    (allAssets.length === 1 &&
                      allAssets[0]?.asset_code === "NATIVE");

                  let displayAssets = allAssets;

                  if (shouldShowDefaults) {
                    const defaultNGNC = {
                      asset_name: "NGNC",
                      asset_code: "NGNC",
                      image: "./images/nigeria.png",
                      balance: "0",
                      equivalentBalanceInUsd: "0",
                      isDefault: true,
                    };

                    const defaultXLM = allAssets.find(
                      (asset) => asset?.asset_code === "NATIVE"
                    ) || {
                      asset_name: "Lumens",
                      asset_code: "NATIVE",
                      image: "./images/stellar.png",
                      balance: "0",
                      equivalentBalanceInUsd: "0",
                      isDefault: true,
                    };

                    displayAssets = [defaultXLM, defaultNGNC];
                  }

                  return displayAssets.map((asset: any, index: number) => {
                    const assetCode = asset.asset_code;
                    const isBeingAdded =
                      ongoingOperations[assetCode] === "adding";
                    const isBeingRemoved =
                      ongoingOperations[assetCode] === "removing";

                    return (
                      <div
                        key={index}
                        style={{
                          backgroundImage:
                            "url(./images/vector-line.svg), url(./images/vector-line.svg)",
                          backgroundRepeat: "no-repeat, no-repeat",
                          backgroundPosition:
                            "right 0px top -10px, right -60px top 20px",
                          backgroundSize: "auto, auto",
                        }}
                        className="p-4 md:p-6 rounded-lg border border-[#D9D9D9] dark:border-gray-700 flex flex-col gap-4 relative"
                      >
                        {/* Progress Overlay */}
                        {(isBeingAdded || isBeingRemoved) && (
                          <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 rounded-lg flex items-center justify-center z-10">
                            <div className="text-center">
                              <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                              <p className="text-sm font-medium">
                                {isBeingAdded ? "Adding..." : "Removing..."}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Asset Header */}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center p-3 gap-2 bg-[#E7F1F7] dark:bg-gray-700 rounded-full text-sm">
                            <img
                              src={
                                asset.asset_code === "NGNC"
                                  ? "./images/nigeria.png"
                                  : asset.asset_code === "NATIVE"
                                  ? "./images/stellar.png"
                                  : asset?.image
                              }
                              alt={getAssetDisplayName(asset?.asset_code)}
                              className="w-5 h-5 rounded-full"
                            />
                            <span>
                              {getAssetDisplayName(asset?.asset_code)}
                            </span>
                          </div>
                          <button className="bg-[#E7F1F7] dark:bg-gray-700 p-3 rounded-full">
                            <BsBank
                              className="text-gray-900 cursor-pointer dark:text-gray-100"
                              size={16}
                            />
                          </button>
                        </div>

                        {/* Asset Balance */}
                        <div className="flex mt-[50px] py-[20px] justify-center items-center">
                          <div>
                            <div className="flex gap-2 text-center">
                              <p className="text-sm text-black dark:text-gray-400">
                                Available{" "}
                                {asset?.asset_code === "NATIVE"
                                  ? "XLM"
                                  : asset?.asset_code?.replace(/c/gi, "")}{" "}
                                balance
                              </p>
                              <BiInfoCircle
                                title={`${getAssetDisplayName(
                                  asset?.asset_code
                                )} balance`}
                                className="cursor-pointer"
                              />
                            </div>

                            <p className="text-2xl text-[#1E1E1E] dark:text-gray-400 text-center font-bold">
                              {getAssetDisplayName(asset?.asset_code)}{" "}
                              {formateDecimal(getSpendableBalance(asset) || 0)}
                            </p>
                            <p className="text-sm text-center text-[#1E1E1E] dark:text-gray-300">
                              $
                              {formateDecimal(
                                asset?.equivalentBalanceInUsd || 0
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Remove Currency Button - Only show for removable assets */}
                        <div className="flex justify-end items-center">
                          {canRemoveAsset(asset) && (
                            <button
                              onClick={() => {
                                setSelectedTrustLine(asset);
                                setIsRemoveCurrencyModalOpen(true);
                              }}
                              className="bg-[#E7F1F7] flex items-center gap-2 ri dark:bg-gray-700 p-3 rounded-full"
                              disabled={isBeingAdded || isBeingRemoved}
                            >
                              <span className="text-[12px]">
                                Remove Currency
                              </span>
                              <CgRemove
                                className="text-gray-900 cursor-pointer dark:text-gray-100"
                                size={16}
                              />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap justify-center gap-3">
              {loadingWalletAssets ? (
                <ActionButtonSkeleton />
              ) : msg ===
                  " Fund your wallet with at least 5 XLM to activate your account" ||
                msg ===
                  "Account Inactive. This wallet needs a minimum balance of 5 XLM to be created on the network. Activate your account to continue." ? (
                <button
                  onClick={() => setIsAddMoneyModalOpen(true)}
                  className="px-4 py-3 flex items-center gap-2 text-sm bg-white dark:bg-gray-800 border border-[#D9D9D9] dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  Activate Account
                </button>
              ) : (
                <>
                  {availableAssets?.length > 0 && (
                    <button
                      onClick={() => setIsAddCurrencyModalOpen(true)}
                      className="px-4 py-3 flex items-center gap-2 text-sm bg-white dark:bg-gray-800 border border-[#D9D9D9] dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    >
                      Add Currency <Banknote size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => setIsAddMoneyModalOpen(true)}
                    className="px-4 py-3 flex items-center gap-2 text-sm bg-white dark:bg-gray-800 border border-[#D9D9D9] dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    Add Money <CgAdd size={16} />
                  </button>
                  <button
                    onClick={() => setIsSendMoneyModalOpen(true)}
                    className="px-4 py-3 flex items-center gap-2 text-sm bg-white dark:bg-gray-800 border border-[#D9D9D9] dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    Send Money <Send size={16} />
                  </button>
                  <button
                    onClick={() => navigate("/swap")}
                    className="px-4 py-3 flex items-center gap-2 text-sm bg-white dark:bg-gray-800 border border-[#D9D9D9] dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    <ArrowRightLeft size={16} /> Convert Funds
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Transactions */}
        <TransactionTable NumberOfTx={3} isHistoryPage={false} />
      </main>

      {isAddCurrencyModalOpen && availableAssets?.length > 0 && (
        <AddCurrencyModal
          loadingPUBLIC_ASSETS={loadingPUBLIC_ASSETS}
          PUBLIC_ASSETS={PUBLIC_ASSETS}
          availableAssets={availableAssets}
          handleAddTrustLine={handleAddTrustLine}
          loading={loading}
          setIsAddCurrencyModalOpen={setIsAddCurrencyModalOpen}
        />
      )}

      {isRemoveCurrencyModalOpen && selectedTrustLine && (
        <RemoveCurrencyModal
          selectedTrustLine={selectedTrustLine}
          handlRemoveTrustLine={handlRemoveTrustLine}
          loading={loading}
        />
      )}
    </>
  );
};

export default Dashboard;
