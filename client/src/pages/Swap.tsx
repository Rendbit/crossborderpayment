import React, { useEffect, useRef, useState } from "react";
import EmptyTopNav from "../components/top-nav/EmptyTopNav";
import { FaExchangeAlt } from "react-icons/fa";
import { getMyAssets } from "../function/horizonQuery";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import { swapAssets, swapAssetsPreview } from "../function/transaction";
import {
  formateDecimal,
  getAssetDisplayName,
  getMinimumSwapAmount,
  getSpendableBalance,
  labelFor,
} from "../utils";
import Alert from "../components/alert/Alert";
import TransactionConfirmationModal from "../components/modals/transaction-confirmation";
import { useAppContext } from "../context/useContext";

const Swap: React.FC = () => {
  const user = Cookies.get("token");
  const {
    setIsRemoveTransactionConfirmationModalOpen,
    isRemoveTransactionConfirmationModalOpen,
  } = useAppContext();

  // DATA
  const [assets, setAssets] = useState<any>(null);
  const [loadingWalletAssets, setLoadingWalletAssets] = useState<boolean>(true);

  // SELECTIONS
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [selectedAssetReceive, setSelectedAssetReceive] = useState<any>(null);

  // BALANCE & AMOUNTS
  const [currentBalance, setCurrentbalance] = useState<number>(0);
  const [sourceAmount, setSourceAmount] = useState<string>("");
  const [descAmount, setDescAmount] = useState<string>("");
  const [rateExchange, setExchangeRate] = useState<string>("");

  // PREVIEW/SWAP
  const [swapAssetPreview, setSwapAssetPreview] = useState<any>(null);
  const [next, setNext] = useState<boolean>(false);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [loadingSwap, setLoadingSwap] = useState<boolean>(false);

  // UI
  const [msg, setMsg] = useState<string>("");
  const [alertType, setAlertType] = useState<"" | "error" | "success">("");
  const [slippage, setSlippage] = useState<number>(2.75);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const navigate = useNavigate();

  // -------- Helpers --------
  const formatNumberWithCommas = (number: number | string): string =>
    Number(number).toLocaleString();

  const clearAmountsAndPreview = () => {
    setSourceAmount("");
    setDescAmount("");
    setExchangeRate("");
    setSwapAssetPreview(null);
    setNext(false);
  };

  // -------- Load assets (block UI until ready) --------
  useEffect(() => {
    const bootstrapAssets = async () => {
      try {
        setLoadingWalletAssets(true);

        // 1) Instant cache (if any) so UI can render options immediately
        const cached = localStorage.getItem("walletAssets");
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed?.allWalletAssets?.length) {
              setAssets(parsed);
              setLoadingWalletAssets(false); // allow UI while we refresh in background
            }
          } catch {}
        }

        // 2) Network fetch (authoritative). If no cache, we keep loader shown until this completes.
        if (!user) {
          setLoadingWalletAssets(false);
          return;
        }
        const response = await getMyAssets(user, undefined);

        if (!response?.success) {
          if (response?.message === "Login has expired") {
            localStorage.clear();
            Cookies.remove("token");
            navigate("/login");
            return;
          }
          setAlertType("error");
          setMsg(response?.message || "Failed to load assets");
          return;
        }

        // Save fresh to state & cache
        setAssets(response.data);
        localStorage.setItem("walletAssets", JSON.stringify(response.data));
      } catch (err: any) {
        if (err?.message === "Login has expired") {
          localStorage.clear();
          Cookies.remove("token");
          navigate("/login");
          return;
        }
        setAlertType("error");
        setMsg(err?.message || "Failed to get wallet assets");
      } finally {
        setLoadingWalletAssets(false);
      }
    };

    bootstrapAssets();
  }, []);

  // When user types amount, debounce preview
  const handleSourceAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log({ value });
    if (!/^(?:\d*(?:\.|,)??\d*)$/.test(value)) return; // allow numbers & dot
    setSourceAmount(value);
    setDescAmount("");
    setExchangeRate("");
    setSwapAssetPreview(null);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (Number(value) > 0) handleSwapAssetsPreview();
    }, 500);
  };

  const handleMax = () => {
    if (!selectedAsset) return;
    const max = Number(selectedAsset.balance) || 0;
    if (max <= 0) return;
    setSourceAmount(String(max));
    setDescAmount("");
    setExchangeRate("");
    setSwapAssetPreview(null);
    // immediate preview
    handleSwapAssetsPreview(String(max));
  };

  // -------- Validation --------
  const validateAmount = (amount: number, assetCode: string): string | null => {
    const minAmount = getMinimumSwapAmount(assetCode);
    const assetName = getAssetDisplayName(assetCode);

    if (amount < minAmount) {
      return `Minimum swap amount for ${assetName} is ${minAmount}`;
    }

    if (amount < 0.0000001) {
      return "The amount is too small.";
    }

    return null;
  };

  // -------- API: Preview --------
  async function handleSwapAssetsPreview(overrideAmount?: string) {
    if (!selectedAsset || !selectedAssetReceive) {
      setAlertType("error");
      setMsg("Please select both From and To assets before entering amount.");
      return;
    }

    const amount = overrideAmount ?? sourceAmount;
    const numericAmount = Number(amount);

    if (!amount || numericAmount <= 0) return;

    // Validate minimum amount
    const amountError = validateAmount(numericAmount, selectedAsset.asset_code);
    if (amountError) {
      setAlertType("error");
      setMsg(amountError);
      return;
    }

    if (selectedAsset.asset_code === selectedAssetReceive.asset_code) {
      setAlertType("error");
      setMsg("Please select different assets.");
      return;
    }

    if (Number(selectedAsset.balance) < numericAmount) {
      setAlertType("error");
      setMsg("Insufficient balance.");
      return;
    }

    setLoadingPreview(true);

    try {
      if (!user) return;

      const response = await swapAssetsPreview(
        user,
        selectedAsset.asset_code,
        selectedAssetReceive.asset_code,
        numericAmount,
        Number(slippage)
      );

      if (!response?.success) {
        if (response?.message === "Login has expired") {
          localStorage.clear();
          Cookies.remove("token");
          navigate("/login");
          return;
        }
        setAlertType("error");
        setMsg(response?.message || "Preview failed");
        return;
      }

      const details = response.data.swapDetails;
      setSwapAssetPreview(details);
      setDescAmount(details.expectedDestinationAmount);
      setExchangeRate(details.exchangeRate);
      setNext(true);
    } catch (error: any) {
      if (error?.message === "Login has expired") {
        localStorage.clear();
        Cookies.remove("token");
        navigate("/login");
        return;
      }
      setAlertType("error");
      setMsg(error?.message || "An error occurred. Please try again.");
    } finally {
      setLoadingPreview(false);
    }
  }

  // -------- API: Swap --------
  async function handleSwapAssets() {
    if (!selectedAsset || !selectedAssetReceive) {
      setAlertType("error");
      setMsg("Please select assets to swap.");
      return;
    }

    if (selectedAsset.asset_code === selectedAssetReceive.asset_code) {
      setAlertType("error");
      setMsg("Please select different assets.");
      return;
    }

    const numericAmount = Number(sourceAmount);

    if (!sourceAmount || numericAmount <= 0) {
      setAlertType("error");
      setMsg("Please enter a valid amount.");
      return;
    }

    // Validate minimum amount
    const amountError = validateAmount(numericAmount, selectedAsset.asset_code);
    if (amountError) {
      setAlertType("error");
      setMsg(amountError);
      return;
    }

    if (Number(selectedAsset.balance) < numericAmount) {
      setAlertType("error");
      setMsg("Insufficient balance.");
      return;
    }

    setLoadingSwap(true);
    try {
      if (!user) return;

      const response = await swapAssets(
        user,
        selectedAsset.asset_code,
        selectedAssetReceive.asset_code,
        numericAmount,
        Number(slippage)
      );

      if (!response?.success) {
        if (response?.message === "Login has expired") {
          localStorage.clear();
          Cookies.remove("token");
          navigate("/login");
          return;
        }
        setAlertType("error");
        setMsg(response?.message || "Swap failed");
        return;
      }

      // Refresh balances
      try {
        const fresh = await getMyAssets(user, selectedAsset?.asset_code);
        if (fresh?.success) {
          setAssets(fresh.data);
          localStorage.setItem("walletAssets", JSON.stringify(fresh.data));
        }
      } catch {}

      setAlertType("success");
      setMsg(
        `${getAssetDisplayName(
          selectedAsset.asset_code
        )} ${formatNumberWithCommas(
          sourceAmount
        )} swapped to ${formatNumberWithCommas(
          Number(descAmount)
        )} ${getAssetDisplayName(
          selectedAssetReceive?.asset_code
        )} successfully.`
      );

      // Reset state
      setSelectedAsset(null);
      setSelectedAssetReceive(null);
      setCurrentbalance(0);
      clearAmountsAndPreview();
    } catch (error: any) {
      if (error?.message === "Login has expired") {
        localStorage.clear();
        Cookies.remove("token");
        navigate("/login");
        return;
      }
      setAlertType("error");
      setMsg(error?.message || "An error occurred. Please try again.");
    } finally {
      setLoadingSwap(false);
    }
  }

  const filteredReceiveAssets = assets?.allWalletAssets?.filter(
    (asset: any) => asset.asset_code !== selectedAsset?.asset_code
  );

  const gateReady = !!assets?.allWalletAssets?.length && !loadingWalletAssets;

  return (
    <>
      <EmptyTopNav />

      {/* Block UI until assets are available */}
      {!gateReady ? (
        <main className="flex items-center justify-center min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 rounded-full border-4 border-gray-300 dark:border-gray-700 border-t-transparent animate-spin" />
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Fetching wallet assets…
            </p>
          </div>
        </main>
      ) : (
        <main className="flex items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            {/* Icon */}
            <div className="flex justify-center items-center py-4">
              <span className="bg-[#E7F1F7] dark:bg-gray-700 p-3 rounded-full">
                <FaExchangeAlt className="text-gray-900 dark:text-gray-100 w-6 h-6" />
              </span>
            </div>

            {/* Heading */}
            <h2 className="text-center text-xl font-semibold">
              Exchange Funds
            </h2>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
              Choose your crypto and wait for the transaction to complete.{" "}
              <br />
              Keep at least <span className="font-medium">3 XLM</span> as
              minimum balance for gas.
            </p>

            {/* Balance (only when From selected) */}

            {selectedAsset && (
              <div className="flex items-center justify-between bg-white dark:bg-gray-700 rounded-lg px-4 py-3 mb-4">
                <div className="flex items-center gap-3">
                  {selectedAsset?.image && (
                    <img
                      src={
                        selectedAsset.asset_code === "NATIVE"
                          ? "./images/stellar.png"
                          : selectedAsset.asset_code === "NGNC"
                          ? "./images/nigeria.png"
                          : selectedAsset.image
                      }
                      alt={selectedAsset.asset_code}
                      className="w-5 h-5 rounded-full"
                    />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {getAssetDisplayName(selectedAsset.asset_code)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Spendable Balance
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 px-3 py-1 rounded-full">
                  {getAssetDisplayName(selectedAsset.asset_code)}{" "}
                  {formatNumberWithCommas(getSpendableBalance(selectedAsset))}{" "}
                </span>
              </div>
            )}

            {/* From Amount */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                From Amount
              </label>
              <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                <select
                  className="bg-gray-50 dark:bg-gray-700 px-3 py-2 outline-none"
                  value={selectedAsset?.asset_code || ""}
                  onChange={(e) => {
                    const asset = assets?.allWalletAssets?.find(
                      (a: any) => a.asset_code === e.target.value
                    );
                    if (asset) {
                      setSelectedAsset(asset);
                      setCurrentbalance(Number(asset.balance) || 0);
                      clearAmountsAndPreview();
                    }
                  }}
                >
                  <option value="">Select</option>
                  {assets?.allWalletAssets?.map((asset: any, index: number) => (
                    <option key={index} value={asset.asset_code}>
                      {getAssetDisplayName(asset.asset_code)}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  placeholder="Enter amount"
                  className="flex-1 px-3 py-2 bg-transparent outline-none"
                  value={sourceAmount}
                  disabled={!selectedAsset || loadingPreview || loadingSwap}
                  onChange={handleSourceAmountChange}
                />

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!selectedAsset || loadingPreview || loadingSwap) return;
                    handleMax();
                  }}
                  className="px-3 text-sm font-medium text-blue-600 dark:text-blue-400 disabled:opacity-50"
                  disabled={!selectedAsset || loadingPreview || loadingSwap}
                >
                  Max
                </button>
              </div>
              {selectedAsset?.asset_code && (
                <p className="text-xs text-gray-500 mt-1 mb-6">
                  Min:{" "}
                  {getMinimumSwapAmount(selectedAsset.asset_code.toUpperCase())}{" "}
                  {getAssetDisplayName(selectedAsset.asset_code?.toUpperCase())}{" "}
                  | Max:{" "}
                  {getAssetDisplayName(
                    selectedAsset.asset_code?.toUpperCase()
                  ) === "XLM"
                    ? `
        ${selectedAsset.balance} 
        ${getAssetDisplayName(selectedAsset.asset_code?.toUpperCase())}
      `
                    : `
        ${formateDecimal(selectedAsset.balance)} 
        ${getAssetDisplayName(selectedAsset.asset_code?.toUpperCase())}
      `}
                </p>
              )}
            </div>

            {/* To Amount */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                To Amount
              </label>
              <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                <select
                  className="bg-gray-50 dark:bg-gray-700 px-3 py-2 outline-none"
                  value={selectedAssetReceive?.asset_code || ""}
                  onChange={(e) => {
                    const asset = assets?.allWalletAssets?.find(
                      (a: any) => a.asset_code === e.target.value
                    );
                    if (asset) {
                      setSelectedAssetReceive(asset);
                      clearAmountsAndPreview();
                    }
                  }}
                >
                  <option value="">Select</option>
                  {filteredReceiveAssets?.map((asset: any, index: number) => (
                    <option key={index} value={asset.asset_code}>
                      {getAssetDisplayName(asset.asset_code)}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Converted amount"
                  className="flex-1 px-3 py-2 bg-transparent outline-none"
                  value={descAmount}
                  disabled
                  readOnly
                />
              </div>
            </div>

            {/* Slippage */}
            <div>
              <label className="block text-sm font-medium mb-1">Slippage</label>
              <input
                id="small-range"
                type="range"
                min={0.5}
                max={10}
                step={0.01}
                value={slippage}
                onChange={(e) => setSlippage(Number(e.target.value))}
                className="w-full"
                disabled={loadingPreview || loadingSwap}
              />
              <p className="text-center">{slippage}%</p>
            </div>

            {/* Preview Details */}
            {swapAssetPreview && (
              <div className="p-3 mb-4 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm">
                <p>
                  Rate: 1 {getAssetDisplayName(selectedAsset?.asset_code)} ≈{" "}
                  {rateExchange}{" "}
                  {getAssetDisplayName(selectedAssetReceive?.asset_code)}
                </p>
                <p>
                  Expected: {formateDecimal(Number(descAmount) || 0)}{" "}
                  {getAssetDisplayName(selectedAssetReceive?.asset_code)}
                </p>
                <p>Min Received: {swapAssetPreview.minimumReceived}</p>
                <p>Fee: {Number(swapAssetPreview.fee) / 10000000} XLM</p>
                <p>Slippage: {swapAssetPreview.slippage}</p>
              </div>
            )}

            {/* Buttons */}
            {!next ? (
              <button
                className="bg-[#0E7BB2] text-white p-3 rounded-lg w-full mt-4 cursor-pointer disabled:opacity-50"
                disabled={
                  !selectedAsset ||
                  !selectedAssetReceive ||
                  !sourceAmount ||
                  loadingPreview ||
                  loadingSwap
                }
                onClick={() => handleSwapAssetsPreview()}
              >
                {loadingPreview ? "Previewing…" : "Next"}
              </button>
            ) : (
              <button
                className="flex gap-2 justify-center items-center bg-[#0E7BB2] text-white p-3 rounded-lg w-full mt-4 cursor-pointer disabled:opacity-50"
                disabled={!sourceAmount || !descAmount || loadingSwap}
                onClick={() => {
                  setIsRemoveTransactionConfirmationModalOpen(true);
                }}
              >
                <span>{loadingSwap ? "Swapping…" : "Swap"}</span>
              </button>
            )}

            {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
          </div>
        </main>
      )}
      {isRemoveTransactionConfirmationModalOpen && (
        <TransactionConfirmationModal
          handlTransactionConfirmation={handleSwapAssets}
          loading={loadingSwap}
        />
      )}
    </>
  );
};

export default Swap;
