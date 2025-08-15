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
import { formateDecimal } from "../utils";
import AssetProgressBar from "../components/progress-bar/AssetProgressBar";
import TransactionGraph from "../components/TransactionGraph";
import TokenHoldingsProgress from "../components/TokenHoldingsProgress";
import MobileNav from "../components/mobile-nav/MobileNav";
import { LuArrowDownToLine } from "react-icons/lu";
import { IoCopyOutline } from "react-icons/io5";
import TransactionList from "../components/transaction-list/TransactionList";


const Dashboard: React.FC = () => {
  const [userData, setUserData] = useState<any>();
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
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showRemoveModal, setShowRemoveModal] = useState<boolean>(false);
  const assets = [
    { symbol: "NGNC", name: "Nigeria Naira", displaySymbol: "NGN" },
    { symbol: "USDC", name: "United State Dollars", displaySymbol: "USD" },
    // { symbol: "GHSC", name: "Ghana Cedis", displaySymbol: "GHS" },
    // { symbol: "KESC", name: "Kenya Shillings", displaySymbol: "KES" },
  ];
  const [selectedAsset, setSelectedAsset] = useState<any>();
  const [selectedCurrency, setSelectedCurrency] = useState(
    assets[0].displaySymbol
  );
  const [dropDown, setDropDown] = useState<any>();
  const [removeDropDown, setRemoveDropDown] = useState<any>();
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
        console.log({ response });
        return;
      }
      await handleGetMyAssets();
      setMsg(response.message);
      setDropDown(false);
      setRemoveDropDown(false);
      setAlertType("success");
      setSelectedTrustLine(false);
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
      setDropDown(false);
      setRemoveDropDown(false);
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

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(address);
      console.log('Address copied to clipboard');
    } catch (err) {
      console.error('Failed to copy address: ', err);
    }
  }

  const truncateAddress = (addr: string, length: number): string => {
    if (addr.length <= length) return addr;
    const start = Math.ceil(length / 3);
    const end = Math.floor(length / 3);
    return `${addr.slice(0, start)}...${addr.slice(-end)}`;
  };

  const displayAddress = truncateAddress(address, 10);

  return (
    <div className="w-full md:grid grid-cols-12 bg-white">
      <div className="md:block hidden h-[100vh] sidebar p-4 pr-2 ">
        <SideNav />
      </div>
      <div className="py-6 overflow-hidden h-[100px] w-full z-50 sticky md:top-[-2%] top-0">
        <TopNav page="Home" />
      </div>
      <div className="mt-[100px] main-container md:pl-[60px] px-4 pl-2 w-full overflow-hidden md:col-span-10 col-span-12">
        <main className="top-0 left-0 right-0 w-full">
          <div className="flex-1">
            <div className={`md:flex items-start grid gap-10`}>
              <div className="w-full">
                <div
                  className='shadow-lg shadow-[#7FD0F9B2] border border-[#f4f2f2] text-black py-5 rounded-lg w-full mx-auto'
                >
                {/* <div
                  className={`bg-gradient-to-b from-[#0E84B2] to-[#0F2267]/5 border  border-[#FFFFFF]/10 text-white pt-3 rounded-lg w-full mx-auto ${
                    loadingWalletAssets
                      ? "animate-pulse from-primary-color to-blue-400"
                      : ""
                  }`}
                > */}
                  <div className={`mb-4 px-6`}>
                    <div className="flex justify-between">
                      <h2 className="text-[#000000B2] text-[18px]">
                        <b>Total Balance</b>
                      </h2>
                      <div className="relative mb-[10px] ml-[10px]">
                        <b>
                          <span
                            className="text-[#000] inline-flex text-[18px] items-center cursor-pointer"
                            onClick={() => setCurrencyChange(!currencyChange)}
                          >
                            {selectedCurrency} <GoChevronDown />
                          </span>
                        </b>
                        {currencyChange && (
                          <div className="absolute bg-white border rounded shadow">
                            {assets.map((currency, index) => (
                              <p
                                key={index}
                                className="px-2 py-1 text-[black] cursor-pointer"
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

                    <div className="flex ">
                      <p className="md:text-4xl mt-2 mb-2 text-[#000000] text-3xl">
                        <b>
                          {selectedCurrency}{" "}
                          {currentPrice?.toFixed(2) || "loading..."}
                        </b>
                      </p>
                    </div>
                    <p className="text-[16px] font-[300] text-[#000000]">
                      ≈ {convertPrice?.toFixed(2) || "loading..."}{" "}
                      {convertCurrency}
                    </p>
                  </div>

                  <div className="mt-3 px-6">
                    <TokenHoldingsProgress address={address} />
                  </div>
                </div>
                  <div className={`flex items-start justify-between gap-4 py-4 rounded-b-lg`}>
                    <div className="inline-flex items-center border border-gray-100 rounded-lg px-3 py-2 gap-2">
                      <IoCopyOutline 
                        className="w-4 h-4 text-gray-600 cursor-pointer hover:text-gray-800" 
                        onClick={handleCopy}
                      />
                      <p className="text-gray-700 text-sm font-medium">{displayAddress}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center gap1">
                        <button
                          onClick={() => navigate("/deposit")}
                          className="bg-[#0000000D] cursor-pointer py-4 px-8 text-[12px] md:text-[16px] rounded-[8px]"
                        >
                          <LuArrowDownToLine />
                        </button>
                        <p>Deposit</p>
                      </div>
                      <div className="flex flex-col items-center gap1">
                        <button
                          onClick={() => navigate("/transfer")}
                          className="bg-[#0000000D] cursor-pointer py-4 px-8 text-[12px] md:text-[16px] rounded-[8px]"
                        >
                          <GoArrowSwitch />
                        </button>
                        <p>Transfer</p>
                      </div>
                    </div>
                  </div>
              </div>
              
              <div
                className={`border border-[#FFFFFF]/20 rounded-lg w-full mx-auto `}
              >
                <p className="text-[18px] font-[600]">Transaction History</p>
                <TransactionList />
                {/* <TransactionGraph address={address} /> */}
              </div>
            </div>




            <div className="md:flex items-start grid gap-10 mt-5 w-full border-t border-[#dcdcdc] pt-5">
              <div className="w-full">
                <>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h2 className="text-[22px] font-semibold text-black">
                      My Assets
                    </h2>
                    <div className="flex gap-3">
                      <button
                        className="bg-blue-600 cursor-pointer hover:bg-blue-500 transition px-5 py-2 rounded-[8px] text-sm md:text-base text-white"
                        onClick={() => {
                          if (isActivateWalletAlert) {
                            setAlertType("error");
                            setMsg(
                              "Fund your wallet with at least 5 XLM to activate your account."
                            );
                            return;
                          }
                          setShowAddModal(true);
                        }}
                      >
                        + Add Asset
                      </button>
                      <button
                        className="bg-red-600 cursor-pointer hover:bg-red-500 transition px-5 py-2 rounded-[8px] text-sm md:text-base text-white"
                        onClick={() => {
                          if (isActivateWalletAlert) {
                            setAlertType("error");
                            setMsg(
                              "Fund your wallet with at least 5 XLM to activate your account."
                            );
                            return;
                          }
                          setShowRemoveModal(true);
                        }}
                      >
                        − Remove Asset
                      </button>
                    </div>
                  </div>

                  {isActivateWalletAlert && (
                    <p className="bg-red-500 text-white p-4 rounded-lg text-center mb-4">
                      {activateWalletAlert}
                    </p>
                  )}

                  {/* Add Asset Modal */}
                  {showAddModal && (
                    <div className="fixed inset-0 bg-black/80 bg-opacity-50 flex items-center justify-center z-[100]">
                      <div className="bg-[#010014]  mx-4 border border-white/20 text-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold">Add Asset</h3>
                          <button
                            onClick={() => setShowAddModal(false)}
                            className="text-gray-400 cursor-pointer hover:text-white"
                          >
                            ✕
                          </button>
                        </div>
                        {loadingPUBLIC_ASSETS ? (
                          <ArrayItemLoader />
                        ) : (
                          (() => {
                            const availableAssets = Object.keys(
                              PUBLIC_ASSETS
                            )?.filter(
                              (key) =>
                                !walletAssetCodes?.includes(
                                  PUBLIC_ASSETS[key]?.code?.toUpperCase()
                                ) && PUBLIC_ASSETS[key].code !== "native"
                            );
                            return availableAssets?.length > 0 ? (
                              availableAssets.map((key, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-3 py-2 px-3 hover:bg-[#050d2a] cursor-pointer rounded-md"
                                  onClick={() => {
                                    setSelectedAsset(PUBLIC_ASSETS[key]);
                                    setShowAddModal(false);
                                  }}
                                >
                                  <img
                                    src={PUBLIC_ASSETS[key].image}
                                    alt=""
                                    className="w-8 h-8"
                                  />
                                  <div>
                                    <p className="font-medium">
                                      {PUBLIC_ASSETS[key].name}
                                    </p>
                                    <p className="text-[10px] text-gray-400">
                                      {PUBLIC_ASSETS[key].code === "native"
                                        ? "XLM"
                                        : PUBLIC_ASSETS[key].code}
                                    </p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-center text-gray-500">
                                No more assets to add
                              </p>
                            );
                          })()
                        )}
                      </div>
                    </div>
                  )}

                  {/* Remove Asset Modal */}
                  {showRemoveModal && (
                    <div className="fixed inset-0 bg-black/80 bg-opacity-50 flex items-center justify-center z-[100]">
                      <div className="bg-[#010014]  mx-4 border border-white/20 text-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold">
                            Remove Asset
                          </h3>
                          <button
                            onClick={() => setShowRemoveModal(false)}
                            className="text-gray-400 cursor-pointer hover:text-white"
                          >
                            ✕
                          </button>
                        </div>
                        {loadingWalletAssets ? (
                          <ArrayItemLoader />
                        ) : (
                          (() => {
                            const removableAssets =
                              walletAssets?.allWalletAssets?.filter(
                                (asset: any) => asset?.asset_code !== "NATIVE"
                              );
                            return removableAssets?.length > 0 ? (
                              removableAssets.map(
                                (asset: any, index: number) => (
                                  <div
                                    key={index}
                                    className="flex items-center gap-3 py-2 px-3 hover:bg-[#050d2a] cursor-pointer rounded-md"
                                    onClick={() => {
                                      setSelectedTrustLine(asset);
                                      setShowRemoveModal(false);
                                    }}
                                  >
                                    <img
                                      src={asset?.image}
                                      alt=""
                                      className="w-8 h-8"
                                    />
                                    <div>
                                      <p className="font-medium">
                                        {asset?.asset_name}
                                      </p>
                                      <p className="text-[10px] text-gray-400">
                                        {asset.code === "NATIVE"
                                          ? "XLM"
                                          : asset?.asset_code}
                                      </p>
                                    </div>
                                  </div>
                                )
                              )
                            ) : (
                              <p className="text-center text-gray-500">
                                No assets to remove
                              </p>
                            );
                          })()
                        )}
                      </div>
                    </div>
                  )}
                </>

                {/* Asset Cards Grid */}
                <div className="overflow-y-auto">
                  {loadingWalletAssets ? (
                    <ArrayItemLoader />
                  ) : (
                    walletAssets?.allWalletAssets?.map(
                      (asset: any, index: number) => (
                        <div
                          key={index}
                          className="border-b mb-3 flex items-center justify-between shadow shadow-[#0000001A] p-4 rounded-[5px] border border-white/20 hover:shadow-lg transition cursor-pointer"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <img
                              src={asset?.image}
                              alt=""
                              className="w-10 h-10"
                            />
                            <div>
                              <p className="text-[black] text-[16px] font-semibold">
                                {asset?.asset_name}
                              </p>
                              <p className="text-[11px] text-gray-700">
                                {asset?.asset_code === "NATIVE"
                                  ? "XLM"
                                  : asset?.asset_code}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col justify-between items-end">
                            <p className="text-[20px] font-bold text-black">
                              {formateDecimal(asset?.balance || 0)}
                            </p>
                            <p className="text-[16px] text-gray-500">
                              $
                              {formateDecimal(
                                asset?.equivalentBalanceInUsd || 0
                              )}
                            </p>
                          </div>
                        </div>
                      )
                    )
                  )}
                </div>
              </div>
              <div className='border border-[#FFFFFF]/20 rounded-lg w-full mx-auto'>
                <TransactionGraph address={address} />
              </div>

              {/* <TransactionTable
              name="Crypto Transaction History"
              tableType="crypto"
              loadingTx={loadingTx}
              transactionHistory={transactionHistory}
              setSearchText={setSearchText}
              searchText={searchText}
            /> */}
            </div>
          </div>
        </main>
        <MobileNav />
      </div>

      {selectedTrustLine && (
        <div>
          <div
            style={{
              position: "fixed",
              width: "100%",
              left: "0",
              top: "0",
              zIndex: "99",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100vh",
              background: "rgba(18, 18, 18, 0.8)",
            }}
          >
            <div className="bg-black mx-3" style={{ borderRadius: "10px" }}>
              <div className="text-center  flex items-center justify-center flex-col mt-7">
                <img
                  src={selectedTrustLine.image}
                  className="w-[60px] mb-2"
                  alt=""
                />
                <div>
                  <p className="text-[white]">
                    {selectedTrustLine?.asset_name}
                  </p>
                  <p className="text-[white] text-[12px]">
                    {selectedTrustLine?.asset_code === "NATIVE"
                      ? "XLM"
                      : selectedTrustLine?.asset_code}
                  </p>
                </div>
              </div>

              <div
                className="flex items-center justify-between mt-[1rem] px-[2rem] flex-col"
                style={{ padding: "0 2rem", textAlign: "center" }}
              >
                <p className="text-white text-[15px] mb-2 text-center">
                  Are you sure you want to{" "}
                  <span className="font-[500]">REMOVE</span> this asset from
                  your list of trustlines?
                </p>
              </div>
              <div className="flex items-center gap-4 px-[2rem] mb-8">
                <button
                  className="bg-[#B3261E] cursor-pointer border border-[white]/50 text-white p-3 rounded-lg w-full mt-[2rem]"
                  onClick={() => setSelectedTrustLine(false)}
                  disabled={loading}
                >
                  No
                </button>
                <button
                  className="flex justify-center items-center cursor-pointer border border-white/50 bg-[#0E7BB2] text-white p-3 rounded-lg w-full mt-[2rem]"
                  onClick={handlRemoveTrustLine}
                  disabled={loading}
                >
                  <span>Yes, continue</span>
                  {loading && (
                    <img
                      src="./image/loader.gif"
                      className="w-[20px] mx-2"
                      alt=""
                    />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {selectedAsset && (
        <div>
          <div
            style={{
              position: "fixed",
              width: "100%",
              left: "0",
              top: "0",
              zIndex: "99",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100vh",
              background: "rgba(18, 18, 18, 0.8)",
            }}
          >
            <div className="bg-black mx-3" style={{ borderRadius: "10px" }}>
              <div className="text-center  flex items-center justify-center flex-col mt-7">
                <img
                  src={selectedAsset.image}
                  className="w-[60px] mb-2"
                  alt=""
                />
                <div>
                  <p className="text-[white]">{selectedAsset?.name}</p>
                  <p className="text-[white] text-[12px]">
                    {selectedAsset?.code === "NATIVE"
                      ? "XLM"
                      : selectedAsset?.code}
                  </p>
                </div>
              </div>

              <div
                className="flex items-center justify-between mt-[1rem] px-[2rem] flex-col"
                style={{ padding: "0 2rem", textAlign: "center" }}
              >
                <p className="text-white text-[15px] mb-2 text-center">
                  Are you sure you want to{" "}
                  <span className="font-[500]">ADD</span> this asset from your
                  list of trustlines?
                </p>
              </div>
              <div className="flex items-center gap-4 px-[2rem] mb-8">
                <button
                  className="bg-[#B3261E] border cursor-pointer border-white/50 text-white p-3 rounded-lg w-full mt-[2rem]"
                  onClick={() => setSelectedAsset(false)}
                  disabled={loading}
                >
                  No
                </button>
                <button
                  className="flex justify-center items-center border cursor-pointer border-white/50 bg-[#0E7BB2] text-white p-3 rounded-lg w-full mt-[2rem]"
                  onClick={handleAddTrustLine}
                  disabled={loading}
                >
                  <span>Yes, continue</span>
                  {loading && (
                    <img
                      src="./image/loader.gif"
                      className="w-[20px] mx-2"
                      alt=""
                    />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
    </div>
  );
};

export default Dashboard;
