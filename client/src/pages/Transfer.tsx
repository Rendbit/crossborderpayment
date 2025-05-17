"use client";

import React, { useEffect, useState } from "react";
import { IoChevronDown } from "react-icons/io5";
import SideNav from "../components/side-nav/SideNav";
import TopNav from "../components/top-nav/TopNav";
import { BsQrCodeScan } from "react-icons/bs";
import Alert from "../components/alert/Alert";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import { makeWithdrawal } from "../function/transaction";
import { getMyAssets } from "../function/horizonQuery";
import { RiBankLine } from "react-icons/ri";
import { formateDecimal } from "../utils";
import WithdrawProvider from "./WithdrawProvider";
import { FiLoader } from "react-icons/fi";
import { FaChevronDown } from "react-icons/fa";

const Transfer: React.FC = () => {
  const settingsTypeArray = ["Address"];
  const [selectedTab, setSelectedTab] = useState<any>(settingsTypeArray[0]);
  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(0);
  const [currencyDropDown, setCurrencyDropDown] = useState<any>(false);
  const [loadingWalletAssets, setLoadingWalletAssets] =
    useState<boolean>(false);
  const userInfoArrayTab = ["Email", "Phone", "Pay ID", "RendBit ID"];
  const [selectedInfo, setSelectedInfo] = useState<any>(userInfoArrayTab[0]);
  const [selectedInfoIndex, setSelectedInfoIndex] = useState<number>(0);
  const [msg, setMsg] = useState<string>("");
  const [alertType, setAlertType] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [assets, setAssets] = useState<any>([]);
  const [selectedAsset, setSelectedAsset] = useState<any>();
  const [currentBalance, setCurrentbalance] = useState<number>(0);
  const [sourceAmount, setSourceAmount] = useState<any>("");
  const [activateWalletAlert, setActivateWalletAlert] = useState<string>("");
  const [isActivateWalletAlert, setIsActivateWalletAlert] =
    useState<boolean>(false);
  const [segment, setSegment] = useState<"fiat" | "crypto">("fiat");

  const user = Cookies.get("token");

  useEffect(() => {
    handleGetMyAssets();
  }, []);
  

  useEffect(() => {
    const storedWalletAssets = localStorage.getItem("walletAssets");
    const parsedWalletAssets = JSON.parse(storedWalletAssets || "null");

    if (!selectedAsset) {
      setAssets(parsedWalletAssets);
      setSelectedAsset(parsedWalletAssets?.allWalletAssets[0]);
      setCurrentbalance(parsedWalletAssets?.allWalletAssets[0].balance || 0);
    }
  }, [assets, loading]);

  async function handleMakeWithdrawal() {
    setLoading(true);
    if (isActivateWalletAlert) {
      setMsg("Fund your wallet with at least 5 XLM to activate your account.");
      setAlertType("error");
      setLoading(false);
      return;
    }

    if (!sourceAmount || !address) {
      setMsg("Please enter both amount and address");
      setAlertType("error");
      setLoading(false);
      return;
    }
    try {
      if (!user) {
        setLoadingWalletAssets(false);
        return;
      }
      const response = await makeWithdrawal(
        Number(sourceAmount),
        address,
        selectedAsset.asset_code,
        "crypto",
        "withdraw",
        {
          amount: Number(sourceAmount),
          assetCode: selectedAsset.asset_code,
          address,
        },
        user
      );
      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        setLoading(false);
        return;
      }
      setCurrentbalance(currentBalance - sourceAmount);
      setSourceAmount("");
      setAddress("");
      setMsg(response.message);
      setAlertType("success");
      await handleGetMyAssets();
    } catch (error: any) {
      setMsg(error.message || "Failed to withdrawal crypto");
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleGetMyAssets() {
    const storedWalletAssets = localStorage.getItem("walletAssets");
    const parsedWalletAssets = JSON.parse(storedWalletAssets || "null");

    if (!parsedWalletAssets) {
      setLoadingWalletAssets(true);
    }
    try {
      if (!user) {
        setLoadingWalletAssets(false);
        return;
      }
      const response = await getMyAssets(user, selectedAsset?.asset_code);

      if (!response.success) {
        if (
          response.message.includes(
            "Fund your wallet with at least 5 XLM to activate your account."
          )
        ) {
          setActivateWalletAlert(response.message);
          setIsActivateWalletAlert(true);
        }
        setMsg(response.message);
        setAlertType("error");
        setLoadingWalletAssets(false);
        return;
      }
      setAssets(response?.data);
      setSelectedAsset(response?.data?.allWalletAssets[0]);
      setCurrentbalance(response?.data?.allWalletAssets[0].balance || 0);
      setSourceAmount("");
      setAddress("");
    } catch (error: any) {
      if (
        error.message.includes(
          "Fund your wallet with at least 5 XLM to activate your account."
        )
      ) {
        setActivateWalletAlert(error.message);
        setIsActivateWalletAlert(true);
      } else {
        setAlertType("error");
        setMsg(error.message || "Failed to get all wallet assets");
      }
    } finally {
      setLoadingWalletAssets(false);
    }
  }

  return (
    <div className="flex items-start">
      <SideNav />
      <div className="w-full lg:w-[84%] ml-auto">
        <TopNav />
        <div className="pb-[30px] md:mt-[70px] lg:mx-[30px] h-[100%] md:fixed lg:w-[84%] w-full">
          <main className="flex-grow px-4 text-white sm:px-10 py-10  overflow-hidden">
            <div className="max-w-6xl  mx-auto">
              {isActivateWalletAlert && (
                <p className="text-black text-center flex justify-center items-center text-[20px] p-5 bg-red-300 rounded-md my-2">
                  {activateWalletAlert}
                </p>
              )}

              <div className="bg-[#050d2a] border border-white/10 rounded-2xl shadow-lg md:p-6 p-2 md:mt-[50px] text-white">
                <div className="text-center mb-8">
                  <div className="inline-block bg-[#0E7BB2] p-3 rounded-full shadow-md">
                    <RiBankLine className="text-white text-xl" />
                  </div>
                  <h1 className="mt-4 text-2xl font-bold">
                    {segment === "fiat"
                      ? "Send Money Securely"
                      : "Send Crypto Securely"}
                  </h1>
                  {segment === "crypto" ? (
                    <p className="text-gray-400 text-sm">
                      Ensure 1.5 XLM remains for gas fee
                    </p>
                  ) : (
                    <p className="text-gray-400 text-sm">
                      Send money to anyone across Africa withour worrying about
                      foriegn accounts and exchange rates
                    </p>
                  )}
                </div>

                <div className="flex justify-center mb-8 space-x-6 text-white">
                  <button
                    onClick={() => setSegment("fiat")}
                    className={`cursor-pointer px-6 py-2 rounded-full transition-colors duration-300 font-semibold ${
                      segment === "fiat"
                        ? "bg-[#0E7BB2] text-white shadow-lg"
                        : "bg-white/10 hover:bg-white/20"
                    }`}
                  >
                    Fiat
                  </button>

                  <button
                    onClick={() => setSegment("crypto")}
                    className={`cursor-pointer px-6 py-2 rounded-full transition-colors duration-300 font-semibold ${
                      segment === "crypto"
                        ? "bg-[#0E7BB2] text-white shadow-lg"
                        : "bg-white/10 hover:bg-white/20"
                    }`}
                  >
                    Crypto
                  </button>
                </div>

                <div className="relative overflow-x-hidden">
                  <div
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{
                      width: "200%",
                      transform:
                        segment === "fiat"
                          ? "translateX(0%)"
                          : "translateX(-50%)",
                    }}
                  >
                    <section className="w-1/2 md:px-4 px-2">
                      <WithdrawProvider />
                    </section>
                    <section className="w-1/2 md:px-4 px-2">
                      <div className="grid gap-6">
                        <div className="flex justify-between items-center bg-white/10 rounded-xl p-4">
                          <div>
                            <p className="text-sm font-medium text-gray-400">
                              Balance
                            </p>
                            <p className="text-lg font-semibold">
                              {currentBalance === 0
                                ? "0"
                                : formateDecimal(currentBalance)}
                            </p>
                          </div>
                          <div
                            className="flex items-center gap-2 cursor-pointer px-3 py-2 bg-[#2A313D] rounded-lg"
                            onClick={() => {
                              if (isActivateWalletAlert) return;
                              setCurrencyDropDown(
                                currencyDropDown === "from" ? false : "from"
                              );
                            }}
                          >
                            <img
                              src={selectedAsset?.image}
                              alt=""
                              className="w-5 h-5"
                            />
                            <span className="uppercase text-sm">
                              {selectedAsset?.asset_code}
                            </span>
                            <IoChevronDown />
                          </div>
                        </div>
                      </div>

                      {currencyDropDown === "from" && (
                        <div className="absolute md:top-[21%] lg:top-[10%] sm:top-[50%] right-2 bg-black text-white rounded-md shadow-md py-2 px-3 max-h-[200px] overflow-y-auto">
                          {assets?.allWalletAssets?.map((asset, index) => (
                            <div
                              key={index}
                              className="flex px-2 items-center gap-3 py-2 cursor-pointer hover:bg-white/50 hover:text-black"
                              onClick={() => {
                                if (loading) return;
                                setSelectedAsset(asset);
                                setCurrencyDropDown(false);
                                setCurrentbalance(asset.balance || 0);
                              }}
                            >
                              <img
                                src={asset.image}
                                alt=""
                                className="w-6 h-6"
                              />
                              <div className="flex gap-2 items-center">
                                <p className="font-medium text-sm">
                                  {asset.asset_name}
                                </p>
                                <p className="text-xs">({asset.asset_code})</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="bg-white/10 my-3 rounded-xl p-4">
                        <p className="text-sm mb-2 text-gray-400">Amount</p>
                        <input
                          type="number"
                          placeholder="Enter amount"
                          disabled={loading}
                          onChange={(e) => setSourceAmount(e.target.value)}
                          className="w-full bg-transparent outline-none text-lg font-semibold"
                        />
                      </div>

                      <div className="bg-white/10 my-3 rounded-xl p-4">
                        <p className="text-sm mb-2 text-gray-400">
                          Recipient Address
                        </p>
                        <input
                          type="text"
                          placeholder="Paste wallet address"
                          disabled={loading}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full bg-transparent outline-none text-base"
                        />
                        <p className="mt-2 text-xs text-gray-400">
                          Rendbit address supported{" "}
                          <span className="text-white">(Coming soon)</span>
                        </p>
                      </div>

                      <div className="bg-white/10 my-3 rounded-xl p-4">
                        <p className="text-sm mb-2 text-gray-400">Network</p>
                        <div className="flex justify-between items-center cursor-pointer">
                          <span className="font-light">Stellar</span>
                          <IoChevronDown />
                        </div>
                        <p className="mt-2 text-xs text-gray-400">
                          Automatically linked to correct network
                        </p>
                      </div>

                      <button
                        onClick={handleMakeWithdrawal}
                        disabled={loading}
                        className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-90 py-3 rounded-xl font-semibold w-full flex items-center justify-center"
                      >
                        <span>Confirm</span>
                        {loading && (
                          <img
                            src="./image/loader.gif"
                            alt=""
                            className="w-5 h-5 ml-3"
                          />
                        )}
                      </button>
                    </section>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
    </div>
  );
};

export default Transfer;
