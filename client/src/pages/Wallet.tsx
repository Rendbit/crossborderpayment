import React, { useEffect, useState } from "react";
import SideNav from "../components/side-nav/SideNav";
import TopNav from "../components/top-nav/TopNav";
import Cookies from "js-cookie";

import ArrayTableLoader from "../components/loader/ArrayTableLoader";
import { useNavigate } from "react-router-dom";
import { getProfile } from "../function/user";
import { getMyAssets } from "../function/horizonQuery";
import { formateDecimal } from "../utils";
import { GoChevronDown } from "react-icons/go";
import AssetProgressBar from "../components/progress-bar/AssetProgressBar";

const Wallet: React.FC = () => {
  const user = Cookies.get("token");
  const [walletAssets, setWalletAssets] = useState<any>([]);
  const [userData, setUserData] = useState<any>();
  const [nairaBal, setNairaBal] = useState<any>(0);
  const [currencyChange, setCurrencyChange] = useState<any>(false);
  const [
    yieldWalletTotalBalanceInSelectedCurrency,
    setYieldWalletTotalBalanceInSelectedCurrency,
  ] = useState<any>(0);
  const [
    nonYieldWalletTotalBalanceInSelectedCurrency,
    setNonYieldWalletTotalBalanceInSelectedCurrency,
  ] = useState<any>(0);
  const navigate = useNavigate();
  const assets = ["NGN", "USDC"];
  const [loadingWalletAssets, setLoadingWalletAssets] = useState<any>(false);
  const [loadingWalletAssetsBalances, setLoadingWalletAssetsBalances] =
    useState<any>(false);
  const [loadingUserData, setLoadingUserData] = useState<any>(false);
  const [yieldAssets, setYieldAssets] = useState<any>([]);
  const [nonYieldAssets, setNonYieldAssets] = useState<any>([]);
  const [walletInfo, setWalletInfo] = useState<any>();
  const [msg, setMsg] = useState<string>("");
  const [alertType, setAlertType] = useState<string>("");
  const [currentPrice, setCurrentPrice] = useState<any>(0);
  const [convertPrice, setConvertPrice] = useState<any>(0);
  const [convertCurrency, setConvertCurrency] = useState<any>("USDC");
  const [activateWalletAlert, setActivateWalletAlert] = useState<string>("");
  const fiataAsets = [
    { symbol: "NGNC", name: "Nigeria Naira", displaySymbol: "NGN" },
    { symbol: "USDC", name: "United State Dollars", displaySymbol: "USD" },
    // { symbol: "GHSC", name: "Ghana Cedis", displaySymbol: "GHS" },
    // { symbol: "KESC", name: "Kenya Shillings", displaySymbol: "KES" },
  ];
  const [isActivateWalletAlert, setIsActivateWalletAlert] =
    useState<boolean>(false);
  const [selectedCurrency, setSelectedCurrency] = useState(
    fiataAsets[0].displaySymbol
  );
  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      navigate("/login");
    }
    handleGetMyAssets();
    handleGetProfile();
  }, []);

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

  async function handleGetMyAssets() {
    const storedWalletAssets = localStorage.getItem("wallet");
    const storedAllWalletTotalBalanceInSelectedCurrency = localStorage.getItem(
      "allWalletTotalBalanceInSelectedCurrency"
    );
    const storedAllWalletTotalBalanceInUsd = localStorage.getItem(
      "allWalletTotalBalanceInUsd"
    );
    const storedNonYieldWalletTotalBalanceInSelectedCurrency =
      localStorage.getItem("nonYieldWalletTotalBalanceInSelectedCurrency");
    const storedYieldWalletTotalBalanceInSelectedCurrency =
      localStorage.getItem("yieldWalletTotalBalanceInSelectedCurrency");
    const storedYieldWalletAssets = localStorage.getItem("yieldWalletAssets");
    const storedNonYieldWalletAssets = localStorage.getItem(
      "nonYieldWalletAssets"
    );
    const parsedWalletAssets = JSON.parse(storedWalletAssets || "null");
    const parsedAllWalletTotalBalanceInSelectedCurrency = JSON.parse(
      storedAllWalletTotalBalanceInSelectedCurrency || "null"
    );
    const parsedAllWalletTotalBalanceInUsd = JSON.parse(
      storedAllWalletTotalBalanceInUsd || "null"
    );
    const parsedYieldWalletTotalBalanceInSelectedCurrency = JSON.parse(
      storedYieldWalletTotalBalanceInSelectedCurrency || "null"
    );
    const parsedNonYieldWalletTotalBalanceInSelectedCurrency = JSON.parse(
      storedNonYieldWalletTotalBalanceInSelectedCurrency || "null"
    );
    const parsedYieldWalletAssets = JSON.parse(
      storedYieldWalletAssets || "null"
    );
    const parsedNonYieldWalletAssets = JSON.parse(
      storedNonYieldWalletAssets || "null"
    );

    if (
      parsedWalletAssets &&
      parsedAllWalletTotalBalanceInSelectedCurrency &&
      parsedAllWalletTotalBalanceInUsd
    ) {
      setWalletAssets(parsedWalletAssets);
      setCurrentPrice(parsedAllWalletTotalBalanceInSelectedCurrency);
      setConvertPrice(parsedAllWalletTotalBalanceInUsd);
      setYieldWalletTotalBalanceInSelectedCurrency(
        parsedYieldWalletTotalBalanceInSelectedCurrency
      );
      setNonYieldWalletTotalBalanceInSelectedCurrency(
        parsedNonYieldWalletTotalBalanceInSelectedCurrency
      );
      setYieldAssets(parsedYieldWalletAssets);
      setNonYieldAssets(parsedNonYieldWalletAssets);
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
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingWalletAssets(false);
      setLoadingWalletAssetsBalances(false);
    }
  }

  return (
    <div>
      <div className="flex items-start">
        <SideNav />
        <div className="w-full lg:w-[84%]  ml-auto">
          <TopNav />
          <div
            className={`lg:px-[20px] px-[10px] py-[30px]  mt-[70px] lg:mx-[25px] mx-[10px] `}
          >
            <div className="mb-6 flex items-end justify-between">
              <p className="text-[#ffffff] font-[500] md:text-[24px] text-[18px]">
                My Wallet
              </p>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-5">
              {/* <div
                className={`rounded-lg bg-gradient-to-r from-primary-color to-blue-400 w-full mx-auto  md:pt-[5rem] pt-[2rem] pb-[0.5rem] md:pb-[1rem] `}
              >
                <div className="flex justify-between items-start mb-4 px-6">
                  <div>
                    <h2 className="text-white text-[14px] tracking-[2.4px]">
                      TOTAL BALANCE
                    </h2>
                    <div className="flex items-end">
                      <p className="md:text-4xl mt-2 mb-2 text-white text-3xl">
                        {currentPrice?.toFixed(2) || "loading..."}
                      </p>
                      <div className="relative mb-[10px] ml-[10px]">
                        <span
                          className="text-sm inline-flex items-center text-white cursor-pointer"
                          onClick={() => setCurrencyChange(!currencyChange)}
                        >
                          {selectedAsset}
                          <GoChevronDown />
                        </span>
                        {currencyChange && (
                          <div className="absolute  border rounded shadow">
                            {assets.map((currency) => (
                              <p
                                key={currency}
                                className="px-2 text-white py-1 cursor-pointer"
                                onClick={() => {
                                  setCurrencyChange(false);
                                  setSelectedAsset(currency);
                                  if (currency === "NGN") {
                                    setCurrentPrice(
                                      walletInfo.allWalletTotalBalanceInNgn
                                    );
                                    setConvertPrice(
                                      walletInfo.allWalletTotalBalanceInUsd
                                    );
                                    setConvertCurrency("USD");
                                  } else {
                                    setConvertCurrency("NGN");
                                    setConvertPrice(
                                      walletInfo.allWalletTotalBalanceInNgn
                                    );
                                    setCurrentPrice(
                                      walletInfo.allWalletTotalBalanceInUsd
                                    );
                                  }
                                }}
                              >
                                {currency}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-[16px] font-[300] text-white">
                      ≈ {formateDecimal(convertPrice) || "loading..."}{" "}
                      {convertCurrency}
                    </p>
                  </div>
                </div>
              </div> */}

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
                          {fiataAsets.map((currency, index) => (
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
                  <div className="mt-5">
                    <AssetProgressBar />
                  </div>
                </div>
              </div>
              <div className="w-full border border-white/20 p-5 rounded-md">
                <div
                  className={`pt-[2rem] px-6 pb-[0.5rem]  border border-[#B2B2B27A] mb-[0.6rem] rounded-lg `}
                >
                  <p className="text-white text-[14px] tracking-[2.4px]">
                    SPENDABLE BALANCE
                  </p>
                  <p className="text-2xl mt-3 text-[white]">
                    {formateDecimal(
                      nonYieldWalletTotalBalanceInSelectedCurrency
                    ) || "loading..."}{" "}
                    NGN
                  </p>
                  <p className="text-[16px] font-[300] text-[white]">
                    ≈{" "}
                    {formateDecimal(
                      walletAssets?.nonYieldWalletTotalBalanceInUsd
                    ) || "loading..."}{" "}
                    USD
                  </p>
                </div>

                <div
                  className={` pt-[2rem] px-6 pb-[0.5rem] border border-[#B2B2B27A] rounded-lg`}
                >
                  <p className="text-white text-[14px] tracking-[2.4px]">
                    SAVINGS BALANCE
                  </p>
                  <p className="text-2xl mt-3 text-white">
                    {formateDecimal(
                      yieldWalletTotalBalanceInSelectedCurrency
                    ) || "loading..."}
                  </p>
                  <p className="text-[16px] font-[300] text-white">
                    ≈{" "}
                    {formateDecimal(
                      walletAssets?.yieldWalletTotalBalanceInUsd
                    ) || "loading..."}{" "}
                    USD
                  </p>
                </div>
              </div>
            </div>
            <div
              className={`rounded-lg w-full mx-auto border border-[#B2B2B27A] p-[1rem] mt-[1rem]`}
            >
              <p className="text-white">Spendable assets</p>
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm text-left rtl:text-left mt-[1rem]">
                  <thead className="text-[12px] text-white">
                    <tr>
                      <th scope="col" className="py-3 th1 font-[400]">
                        Name
                      </th>
                      <th scope="col" className="py-3 font-[400] px-6">
                        Amount
                      </th>
                      <th scope="col" className="py-3 font-[400]">
                        Action
                      </th>
                    </tr>
                  </thead>
                  {loadingWalletAssets ? (
                    <ArrayTableLoader number={2} />
                  ) : (
                    <tbody>
                      {nonYieldAssets?.map((asset) => (
                        <tr
                          className=" text-white gap-2 text-[12px] border-b"
                          key={asset.asset_code}
                        >
                          <td className="flex py-4 whitespace-nowrap items-center gap-2">
                            <img
                              src={asset.image}
                              width="32px"
                              alt={asset.asset_name}
                            />
                            <div>
                              {/* <p className="whitespace-nowrap gap-2 text-white">
                                {asset.asset_name}
                              </p> */}
                              <p className="whitespace-nowrap gap-2 text-white">
                                {asset.asset_code}
                              </p>
                            </div>
                          </td>
                          <td className="whitespace-nowrap py-4 px-6">
                            {asset.balance}
                          </td>
                          <td className="flex py-4 items-center gap-2">
                            <p
                              className=" text-white bg-[#0E7BB2] py-[3px] px-2 rounded-[4px] cursor-pointer"
                              onClick={() => {
                                if (asset.asset_name.includes("NGN")) {
                                  navigate("/deposit-fiat");
                                } else {
                                  navigate("/deposit-crypto");
                                }
                              }}
                            >
                              Deposit
                            </p>
                            <p
                              className=" text-white bg-[#0E7BB2] py-[3px] px-2 rounded-[4px] cursor-pointer"
                              onClick={() =>
                                navigate("/withdraw-currency/crypto")
                              }
                            >
                              Withdraw
                            </p>
                            <p
                              className="whitespace-nowrap text-white bg-[#0E7BB2] py-[3px] px-2 rounded-[4px] cursor-pointer"
                              onClick={() => navigate("/swap")}
                            >
                              Convert
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  )}
                </table>
              </div>
            </div>
            <div className="rounded-lg border border-[#B2B2B27A] w-full mx-auto   p-[1rem] mt-[1rem]">
              <p className="text-white">Saved assets</p>
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm text-left rtl:text-left mt-[1rem]">
                  <thead className="text-[12px] text-white">
                    <tr>
                      <th scope="col" className="py-3 th1 font-[400]">
                        Name
                      </th>
                      <th scope="col" className="py-3 font-[400] px-6">
                        Locked
                      </th>
                      <th scope="col" className="py-3 font-[400]">
                        Action
                      </th>
                    </tr>
                  </thead>
                  {loadingWalletAssets ? (
                    <ArrayTableLoader number={2} />
                  ) : (
                    <tbody>
                      {yieldAssets?.map((asset) => (
                        <tr
                          className="text-[12px] tetx-white border-b"
                          key={asset.asset_code}
                        >
                          <td className="flex py-4 items-center gap-2">
                            <img
                              src={asset.image}
                              width="32px"
                              alt={asset.asset_name}
                            />
                            <div>
                              {/* <p className="whitespace-nowrap gap-2 text-white">
                                {asset.asset_name}
                              </p> */}
                              <p className="whitespace-nowrap gap-2 text-white">
                                {asset.asset_code}
                              </p>
                            </div>
                          </td>
                          <td className="whitespace-nowrap gap-2 py-4 px-6 text-white">
                            {asset.balance}
                          </td>
                          <td className="py-4 flex items-center gap-2">
                            {/* <p
                              className="whitespace-nowrap text-white bg-[#0E7BB2] py-[3px] px-2 rounded-[4px] cursor-pointer"
                              onClick={() =>
                                navigate("/deposit-currency/crypto")
                              }
                            >
                              Deposit
                            </p>
                            <p
                              className="whitespace-nowrap text-white bg-[#0E7BB2] py-[3px] px-2 rounded-[4px] cursor-pointer"
                              onClick={() =>
                                navigate("/withdraw-currency/crypto")
                              }
                            >
                              Withdraw
                            </p> */}
                            <p
                              className="flex text-white bg-[#0E7BB2] py-[3px] px-2 rounded-[4px] cursor-pointer"
                              onClick={() => navigate("/swap")}
                            >
                              Convert
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  )}
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wallet;
