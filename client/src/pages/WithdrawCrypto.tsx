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

const WithdrawCrypto: React.FC = () => {
  const settingsTypeArray = ["Address"];
  const [selectedTab, setSelectedTab] = useState<any>(settingsTypeArray[0]);
  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(0);
  const [currencyDropDown, setCurrencyDropDown] = useState<any>(false);
  const [loadingWalletAssets, setLoadingWalletAssets] =
    useState<boolean>(false);
  const userInfoArrayTab = ["Email", "Phone", "Pay ID", "Mammon ID"];
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
  }, [assets]);

  async function handleMakeWithdrawal() {
    setLoading(true);
    if (isActivateWalletAlert) {
      setMsg("Fund your wallet with at least 5 XLM to activate your account.");
      setAlertType("error");
      return;
    }
    if (!sourceAmount || !address) {
      setMsg("Please enter both amount and address");
      setAlertType("error");
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
      const response = await getMyAssets(user, selectedAsset);

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
    <div>
      <div className="flex items-start">
        <SideNav />
        <div className="lg:w-[84%] w-full ml-auto">
          <TopNav />
          <div className="py-[20px] px-[10px] h-[100vh] mt-[70px] md:mx-[50px] mx-[5px]">
            <div className="mt-5 ml-1">
              <p className="text-white text-[20px] md:text-[36px]">
                Withdraw Crypto
              </p>
            </div>
            {isActivateWalletAlert && (
              <p className="text-black tetx-center flex justify-center items-center align-middle text-[20px] p-5 bg-red-300 rounded-md my-2">
                {isActivateWalletAlert && activateWalletAlert}
              </p>
            )}

            <div className="border border-[#FFFFFF]/50 p-3 rounded-[11px]">
              <div>
                <img src={selectedAsset?.image} alt="" width="25px" />

                <div className="ml-1 hidden lg:block">
                  <p className="text-white text-[24px] font-semibold">
                    Choose preferred crypto
                  </p>
                  <p className="font-[300] text-[#ffffff]">
                    Leave at least 1.5XLM for gas fee
                  </p>
                </div>
              </div>
              <div className="pt-[2rem] flex justify-center items-center mt-5 flex-col">
                <h1 className="text-white">
                  Send money to self or business partners
                </h1>
                <div className="py-6 mt-5 px-[20px] border border-[#FFFFFF]/50 rounded-[8px] shadow max-w-[7500px]">
                  <div className="mb-4">
                    <div className="flex justify-between items-center">
                      <p className="flex text-[#ffffff] text-[14px] font-semibold">
                        <b>Withdrawal amount</b>
                      </p>
                      <div className="flex text-[14px] font-semibold">
                        <p className="text-[#ffffff] mr-1">Balance:</p>
                        <span className={`text-white`}>
                          {currentBalance == 0
                            ? "0"
                            : currentBalance?.toFixed(8)}
                        </span>
                      </div>
                    </div>
                    <small className="text-[#ffffff]">
                      Leave at least 1.5 XLM for gas fee
                    </small>

                    <div className="relative pt-8 text-white">
                      <span className="text-[12px] font-semibold">AMOUNT</span>
                      <div className="flex justify-between border border-[#ffffff]/50 bg-[#FFFFFF]/20 rounded-[10px] relative z-[12] p-2 items-center">
                        <div className="flex item-center gap-2">
                          <div
                            className="flex items-center bg-[#FFFFFF]/30 rounded-[10px] p-2 cursor-pointer"
                            onClick={() => {
                              if (isActivateWalletAlert) {
                                return;
                              }

                              setCurrencyDropDown(
                                currencyDropDown === "from" ? false : "from"
                              );
                            }}
                          >
                            <img
                              src={selectedAsset?.image}
                              alt=""
                              width="20px"
                            />
                            <p className="mr-3 ml-1 text-[12px] uppercase">
                              {selectedAsset?.asset_code}
                            </p>
                            <IoChevronDown />
                          </div>
                          <input
                            type="number"
                            disabled={loading}
                            onChange={(e) => setSourceAmount(e.target.value)}
                            className="outline-none w-1/2  bg-transparent text-[#ffffff]"
                            placeholder="Enter amount"
                          />
                        </div>
                      </div>
                      {currencyDropDown === "from" && (
                        <div className="absolute bg-[white] mt-[89px] rounded-[10px] w-full pt-3 pb-3 z-[11] top-[18px] shadow-md">
                          {assets?.allWalletAssets?.map((asset, index) => (
                            <div
                              key={index}
                              className="py-2 px-4 cursor-pointer hover:bg-[#D2D9F542]"
                              onClick={() => {
                                if (loading) return;
                                setSelectedAsset(asset);
                                setCurrencyDropDown(false);
                                setCurrentbalance(asset.balance || 0);
                              }}
                            >
                              <div
                                key={index}
                                className="flex items-center gap-2"
                              >
                                <img src={asset.image} alt="" width="25px" />
                                <div>
                                  <p className="text-[#000000] font-[300] text-[14px]">
                                    {asset.asset_name}
                                  </p>
                                  <p className="text-[10px] text-[#000000]">
                                    {asset.asset_code}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-4 mt-10">
                    {/* <div>
                      <p className="text-[#ffffff] text-[12px] font-semibold">
                        SEND TO
                      </p>
                      <div className="flex items-center bg-[#FFFFFF]/20 rounded-[10px] mt-4">
                        {settingsTypeArray.map((item, index) => {
                          return (
                            <p
                              key={index}
                              className={`px-[.8rem] pb-[18px] font-[300] text-[#ffffff] cursor-pointer ${
                                selectedTabIndex === index
                                  ? "text-white"
                                  : ""
                              }`}
                              onClick={() => {
                                if (loading) return;
                                setSelectedTab(item);
                                setSelectedTabIndex(index);
                              }}
                            >
                              {item}
                            </p>
                          );
                        })}
                      </div>
                    </div> */}
                    {selectedTab === "Address" && (
                      <div className="mt-5">
                        <p className="text-[#ffffff] text-[12px] font-semibold">
                          RECIPIENT ADDRESS
                        </p>
                        <div className="flex border border-[#ffffff]/50 bg-[#FFFFFF]/20  justify-between mt-2 rounded-[10px] px-3 py-3 items-center">
                          <input
                            onChange={(e) => setAddress(e.target.value)}
                            type="text"
                            placeholder="Enter recipient address..."
                            disabled={loading}
                            className="bg-transparent  text-[#ffffff] font-[300] outline-none w-[90%]"
                          />
                        </div>
                        <p className="text-[#ffffff] py-2 px-2 text-[12px] font-[300]">
                          It’s a RebdBit account. Send instantly and 0 fee via
                          rendbitID:{" "}
                          <span className="text-white">(Coming soon ***)</span>
                        </p>
                      </div>
                    )}

                    {/* {selectedTab === "User Info" && (
                      <div className="mt-10">
                        <div className="flex items-center gap-[1rem] mb-3">
                          {userInfoArrayTab.map((info, index) => (
                            <p
                              key={index}
                              onClick={() => {
                                if (loading) return;
                                setSelectedInfo(info);
                                setSelectedInfoIndex(index);
                              }}
                              className={`bg-[#EEF0F7] py-1 px-2 rounded-[4px] ${
                                selectedInfoIndex === index ? "text-white" : ""
                              } text-[12px] font-[300] cursor-pointer`}
                            >
                              {info}
                            </p>
                          ))}
                        </div>
                        <div className="flex justify-between mt-2 bg-[#F1F1F1] rounded-[8px] p-3 items-center">
                          <p className="text-[#414553] font-[300]">
                            {selectedInfo === "Email"
                              ? `Enter your email`
                              : selectedInfo === "Phone"
                              ? `Enter your phone number`
                              : selectedInfo === "Pay ID"
                              ? `My Pay ID`
                              : `Enter your Pay ID`}
                          </p>
                        </div>
                        <p className="text-[#ffffff] py-4 px-2 bg-[#D2D9F542] rounded-[6px] mt-2 text-[12px] font-[300]">
                          It’s a Mammon account. Send instantly and 0 fee via
                          PayID: <span className="text-white">****</span>
                        </p>
                      </div>
                    )} */}

                    {/* {selectedTab === "Transaction" && (
                      <div className="mt-5">
                        <div className="flex items-center justify-between bg-[#FFF] rounded-[8px] p-3 border shadow">
                          <input
                            type="text"
                            placeholder="To: Name or address"
                            className="outline-none bg-transparent"
                          />
                          <BsQrCodeScan className="text-[#ffffff]" />
                        </div>
                        <p className="text-[#414553] text-[14px] my-5">
                          Recently Used
                        </p>
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <BsQrCodeScan className="text-[#ffffff]" />
                              <div>
                                <p className="text-[14px]">Ben Charles</p>
                                <p className="text-[#ffffff] text-[14px]">
                                  CvDQ...WcVn
                                </p>
                              </div>
                            </div>
                            <p className="text-[#ffffff] text-[14px]">
                              Yesterday
                            </p>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <BsQrCodeScan className="text-[#ffffff]" />
                              <div>
                                <p className="text-[14px]">Ben Charles</p>
                                <p className="text-[#ffffff] text-[14px]">
                                  CvDQ...WcVn
                                </p>
                              </div>
                            </div>
                            <p className="text-[#ffffff] text-[14px]">
                              Yesterday
                            </p>
                          </div>
                        </div>
                      </div>
                    )} */}

                    {selectedTab !== "Transaction" && (
                      <div className="mt-8">
                        <p className="text-[#ffffff] text-[12px] font-semibold">
                          Network
                        </p>
                        <div className="flex items-center mt-1 justify-between cursor-pointer mb-1 py-[10px] border border-[#B2B2B27A] rounded-[6px] px-2 shadow-s bg-transparent">
                          <p className="text-[#ffffff] font-[300]">Stellar</p>
                          <IoChevronDown />
                        </div>
                        <p className="font-[300] text-white text-[12px]">
                          Wallet address automatically matched to corresponding
                          network
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleMakeWithdrawal}
                    disabled={loading}
                    className="flex justify-center items-center bg-[#0E7BB2] text-white p-3 rounded-lg w-full mt-[2rem]"
                  >
                    <span>Confirm</span>
                    {loading && (
                      <img
                        src="./images/loader.gif"
                        className="w-[20px] mx-2"
                        alt=""
                      />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
    </div>
  );
};

export default WithdrawCrypto;
