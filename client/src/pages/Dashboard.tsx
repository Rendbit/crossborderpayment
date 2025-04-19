import React, { useEffect, useState } from "react";
import { GoChevronDown } from "react-icons/go";
import TopNav from "../components/top-nav/TopNav";
import Cookies from "js-cookie";
import Alert from "../components/alert/Alert";
import ArrayItemLoader from "../components/loader/ArrayItemLoader";
import TransactionTable from "../components/table/TransactionTable";
import { useNavigate } from "react-router-dom";
import SideNav from "../components/side-nav/SideNav";
import { getAllTrustLines, getMyAssets } from "../function/horizonQuery";
import { getProfile } from "../function/user";
import {
  addTrustLine,
  getTransactionHistory,
  removeTrustLine,
} from "../function/transaction";
import { formateDecimal } from "../utils";
import AssetProgressBar from "../components/progress-bar/AssetProgressBar";

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

  const navigate = useNavigate();

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      navigate("/login");
    }
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
      }
      setUserData(response.data);
    } catch (error: any) {
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

  return (
    <div>
      <div className="flex items-start">
        <SideNav />

        <div className="w-full lg:w-[84%]  ml-auto">
          <TopNav />
          <div
            className={`py-[10px] px-[15px] mt-[100px] lg:mx-[25px] lg:ml-[40px] mx-[10px] `}
          >
            <div className={`my-6 lg:block hidden`}>
              <p className="text-[white] md:text-[20px] text-[18px]">
                Dashboard
              </p>
            </div>

            <div className={`md:flex grid items-center gap-5`}>
              <div
                className={`bg-gradient-to-b from-[#0E84B2] to-[#0F2267]/5 border  border-[#FFFFFF]/20 text-white pt-3 rounded-lg w-full mx-auto ${
                  loadingWalletAssets
                    ? "animate-pulse from-primary-color to-blue-400"
                    : ""
                }`}
              >
                <div className={`mb-4 px-6 `}>
                  <div className="flex justify-between">
                    <h2 className="text-[#FFFFFF]/70 text-[18px]">
                      <b>BALANCE</b>
                    </h2>
                    <div className="relative mb-[10px] ml-[10px]">
                      <b>
                        <span
                          className="text-[#FFFFFF]/70 inline-flex text-[18px] items-center cursor-pointer"
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
                    <p className="md:text-4xl mt-2 mb-2 text-[white] text-3xl">
                      <b>
                        {selectedCurrency}{" "}
                        {currentPrice?.toFixed(2) || "loading..."}
                      </b>
                    </p>
                  </div>
                  <p className="text-[16px] font-[300] text-[white]">
                    ≈ {convertPrice?.toFixed(2) || "loading..."}{" "}
                    {convertCurrency}
                  </p>
                </div>

                <div className="mt-3 px-6">
                  <AssetProgressBar />
                </div>
                <div className={`flex px-6 gap-4 py-4 rounded-b-lg`}>
                  <button
                    onClick={() => navigate("/deposit")}
                    className="bg-[#0E7BB2] cursor-pointer px-6 text-[12px] md:text-[16px] rounded-[8px]"
                  >
                    Deposit
                  </button>
                  <button
                    onClick={() => navigate("/withdraw")}
                    className="border cursor-pointer border-[#B2B2B27A] text-white py-[6px] px-6 text-[12px] md:text-[16px] rounded-[8px]"
                  >
                    Withdraw
                  </button>
                </div>
              </div>
              <div
                className={`border border-[#FFFFFF]/20 pt-3 rounded-lg w-full mx-auto `}
              >
                <div className={`flex justify-between items-start mb-16 px-3 `}>
                  <div>
                    <p className="md:text-4xl text-[22px] mt-5 mb-2 font-bold text-[white]">
                      {userData?.points}
                      <span className="text-[14px] font-[300] ml-1">
                        {" "}
                        Points{" "}
                      </span>
                    </p>
                  </div>
                </div>
                <div className={`flex bg-[#99AAF961] px-6 py-4 rounded-b-lg `}>
                  <button className="text-white bg-[#0E7BB2] py-[6px] px-4 rounded-md opacity-0">
                    Explore Ecosystem
                  </button>
                </div>
              </div>
            </div>
            <div
              className={`flex flex-col md:flex-row items-center gap-3 mt-5 `}
            >
              <div
                className={`w-full  rounded-[8px] bg-[#010014]  p-5 relative `}
              >
                <div className={`flex items-center justify-between`}>
                  <p className="font-[500] text-[20px]">Assets</p>
                  <div className="flex gap-3 items-center">
                    <button
                      className="bg-[#0E7BB2] cursor-pointer py-[6px] px-6 text-[12px] text-white md:text-[16px] rounded-[8px]"
                      onClick={() => {
                        if (isActivateWalletAlert) {
                          setAlertType("error");
                          setMsg(
                            "Fund your wallet with at least 5 XLM to activate your account."
                          );
                          return;
                        }
                        setDropDown(
                          dropDown === "trustLine" ? false : "trustLine"
                        );
                        setRemoveDropDown(false);
                      }}
                    >
                      Add Asset
                    </button>
                    <button
                      className="bg-[#B3261E] cursor-pointer py-[6px] px-6 text-[12px] text-white md:text-[16px] rounded-[8px]"
                      onClick={() => {
                        if (isActivateWalletAlert) {
                          setAlertType("error");
                          setMsg(
                            "Fund your wallet with at least 5 XLM to activate your account."
                          );
                          return;
                        }
                        setRemoveDropDown(
                          removeDropDown === "trustLine" ? false : "trustLine"
                        );
                        setDropDown(false);
                      }}
                    >
                      Remove Asset
                    </button>
                  </div>
                </div>

                {dropDown === "trustLine" && (
                  <>
                    <div
                      className={`absolute w-full border h-[250px] rounded-[6px] bg-white z-[1] py-3 left-0 overflow-y-scroll mt-5 `}
                    >
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
                              ) &&
                              PUBLIC_ASSETS[key].code !== "native" &&
                              !walletAssetCodes?.includes(
                                PUBLIC_ASSETS[key]?.code
                              )
                          );

                          return availableAssets?.length > 0 ? (
                            availableAssets?.map((key, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 py-3 hover:bg-gray-200 cursor-pointer px-3"
                                onClick={() =>
                                  setSelectedAsset(PUBLIC_ASSETS[key])
                                }
                              >
                                <img
                                  src={PUBLIC_ASSETS[key].image}
                                  alt=""
                                  className="w-[30px]"
                                />
                                <div>
                                  <p className="text-[#1C1C1C]">
                                    {PUBLIC_ASSETS[key].name}
                                  </p>
                                  <p className="text-[9px] text-[#0E0E0E]">
                                    {PUBLIC_ASSETS[key].code === "native"
                                      ? "XLM"
                                      : PUBLIC_ASSETS[key].code}
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-center text-gray-500 py-3">
                              No more assets to add
                            </p>
                          );
                        })()
                      )}
                    </div>
                  </>
                )}
                {removeDropDown === "trustLine" && (
                  <>
                    <div
                      className={`absolute w-full border rounded-[6px] bg-white z-[1] py-3 left-0 overflow-y-scroll mt-5 `}
                      style={{ height: "100%", maxHeight: "330px" }}
                    >
                      {loadingWalletAssets ? (
                        <ArrayItemLoader />
                      ) : (
                        (() => {
                          const removableAssets =
                            walletAssets?.allWalletAssets?.filter(
                              (asset: any) => asset?.asset_code !== "NATIVE"
                            );

                          return removableAssets?.length > 0 ? (
                            removableAssets?.map(
                              (asset: any, index: number) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-2 py-3 hover:bg-gray-200 cursor-pointer px-3"
                                  onClick={() => {
                                    setSelectedTrustLine(asset);
                                  }}
                                >
                                  <img
                                    src={asset?.image}
                                    alt="assset"
                                    className="w-[30px]"
                                  />
                                  <div>
                                    <p className="text-[#1C1C1C]">
                                      {asset?.asset_name}
                                    </p>
                                    <p className="text-[9px] text-[#0E0E0E]">
                                      {asset.code === "NATIVE"
                                        ? "XLM"
                                        : asset?.asset_code}
                                    </p>
                                  </div>
                                </div>
                              )
                            )
                          ) : (
                            <p className="text-center text-gray-500 py-3">
                              No assets to remove
                            </p>
                          );
                        })()
                      )}
                    </div>
                  </>
                )}

                {isActivateWalletAlert ? (
                  <p className="text-black tetx-center flex justify-center items-center align-middle text-[20px] p-5 bg-red-300 rounded-md my-2">
                    {isActivateWalletAlert && activateWalletAlert}
                  </p>
                ) : (
                  <div
                    className="mt-10 overflow-y-scroll"
                    style={{ height: "100%", maxHeight: "430px" }}
                  >
                    {loadingWalletAssets ? (
                      <ArrayItemLoader />
                    ) : (
                      <>
                        {walletAssets?.allWalletAssets?.map(
                          (asset: any, index: number) => {
                            return (
                              <div
                                key={index}
                                className="flex items-center justify-between text-white border-b border-[#E4E7EC99] pb-2 mb-5 cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <img
                                    src={asset?.image}
                                    alt=""
                                    className="w-[30px]"
                                  />
                                  <div>
                                    <p className="text-[white]">
                                      {asset?.asset_name}
                                    </p>
                                    <p className="text-[9px] text-[white]">
                                      {asset?.asset_code === "NATIVE"
                                        ? "XLM"
                                        : asset?.asset_code}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end pr-3 ">
                                  <p className="text-[20px]">
                                    {formateDecimal(asset?.balance || 0)}
                                  </p>
                                  <div className="text-[16px] text-[white] flex items-center gap-[2px]">
                                    <p>
                                      $
                                      {formateDecimal(
                                        asset?.equivalentBalanceInUsd || 0
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <TransactionTable
              name="Crypto Transaction History"
              tableType="crypto"
              loadingTx={loadingTx}
              transactionHistory={transactionHistory}
              setSearchText={setSearchText}
              searchText={searchText}
            />
          </div>
        </div>
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
