import React, { useEffect, useMemo, useRef, useState } from "react";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import { getMyAssets } from "../function/horizonQuery";
import {
  strictSend,
  strictSendPreview,
  strictReceive,
  strictReceivePreview,
} from "../function/transaction";
import EmptyTopNav from "../components/top-nav/EmptyTopNav";
import Alert from "../components/alert/Alert";
import { BsBank } from "react-icons/bs";
import {
  formateDecimal,
  getAssetDisplayName,
  getMinimumSendAmount,
  getSpendableBalance,
  labelFor,
} from "../utils";

type Mode = "sendExact" | "receiveExact";

type WalletAsset = {
  asset_code: string; // "NATIVE" | code
  balance: string;
  issuer?: string;
};

type AssetsResponse = {
  allWalletAssets: WalletAsset[];
};

const numberRegex = /^(?:\d*(?:[.,]\d*)?)$/;

const SendCrypto: React.FC = () => {
  const [mode, setMode] = useState<Mode>("sendExact");
  const token = Cookies.get("token") || "";

  // DATA
  const [assets, setAssets] = useState<AssetsResponse | null>(null);
  const [loadingWalletAssets, setLoadingWalletAssets] = useState<boolean>(true);

  // SELECTIONS
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [selectedAssetReceive, setSelectedAssetReceive] = useState<any>(null);

  // ADDRESS
  const [address, setAddress] = useState<string>("");

  // BALANCE & AMOUNTS
  const [currentBalance, setCurrentbalance] = useState<number>(0);
  const [sourceAmount, setSourceAmount] = useState<string>("");
  const [destAmount, setDestAmount] = useState<string>("");
  const [exchangeRate, setExchangeRate] = useState<string>("");

  // PREVIEW RESULTS
  const [previewData, setPreviewData] = useState<any>(null);

  // UI
  const [msg, setMsg] = useState<string>("");
  const [alertType, setAlertType] = useState<"" | "error" | "success">("");
  const [slippage, setSlippage] = useState<number>(1.0);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [loadingSubmit, setLoadingSubmit] = useState<boolean>(false);
  const [canProceed, setCanProceed] = useState<boolean>(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const navigate = useNavigate();

  // -------- Helpers --------
  const formatNumberWithCommas = (n: number | string): string =>
    Number(n || 0).toLocaleString();

  const clearAlerts = () => {
    setAlertType("");
    setMsg("");
  };

  const raise = (type: "error" | "success", message: string) => {
    setAlertType(type);
    setMsg(message);
  };

  const resetPreviewAndNumbers = () => {
    setPreviewData(null);
    setExchangeRate("");
    setCanProceed(false);
  };

  const clearAmounts = () => {
    setSourceAmount("");
    setDestAmount("");
  };

  // -------- Load assets --------
  useEffect(() => {
    (async () => {
      try {
        setLoadingWalletAssets(true);

        const cached = localStorage.getItem("walletAssets");
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as AssetsResponse;
            if (parsed?.allWalletAssets?.length) {
              setAssets(parsed);
              setLoadingWalletAssets(false);
            }
          } catch {}
        }

        if (!token) {
          setLoadingWalletAssets(false);
          return;
        }

        const response = await getMyAssets(token, undefined);
        if (!response?.success) {
          if (response?.message === "Login has expired") {
            localStorage.clear();
            Cookies.remove("token");
            navigate("/login");
            return;
          }
          raise("error", response?.message || "Failed to load assets");
          return;
        }

        setAssets(response.data);
        localStorage.setItem("walletAssets", JSON.stringify(response.data));
      } catch (err: any) {
        if (err?.message === "Login has expired") {
          localStorage.clear();
          Cookies.remove("token");
          navigate("/login");
          return;
        }
        raise("error", err?.message || "Failed to get wallet assets");
      } finally {
        setLoadingWalletAssets(false);
      }
    })();
  }, []);

  // Update balance display when selected asset changes
  useEffect(() => {
    const bal =
      selectedAsset && selectedAsset.balance
        ? Number(selectedAsset.balance)
        : 0;
    setCurrentbalance(bal);
  }, [selectedAsset]);

  // Filter receive assets (cannot equal the from-asset)
  const filteredReceiveAssets = useMemo(
    () =>
      assets?.allWalletAssets?.filter(
        (a) => a.asset_code !== selectedAsset?.asset_code
      ) || [],
    [assets, selectedAsset]
  );

  const gateReady =
    !!assets?.allWalletAssets?.length && !loadingWalletAssets && !!token;

  // -------- Effect for triggering preview when all inputs are available --------
  useEffect(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (!address || !selectedAsset) {
      resetPreviewAndNumbers();
      return;
    }

    if (mode === "sendExact") {
      if (Number(sourceAmount) > 0) {
        typingTimeoutRef.current = setTimeout(() => {
          doStrictSendPreview(Number(sourceAmount));
        }, 500);
      }
    } else {
      if (Number(destAmount) > 0 && selectedAssetReceive) {
        typingTimeoutRef.current = setTimeout(() => {
          doStrictReceivePreview(Number(destAmount));
        }, 500);
      }
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [
    mode,
    address,
    selectedAsset,
    selectedAssetReceive,
    sourceAmount,
    destAmount,
  ]);

  // -------- Amount change handlers --------
  const handleSourceAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(",", ".");
    if (!numberRegex.test(value)) return;
    setSourceAmount(value);
    resetPreviewAndNumbers();
  };

  const handleDestAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(",", ".");
    if (!numberRegex.test(value)) return;
    setDestAmount(value);
    resetPreviewAndNumbers();
  };

  const handleSourceAmountMax = () => {
    if (!selectedAsset) return;
    const max = getSpendableBalance(selectedAsset);
    if (max <= 0) return;
    const v = max.toString();
    setSourceAmount(v);
    resetPreviewAndNumbers();
  };

  const handleDestAmountMax = () => {
    if (!selectedAssetReceive) return;
    const max = getSpendableBalance(selectedAssetReceive);
    if (max <= 0) return;
    const v = max.toString();
    setDestAmount(v);
    resetPreviewAndNumbers();
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddress(value);
    resetPreviewAndNumbers();
  };

  const next = (value: number) => {
    if (!validateCommon()) return;
    resetPreviewAndNumbers();

    if (mode === "receiveExact") {
      doStrictReceivePreview(Number(value));
    } else {
      doStrictSendPreview(Number(value));
    }
  };

  // -------- PREVIEWS --------
  const validateCommon = (): boolean => {
    clearAlerts();

    if (!gateReady) {
      raise("error", "Wallet not ready. Please sign in again.");
      return false;
    }
    if (!address) {
      return false;
    }
    if (mode !== "sendExact") {
      if (!selectedAsset || !selectedAssetReceive) {
        raise(
          "error",
          "Select both the asset you send and the asset the receiver gets."
        );
        return false;
      }
      if (selectedAsset.asset_code === selectedAssetReceive.asset_code) {
        raise("error", "Select different assets for send and receive.");
        return false;
      }
    }
    if (Number(slippage) < 0 || Number(slippage) >= 100) {
      raise("error", "Slippage must be between 0 and 100.");
      return false;
    }
    return true;
  };

  const doStrictSendPreview = async (amountOverride?: number) => {
    if (!validateCommon()) return;

    const amt = amountOverride ?? Number(sourceAmount);
    if (!amt || amt <= 0) return;

    // Check against spendable balance, not total balance
    const spendableBalance = getSpendableBalance(selectedAsset);
    if (spendableBalance < amt) {
      raise("error", "Insufficient spendable balance for this amount.");
      return;
    }

    // Check minimum amount
    const minAmount = getMinimumSendAmount(labelFor(selectedAsset));
    if (amt < minAmount) {
      raise(
        "error",
        `Minimum amount is ${minAmount} ${labelFor(selectedAsset)}`
      );
      return;
    }

    setLoadingPreview(true);
    try {
      const resp = await strictSendPreview(
        token,
        selectedAsset!.asset_code,
        amt,
        address.trim(),
        Number(slippage)
      );

      if (!resp?.success) {
        if (resp?.message === "Login has expired") {
          localStorage.clear();
          Cookies.remove("token");
          navigate("/login");
          return;
        }
        raise("error", resp?.message || "Preview failed");
        return;
      }

      const details = resp.data.transactionDetails;
      setPreviewData(details);

      setExchangeRate(
        details?.estimatedDestinationAmount && amt
          ? `${formatNumberWithCommas(amt)} ${labelFor(
              selectedAsset
            )} → ~ ${formatNumberWithCommas(
              details.estimatedDestinationAmount
            )} ${labelFor(selectedAssetReceive)}`
          : ""
      );

      setCanProceed(true);
    } catch (err: any) {
      raise("error", err?.message || "Failed to preview strict send");
    } finally {
      setLoadingPreview(false);
    }
  };

  const doStrictReceivePreview = async (destAmtOverride?: number) => {
    if (!validateCommon()) return;

    const dAmt = destAmtOverride ?? Number(destAmount);
    if (!dAmt || dAmt <= 0) return;

    // Check minimum amount
    const minAmount = getMinimumSendAmount(labelFor(selectedAssetReceive));
    if (dAmt < minAmount) {
      raise(
        "error",
        `Minimum amount is ${minAmount} ${labelFor(selectedAssetReceive)}`
      );
      return;
    }

    setLoadingPreview(true);
    try {
      const resp = await strictReceivePreview(
        token,
        selectedAsset!.asset_code,
        selectedAssetReceive!.asset_code,
        dAmt,
        address.trim(),
        Number(slippage)
      );

      if (!resp?.success) {
        if (resp?.message === "Login has expired") {
          localStorage.clear();
          Cookies.remove("token");
          navigate("/login");
          return;
        }
        raise("error", resp?.message || "Preview failed");
        return;
      }

      const details = resp.data.transactionDetails;
      setPreviewData(details);

      setExchangeRate(
        details?.sourceAmount && dAmt
          ? `~ ${formatNumberWithCommas(details.sourceAmount)} ${labelFor(
              selectedAsset
            )} → ${formatNumberWithCommas(dAmt)} ${labelFor(
              selectedAssetReceive
            )}`
          : ""
      );

      setCanProceed(true);
    } catch (err: any) {
      raise("error", err?.message || "Failed to preview strict receive");
    } finally {
      setLoadingPreview(false);
    }
  };

  // -------- SUBMIT --------
  const onNext = async () => {
    clearAlerts();

    if (!validateCommon()) return;

    if (mode === "sendExact") {
      if (!previewData) {
        raise("error", "Please preview first.");
        return;
      }

      const amt = Number(sourceAmount);
      if (!amt || amt <= 0) {
        raise("error", "Enter a valid amount to send.");
        return;
      }

      // Check against spendable balance, not total balance
      const spendableBalance = getSpendableBalance(selectedAsset);
      if (spendableBalance < amt) {
        raise("error", "Insufficient spendable balance.");
        return;
      }

      // Check minimum amount
      const minAmount = getMinimumSendAmount(labelFor(selectedAsset));
      if (amt < minAmount) {
        raise(
          "error",
          `Minimum amount is ${minAmount} ${labelFor(selectedAsset)}`
        );
        return;
      }

      setLoadingSubmit(true);
      try {
        const exec = await strictSend(
          token,
          selectedAsset!.asset_code,
          amt,
          address.trim(),
          Number(slippage)
        );

        if (!exec?.success) {
          if (exec?.message === "Login has expired") {
            localStorage.clear();
            Cookies.remove("token");
            navigate("/login");
            return;
          }
          raise("error", exec?.message || "Strict send failed");
          return;
        }

        try {
          const fresh = await getMyAssets(token, selectedAsset!.asset_code);
          if (fresh?.success) {
            setAssets(fresh.data);
            localStorage.setItem("walletAssets", JSON.stringify(fresh.data));
          }
        } catch {}

        raise(
          "success",
          `Sent ${formatNumberWithCommas(amt)} ${labelFor(
            selectedAsset
          )}. Tx: ${exec.data?.hash || "success"}`
        );

        setSelectedAsset(null);
        setSelectedAssetReceive(null);
        setCurrentbalance(0);
        setAddress("");
        clearAmounts();
        resetPreviewAndNumbers();
      } catch (err: any) {
        raise("error", err?.message || "An error occurred. Please try again.");
      } finally {
        setLoadingSubmit(false);
      }
    } else {
      if (!previewData) {
        raise("error", "Please preview first.");
        return;
      }

      const dAmt = Number(destAmount);
      if (!dAmt || dAmt <= 0) {
        raise("error", "Enter a valid destination amount.");
        return;
      }

      // Check minimum amount
      const minAmount = getMinimumSendAmount(labelFor(selectedAssetReceive));
      if (dAmt < minAmount) {
        raise(
          "error",
          `Minimum amount is ${minAmount} ${labelFor(selectedAssetReceive)}`
        );
        return;
      }

      setLoadingSubmit(true);
      try {
        const exec = await strictReceive(
          token,
          selectedAsset!.asset_code,
          selectedAssetReceive!.asset_code,
          dAmt,
          address.trim(),
          Number(slippage)
        );

        if (!exec?.success) {
          if (exec?.message === "Login has expired") {
            localStorage.clear();
            Cookies.remove("token");
            navigate("/login");
            return;
          }
          raise("error", exec?.message || "Strict receive failed");
          return;
        }

        try {
          const fresh = await getMyAssets(token, selectedAsset!.asset_code);
          if (fresh?.success) {
            setAssets(fresh.data);
            localStorage.setItem("walletAssets", JSON.stringify(fresh.data));
          }
        } catch {}

        raise(
          "success",
          `Receiver will get ${formatNumberWithCommas(dAmt)} ${labelFor(
            selectedAssetReceive
          )}. Tx: ${exec.data?.hash || "success"}`
        );

        setSelectedAsset(null);
        setSelectedAssetReceive(null);
        setCurrentbalance(0);
        setAddress("");
        clearAmounts();
        resetPreviewAndNumbers();
      } catch (err: any) {
        raise("error", err?.message || "An error occurred. Please try again.");
      } finally {
        setLoadingSubmit(false);
      }
    }
  };

  // -------- UI --------
  return (
    <>
      <EmptyTopNav />
      <main className="flex items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <div
          className={`mt-5 w-full max-w-md bg-[white] dark:bg-gray-800  rounded-2xl shadow-lg p-6 ${
            canProceed && mode !== "sendExact" && "mt-[80px]"
          }`}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
              <BsBank className="text-gray-900 dark:text-gray-100 w-6 h-6" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Send Crypto Securely
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Keep ~5 XLM for fees
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => {
                setMode("sendExact");
                clearAmounts();
                resetPreviewAndNumbers();
                clearAlerts();
              }}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
                mode === "sendExact"
                  ? "text-black dark:text-gray-300 border border-[#0E7BB2] bg-[#0E7BB2]/10"
                  : "text-gray-400 dark:text-gray-600 border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
              }`}
            >
              Send Exact Amount
            </button>
            <button
              onClick={() => {
                setMode("receiveExact");
                clearAmounts();
                resetPreviewAndNumbers();
                clearAlerts();
              }}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
                mode === "receiveExact"
                  ? "text-black dark:text-gray-300 border border-[#0E7BB2] bg-[#0E7BB2]/10"
                  : "text-gray-400 dark:text-gray-600 border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
              }`}
            >
              Receive Exact Amount
            </button>
          </div>

          {/* Amount Inputs */}
          {mode === "sendExact" ? (
            <>
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

              {/* Asset Selectors */}
              <div className="grid grid-cols-1 gap-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Select Currency
                  </label>
                  <select
                    value={selectedAsset?.asset_code || ""}
                    onChange={(e) => {
                      const a = assets?.allWalletAssets?.find(
                        (x) => x.asset_code === e.target.value
                      );
                      setSelectedAsset(a || null);
                      resetPreviewAndNumbers();
                    }}
                    className="w-full border rounded-lg p-2 focus:outline-0 focus:border-[#0E7BB2] dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  >
                    <option value="" disabled>
                      {loadingWalletAssets ? "Loading..." : "Select asset"}
                    </option>
                    {assets?.allWalletAssets?.map((a) => (
                      <option key={a.asset_code} value={a.asset_code}>
                        {getAssetDisplayName(a.asset_code?.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Receiver Address */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Receiver Wallet Address
                </label>
                <input
                  value={address}
                  onChange={handleAddressChange}
                  type="text"
                  placeholder="Paste wallet address"
                  className="w-full border rounded-lg p-2 focus:outline-0 focus:border-[#0E7BB2] dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ensure the address is correct. Transactions can't be reversed.
                </p>
              </div>
              {/* You Send */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount
                </label>
                <div className="flex gap-2">
                  <input
                    value={sourceAmount}
                    onChange={handleSourceAmountChange}
                    type="text"
                    inputMode="decimal"
                    placeholder="Amount"
                    className="flex-1 border rounded-lg p-2 focus:outline-0 focus:border-[#0E7BB2] dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                  <button
                    onClick={handleSourceAmountMax}
                    className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-md text-gray-700 dark:text-gray-300"
                  >
                    Max
                  </button>
                </div>
                {labelFor(selectedAsset) && (
                  <p className="text-xs text-gray-500 mt-1 mb-6">
                    Min:{" "}
                    {getMinimumSendAmount(
                      selectedAsset.asset_code?.toUpperCase()
                    )}{" "}
                    {getAssetDisplayName(
                      selectedAsset.asset_code?.toUpperCase()
                    )}{" "}
                    | Max: {formateDecimal(getSpendableBalance(selectedAsset))}{" "}
                    {getAssetDisplayName(
                      selectedAsset.asset_code?.toUpperCase()
                    )}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Asset Selectors */}
              <div className={`grid grid-cols-2 gap-3 mb-4`}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    You Send{" "}
                    {mode === "receiveExact" && (
                      <span className="text-xs text-gray-500">
                        (source asset)
                      </span>
                    )}
                  </label>
                  <select
                    value={selectedAsset?.asset_code || ""}
                    onChange={(e) => {
                      console.log("Sender asset changed:", e.target.value);
                      const a = assets?.allWalletAssets?.find(
                        (x) => x.asset_code === e.target.value
                      );
                      setSelectedAsset(a || null);
                      resetPreviewAndNumbers();
                    }}
                    className="w-full border rounded-lg p-2 focus:outline-0 focus:border-[#0E7BB2] dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  >
                    <option value="" disabled>
                      {loadingWalletAssets ? "Loading..." : "Select asset"}
                    </option>
                    {assets?.allWalletAssets?.map((a) => (
                      <option key={a.asset_code} value={a.asset_code}>
                        {getAssetDisplayName(a.asset_code?.toUpperCase())}{" "}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Spendable Balance:{" "}
                    {formatNumberWithCommas(getSpendableBalance(selectedAsset))}{" "}
                    {getAssetDisplayName(
                      selectedAsset?.asset_code?.toUpperCase()
                    )}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Receiver Gets (asset)
                  </label>
                  <select
                    value={selectedAssetReceive?.asset_code || ""}
                    onChange={(e) => {
                      console.log("Receiver asset changed:", e.target.value);
                      console.log("Filtered assets:", filteredReceiveAssets);
                      
                      // Find the asset in the full list, not just filtered
                      const a = assets?.allWalletAssets?.find(
                        (x) => x.asset_code === e.target.value
                      );
                      
                      if (a) {
                        setSelectedAssetReceive(a);
                        resetPreviewAndNumbers();
                      } else {
                        console.error("Asset not found:", e.target.value);
                      }
                    }}
                    className="w-full border rounded-lg p-2 focus:outline-0 focus:border-[#0E7BB2] dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  >
                    <option value="" disabled>
                      {loadingWalletAssets ? "Loading..." : "Select asset"}
                    </option>
                    {assets?.allWalletAssets
                      ?.filter((a) => a.asset_code !== selectedAsset?.asset_code)
                      .map((a) => (
                        <option key={a.asset_code} value={a.asset_code}>
                          {getAssetDisplayName(a.asset_code?.toUpperCase())}{" "}
                        </option>
                      ))}
                  </select>
                  {/* FIX: Added balance display for receiver asset */}
                  <p className="text-xs text-gray-500 mt-1">
                    Spendable Balance:{" "}
                    {formatNumberWithCommas(
                      getSpendableBalance(selectedAssetReceive)
                    )}{" "}
                    {getAssetDisplayName(
                      selectedAssetReceive?.asset_code?.toUpperCase()
                    )}
                  </p>
                </div>
              </div>

              {/* Receiver Address */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Receiver Wallet Address
                </label>
                <input
                  value={address}
                  onChange={handleAddressChange}
                  type="text"
                  placeholder="Paste wallet address"
                  className="w-full border rounded-lg p-2 focus:outline-0 focus:border-[#0E7BB2] dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ensure the address is correct. Transactions can't be reversed.
                </p>
              </div>

              {/* Receiver Gets */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount Receiver Gets (exact)
                </label>
                <div className="flex gap-2">
                  <input
                    value={destAmount}
                    onChange={handleDestAmountChange}
                    type="text"
                    inputMode="decimal"
                    placeholder="Amount"
                    className="flex-1 border rounded-lg p-2 focus:outline-0 focus:border-[#0E7BB2] dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                  <button
                    onClick={handleDestAmountMax}
                    className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-md text-gray-700 dark:text-gray-300"
                  >
                    Max
                  </button>
                </div>
                {/* FIX: This now correctly shows min/max for the receiver asset */}
                {selectedAssetReceive && (
                  <p className="text-xs text-gray-500 mt-1 mb-6">
                    Min: {getMinimumSendAmount(labelFor(selectedAssetReceive))}{" "}
                    {labelFor(selectedAssetReceive)} | Max:{" "}
                    {formateDecimal(getSpendableBalance(selectedAssetReceive))}{" "}
                    {labelFor(selectedAssetReceive)}
                  </p>
                )}
              </div>

              {/* You Send (estimated) */}
              {canProceed && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    You Send (estimated)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={
                      previewData?.sourceAmount
                        ? `~ ${formatNumberWithCommas(
                            previewData.sourceAmount
                          )} ${labelFor(selectedAsset)}`
                        : ""
                    }
                    className="w-full border rounded-lg p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  />
                </div>
              )}
            </>
          )}

          {/* Slippage */}
          <div className="mb-4 hidden">
            <label className="block text-sm  font-medium text-gray-700 dark:text-gray-300 mb-1">
              Slippage Tolerance (%)
            </label>
            <input
              value={slippage}
              onChange={(e) => {
                setSlippage(Number(e.target.value));
                resetPreviewAndNumbers();
              }}
              type="number"
              min={0}
              max={99.99}
              step={0.1}
              className="w-full border rounded-lg p-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>

          {/* Summary Box (from preview) */}
          {canProceed && (
            <div className="bg-[#E7F1F7] dark:bg-gray-700 rounded-lg p-4 mb-6 text-sm">
              {mode !== "sendExact" && (
                <div className="flex justify-between mb-2">
                  <span>Exchange</span>
                  <span className="truncate max-w-[60%] text-right">
                    {exchangeRate || "—"}
                  </span>
                </div>
              )}
              <div className="flex justify-between mb-2">
                <span>Transaction Fee</span>
                <span>
                  {previewData?.fee !== undefined
                    ? Number(previewData.fee) / 10_000_000
                    : "—"}{" "}
                  XLM
                </span>
              </div>

              {mode === "sendExact" ? (
                <>
                  <div className="flex justify-between mb-2">
                    <span>Estimated Receive</span>
                    <span>
                      {previewData?.estimatedDestinationAmount
                        ? `${formatNumberWithCommas(
                            previewData.estimatedDestinationAmount
                          )} ${labelFor(selectedAssetReceive)}`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Min Receive (after slippage)</span>
                    <span>
                      {previewData?.minimumDestinationAmount
                        ? `${formatNumberWithCommas(
                            previewData.minimumDestinationAmount
                          )} ${labelFor(selectedAssetReceive)}`
                        : "—"}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between mb-2">
                    <span>Estimated Send Max (with slippage)</span>
                    <span>
                      {previewData?.estimatedSendMax
                        ? `${formatNumberWithCommas(
                            previewData.estimatedSendMax
                          )} ${labelFor(selectedAsset)}`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Required Source (best path)</span>
                    <span>
                      {previewData?.sourceAmount
                        ? `${formatNumberWithCommas(
                            previewData.sourceAmount
                          )} ${labelFor(selectedAsset)}`
                        : "—"}
                    </span>
                  </div>
                </>
              )}
              <p className="text-xs text-gray-500 mt-2">
                {loadingPreview
                  ? "Fetching quote…"
                  : canProceed
                  ? "Quote ready"
                  : "Enter amount to preview"}
              </p>
            </div>
          )}

          {/* Actions */}
          <button
            disabled={loadingSubmit || !canProceed}
            onClick={() => {
              if (!canProceed) {
                next(
                  mode === "sendExact"
                    ? Number(sourceAmount)
                    : Number(destAmount)
                );
              } else {
                onNext();
              }
            }}
            className={`${
              canProceed
                ? "flex gap-2 justify-center items-center bg-[#0E7BB2] text-white p-3 rounded-lg w-full mt-4 cursor-pointer disabled:opacity-50"
                : "bg-[#0E7BB2] text-white p-3 rounded-lg w-full mt-4 cursor-pointer disabled:opacity-50"
            }`}
          >
            {loadingSubmit
              ? "Sending..."
              : loadingPreview
              ? "Fetching quote…"
              : "Confirm"}
          </button>
        </div>
        {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
      </main>
    </>
  );
};

export default SendCrypto;