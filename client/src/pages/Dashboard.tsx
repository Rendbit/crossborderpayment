import React, { useEffect, useState } from "react";
import { GoArrowSwitch, GoChevronDown } from "react-icons/go";
import TopNav from "../components/top-nav/TopNav";
import Cookies from "js-cookie";
import Alert from "../components/alert/Alert";
import ArrayItemLoader from "../components/loader/ArrayItemLoader";
import TransactionTable from "../components/table/TransactionTable";
import { useNavigate } from "react-router-dom";
import SideNav from "../components/side-nav/SideNav";
import { getAllTrustLines, getMyAssets } from "../function/horizonQuery";
import { getProfile } from "../function/user";
import { createPortal } from "react-dom";
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
import { Banknote, ArrowRightLeft, Send, Eye } from "lucide-react";
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
  const user = Cookies.get("token");
  const [walletAssets, setWalletAssets] = useState<any>();
  const [selectedTrustLine, setSelectedTrustLine] = useState<any>();
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingWalletAssets, setLoadingWalletAssets] =
    useState<boolean>(false);
  const [PUBLIC_ASSETS, setPublic_Assets] = useState<any>([]);
  const [loadingPUBLIC_ASSETS, setLoadingPUBLIC_ASSETS] =
    useState<boolean>(false);
  const [convertCurrency, setConvertCurrency] = useState("USD");
  const assets = [
    { symbol: "NGNC", name: "Nigeria Naira", displaySymbol: "NGN" },
    { symbol: "USDC", name: "United State Dollars", displaySymbol: "USD" },
  ];
  const [selectedAsset, setSelectedAsset] = useState<any>();
  const [selectedCurrency, setSelectedCurrency] = useState(
    assets[0].displaySymbol
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
    handleGetMyAssets();
    handleGetAllTrustLines();
    handleGetTransactionHistory();
  }, []);

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
              await handleGetMyAssets();
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
  }, [walletAssets, user, hasAutoAddedNGNC]);

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

  async function handleGetMyAssets() {
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
      const response = await getMyAssets(user, selectedCurrency);
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
      const response = await removeTrustLine(
        selectedTrustLine.asset_code,
        user
      );
      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        setLoading(false);
        return;
      }
      await handleGetMyAssets();
      setMsg(response.message);
      setAlertType("success");
      setSelectedTrustLine(false);
      setIsRemoveCurrencyModalOpen(false);
      await handleGetTransactionHistory();
    } catch (error: any) {
      setMsg(error.message || "Failed to remove trustline");
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddTrustLine() {
    setLoading(true);
    try {
      if (!user) {
        setLoading(false);
        return;
      }
      const response = await addTrustLine(selectedAsset.code, user);
      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        setLoading(false);
        return;
      }
      await handleGetMyAssets();
      setMsg(response.message);
      setAlertType("success");
      setSelectedAsset(false);
      await handleGetTransactionHistory();
    } catch (error: any) {
      setMsg(error.message || "Failed to add trustline");
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

  const availableAssets = Object.keys(PUBLIC_ASSETS)?.filter(
    (key) =>
      !walletAssetCodes?.includes(PUBLIC_ASSETS[key]?.code?.toUpperCase()) &&
      PUBLIC_ASSETS[key].code !== "native"
  );

  const removableAssets = walletAssets?.allWalletAssets?.filter(
    (asset: any) => asset?.asset_code !== "NATIVE"
  );
  const allAssets: any[] = walletAssets?.allWalletAssets || [];

  return (
    <>
      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 text-gray-900 dark:text-gray-100">
        <TopNav page="Dashboard" />

        {hasXLM && !hasNGNC && user && xlmBalance < 5 && (
          <button
            onClick={() => setIsAddMoneyModalOpen(true)}
            className={`mb-4 underline rounded-lg text-center text-cyan-300`}
          >
            Account Inactive. This wallet needs a minimum balance of 5 XLM to be
            created on the network. Activate your account to continue.
          </button>
        )}
        {msg &&
          alertType &&
          msg !==
            "Account Inactive. This wallet needs a minimum balance of 5 XLM to be created on the network. Activate your account to continue." && (
            <div
              className={`mb-4 p-4 rounded-lg text-center ${
                alertType === "success"
                  ? "bg-[#435ec9] text-[#0a143f]"
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
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
                  TOTAL AVAILABLE BALANCE
                </h3>

                {/* Main Balance */}
                <p className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white">
                  {selectedCurrency} {formatNumberWithCommas(currentPrice?.toFixed(2)) || "loading..."}
                </p>
                <p className="text-sm md:text-base text-gray-500 dark:text-gray-300">
                  ≈ {formatNumberWithCommas(convertPrice?.toFixed(2)) || "loading..."} {convertCurrency}
                </p>
              </div>

              {/* Right Side: Eye + Currency Selector */}
              <div className="flex items-center gap-3 mt-1">
                <button className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition">
                  <Eye />
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
                          onClick={() => {
                            setCurrencyChange(false);
                            setSelectedCurrency(currency.displaySymbol);
                            if (currency.symbol === "NGNC") {
                              setCurrentPrice(
                                walletAssets.allWalletTotalBalanceInNgn
                              );
                              setConvertPrice(
                                walletAssets.allWalletTotalBalanceInUsd || 0
                              );
                              setConvertCurrency("USD");
                            } else {
                              setConvertCurrency("NGN");
                              setConvertPrice(
                                walletAssets.allWalletTotalBalanceInNgn || 0
                              );
                              setCurrentPrice(
                                walletAssets.allWalletTotalBalanceInUsd || 0
                              );
                            }
                          }}
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
              {(() => {
                // Get current assets

                // Check if we need to show default assets
                const shouldShowDefaults =
                  allAssets.length === 0 ||
                  (allAssets.length === 1 &&
                    allAssets[0]?.asset_code === "NATIVE");

                // Assets to display
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

                return displayAssets.map((asset: any, index: number) => (
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
                    className="p-4 md:p-6 rounded-lg border border-[#D9D9D9] dark:border-gray-700 flex flex-col gap-4"
                  >
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
                          alt={asset?.asset_name}
                          className="w-5 h-5 rounded-full"
                        />
                        <span>{asset?.asset_name}</span>
                      </div>
                      {/* Only show remove button for non-default, non-XLM assets */}

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
                              : asset?.asset_code}{" "}
                            balance
                          </p>
                          <BiInfoCircle
                            title={`${
                              asset?.asset_code === "NATIVE"
                                ? "XLM"
                                : asset?.asset_code
                            } balance`}
                            className="cursor-pointer"
                          />
                        </div>

                        <p className="text-2xl text-[#1E1E1E] dark:text-gray-400 text-center font-bold">
                          {asset?.asset_code === "NATIVE"
                            ? "XLM"
                            : asset?.asset_code}{" "}
                          {formateDecimal(getSpendableBalance(asset) || 0)}
                        </p>
                        <p className="text-sm text-center text-[#1E1E1E] dark:text-gray-300">
                          ${formateDecimal(asset?.equivalentBalanceInUsd || 0)}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end items-center">
                      {!asset?.isDefault ||
                        asset?.asset_code?.toUpperCase() !== "NATIVE" ||
                        (asset?.asset_code?.toUpperCase() !== "NGNC" && (
                          <button
                            onClick={() => {
                              setSelectedTrustLine(asset);
                              setIsRemoveCurrencyModalOpen(true);
                            }}
                            className="bg-[#E7F1F7] flex items-center gap-2 ri dark:bg-gray-700 p-3 rounded-full"
                          >
                            <span className="text-[12px]">Remove Currency</span>
                            <CgRemove
                              className="text-gray-900 cursor-pointer dark:text-gray-100"
                              size={16}
                            />
                          </button>
                        ))}
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap justify-center gap-3">
              {hasXLM && !hasNGNC && user && xlmBalance < 5 ? (
                <button
                  onClick={() => {
                    setIsAddMoneyModalOpen(true);
                  }}
                  className="px-4 py-3 flex items-center gap-2 text-sm bg-white dark:bg-gray-800 border border-[#D9D9D9] dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  Activate Account
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setIsAddCurrencyModalOpen(true);
                    }}
                    className="px-4 py-3 flex items-center gap-2 text-sm bg-white dark:bg-gray-800 border border-[#D9D9D9] dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    Add Currency <Banknote size={16} />
                  </button>
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
          handleAddTrustLine={async (asset) => {
            setSelectedAsset(asset);
            await handleAddTrustLine();
          }}
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
