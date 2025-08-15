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

const WithdrawCrypto: React.FC = () => {
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
    <div className="flex items-start h-screen overflow-hidden">
      <SideNav />
      <div className="lg:w-[84%] w-full ml-auto flex flex-col h-full">
        <TopNav />
        <div className="flex-1 overflow-y-hidden py-5 px-[10px] md:mt-[70px] md:px-[50px]">
          <div className="mt-5 ml-1 flex items-center gap-3">
            <div className="bg-white p-2 rounded-full flex items-center justify-center">
              <RiBankLine className="text-primary-color text-[22px]" />
            </div>
            <p className="text-white text-[20px] md:text-[24px]">
              Withdraw Crypto
            </p>
          </div>

          {isActivateWalletAlert && (
            <p className="text-black text-center flex justify-center items-center text-[20px] p-5 bg-red-300 rounded-md my-2">
              {activateWalletAlert}
            </p>
          )}

          <div className="bg-[#0A061C] border border-white/20 rounded-2xl shadow-lg p-6 md:mt-[50px] text-white">
            <div className="text-center mb-8">
              <h2 className="text-[26px] font-bold mb-1">
                Send Crypto Securely
              </h2>
              <p className="text-sm text-gray-300">
                Ensure 1.5 XLM remains for gas fee
              </p>
            </div>

            <div className="grid gap-6">
              <div className="flex justify-between items-center bg-[#1C222D] rounded-xl p-4">
                <div>
                  <p className="text-sm font-medium text-gray-400">Balance</p>
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
                  <img src={selectedAsset?.image} alt="" className="w-5 h-5" />
                  <span className="uppercase text-sm">
                    {selectedAsset?.asset_code}
                  </span>
                  <IoChevronDown />
                </div>
              </div>

              {currencyDropDown === "from" && (
                <div className="bg-white text-black rounded-md shadow-md py-2 px-3 max-h-[200px] overflow-y-auto">
                  {assets?.allWalletAssets?.map((asset, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-200"
                      onClick={() => {
                        if (loading) return;
                        setSelectedAsset(asset);
                        setCurrencyDropDown(false);
                        setCurrentbalance(asset.balance || 0);
                      }}
                    >
                      <img src={asset.image} alt="" className="w-6 h-6" />
                      <div>
                        <p className="font-medium text-sm">
                          {asset.asset_name}
                        </p>
                        <p className="text-xs">{asset.asset_code}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-[#1C222D] rounded-xl p-4">
                <p className="text-sm mb-2 text-gray-400">Amount</p>
                <input
                  type="number"
                  placeholder="Enter amount"
                  disabled={loading}
                  onChange={(e) => setSourceAmount(e.target.value)}
                  className="w-full bg-transparent outline-none text-lg font-semibold"
                />
              </div>

              <div className="bg-[#1C222D] rounded-xl p-4">
                <p className="text-sm mb-2 text-gray-400">Recipient Address</p>
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

              <div className="bg-[#1C222D] rounded-xl p-4">
                <p className="text-sm mb-2 text-gray-400">Network</p>
                <div className="flex justify-between items-center cursor-pointer border border-gray-300 px-3 py-2 rounded-[7px]">
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
            </div>
          </div>
        </div>
      </div>
      {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
    </div>
  );
};

export default WithdrawCrypto;
