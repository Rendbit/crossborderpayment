import React, { useEffect, useRef, useState } from "react";
import { IoChevronDown } from "react-icons/io5";
import SideNav from "../components/side-nav/SideNav";
import TopNav from "../components/top-nav/TopNav";
import Cookies from "js-cookie";
import Alert from "../components/alert/Alert";
import { getConversionRates, getMyAssets } from "../function/horizonQuery";
import { formateDecimal } from "../utils";
import { swapAssets } from "../function/transaction";
import { RiBankLine } from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import MobileNav from "../components/mobile-nav/MobileNav";

const Swap: React.FC = () => {
  const user = Cookies.get("token");
  const [currencyDropDown, setCurrencyDropDown] = useState<any>(false);
  const [assets, setAssets] = useState<any>([]);
  const [selectedAsset, setSelectedAsset] = useState<any>();
  const [selectedAssetReceive, setSelectedAssetReceive] = useState<any>();
  const [currentBalance, setCurrentbalance] = useState<any>(0);
  const [sourceAmount, setSourceAmount] = useState<any>();

  const [msg, setMsg] = useState<any>("");
  const [alertType, setAlertType] = useState<any>("");

  const [loading, setLoading] = useState<any>(false);
  const [value, setValue] = useState<any>(2.75);
  const [loadingWalletAssets, setLoadingWalletAssets] = useState<any>(false);
  const [activateWalletAlert, setActivateWalletAlert] = useState<string>("");
  const [isActivateWalletAlert, setIsActivateWalletAlert] =
    useState<boolean>(false);
  const [selectedCurrency, setSelectedCurrency] = useState(
    assets && assets.length ? assets[0] : []
  );
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [rateExchange, setExchangeRate] = useState<number | string>("");
  const [descAmount, setDescAmount] = useState<number | string>("");
  const [next, setNext] = useState<boolean>(false);
  const [swap, setSwap] = useState<boolean>(false);
  const [swapping, setSwapping] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!sourceAmount) {
      setNext(false);
      setSwap(false);
    }
  }, [sourceAmount, descAmount]);

  const handleInputCurrencyChange = (currencySymbol: string, value: number) => {
    const currency = assets.allWalletAssets.find(
      (cur: any) => cur.asset_code === currencySymbol
    );
    console.log({
      inputAsset: currencySymbol,
      amount: value,
      outputAsset: selectedAsset.asset_code,
    });
    if (currency && sourceAmount) {
      fetchXlmRate(value, currencySymbol, selectedAsset.asset_code);
    }
  };

  const handleOuputCurrencyChange = (currencySymbol: string, value: number) => {
    const currency = assets.allWalletAssets.find(
      (cur: any) => cur.asset_code === currencySymbol
    );
    console.log({
      inputAsset: selectedAsset.asset_code,
      amount: value,
      outputAsset: currencySymbol,
    });
    if (currency && sourceAmount) {
      fetchXlmRate(value, selectedAsset.asset_code, currencySymbol);
    }
  };

  const fetchXlmRate = async (
    amount: number,
    inputAsset: string,
    outputAsset: string
  ) => {
    if (amount) {
      setProcessing(true);

      try {
        if (!user) {
          setLoadingWalletAssets(false);
          return;
        }
        // console.log({ amount, inputAsset, outputAsset });
        const response = await getConversionRates(
          user,
          Number(amount),
          inputAsset,
          outputAsset
        );
        setDescAmount(response.data.convertedAmount);
        setExchangeRate(response.data.rate);
      } catch (error) {
        console.error("Error fetching XLM conversion rate:", error);
      } finally {
        setProcessing(false);
      }
    } else {
      setDescAmount("");
    }
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!isNaN(Number(value))) {
      setSourceAmount(value);
    }
    if (!value) {
      setDescAmount("");
    }
  };

  const handleMax = (value: number) => {
    setSourceAmount(value);
  };

  const formatNumberWithCommas = (number: number | string): string => {
    return Number(number).toLocaleString();
  };

  const handleChange = (e) => {
    setValue(e.target.value);
  };

  useEffect(() => {
    const storedWalletAssets = localStorage.getItem("walletAssets");
    const parsedWalletAssets = JSON.parse(storedWalletAssets || "null");

    if (!selectedAsset) {
      setAssets(parsedWalletAssets);
      setSelectedAsset(parsedWalletAssets?.allWalletAssets[0]);
      setCurrentbalance(parsedWalletAssets?.allWalletAssets[0].balance);
    }
  }, [assets]);

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
        if (response.message === "Login has expired") {
          localStorage.clear();
          Cookies.remove("token");
          navigate("/login");
        }
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
      if (error.message === "Login has expired") {
        localStorage.clear();
        Cookies.remove("token");
        navigate("/login");
      }
      if (
        error.message.includes(
          "Fund your wallet with at least 5 XLM to activate your account."
        )
      ) {
        setActivateWalletAlert(error.message);
        setIsActivateWalletAlert(true);
      } else {
        console.log(error);
        setAlertType("error");
        setMsg(error.message || "Failed to get all wallet assets");
      }
    } finally {
      setLoadingWalletAssets(false);
    }
  }

  const handleNext = () => {
    if (sourceAmount && descAmount) {
      setNext(true);
    }
  };

  async function handleSwapAssets() {
    setLoading(true);
    if (!selectedAsset || !selectedAssetReceive) {
      setMsg("Please select assets to swap.");
      setAlertType("error");
      setLoading(false);
      return;
    }

    if (selectedAsset.asset_code === selectedAssetReceive.asset_code) {
      setMsg("Please select different assets.");
      setAlertType("error");
      setLoading(false);
      return;
    }

    if (!sourceAmount || Number(sourceAmount) <= 0) {
      setMsg("Please enter a valid amount.");
      setAlertType("error");
      setLoading(false);
      return;
    }

    if (Number(selectedAsset.balance) < Number(sourceAmount)) {
      setMsg("Insufficient balance.");
      setAlertType("error");
      setLoading(false);
      return;
    }

    if (Number(sourceAmount) < 0.0000001) {
      setMsg("The amount is too small.");
      setAlertType("error");
      setLoading(false);
      return;
    }

    try {
      if (!user) {
        setLoadingWalletAssets(false);
        return;
      }

      const response = await swapAssets(
        user,
        selectedAsset.asset_code,
        selectedAssetReceive.asset_code,
        Number(sourceAmount),
        Number(value)
      );

      if (!response.success) {
        if (response.message === "Login has expired") {
          localStorage.clear();
          Cookies.remove("token");
          navigate("/login");
        }
        setMsg(response.message);
        setAlertType("error");
        setLoading(false);
        return;
      }

      await handleGetMyAssets();
      setAlertType("success");
      setSourceAmount("");
      setSwap(true);
      setSwapping(true);
      setDescAmount("");
      setCurrentbalance(currentBalance - Number(sourceAmount));
      setValue(2.75);
      setSwap(false);
      setNext(false);
      setSwapping(false);
      setAlertType("success");
      setMsg(
        ` ${selectedAsset.asset_code} ${formatNumberWithCommas(
          sourceAmount
        )} swapped to  ${formatNumberWithCommas(Number(descAmount))} 
        ${selectedCurrency}
        
        successfully.`
      );
    } catch (error: any) {
      if (error.message === "Login has expired") {
        localStorage.clear();
        Cookies.remove("token");
        navigate("/login");
      }
      setMsg(error.message || "An error occurred. Please try again.");
      console.log(error);
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    handleGetMyAssets();
  }, []);

  const filteredReceiveAssets = assets?.allWalletAssets?.filter(
    (asset: any) =>
      !(
        selectedAsset?.asset_code === "NGNC" &&
        ["BTC", "ETH", "yETH"].includes(asset?.asset_code)
      ) &&
      !(
        selectedAsset?.asset_code === "BTC" &&
        ["NGNC"].includes(asset?.asset_code)
      ) &&
      !(
        selectedAsset?.asset_code === "ETH" &&
        ["NGNC"].includes(asset?.asset_code)
      ) &&
      !(
        selectedAsset?.asset_code === "yETH" &&
        ["NGNC"].includes(asset?.asset_code)
      )
  );

  useEffect(() => {
    if (selectedAssetReceive?.asset_code === selectedAsset?.asset_code) {
      setSelectedAsset(false);
    }
  }, [selectedAssetReceive]);
  useEffect(() => {
    if (selectedAsset?.asset_code === selectedAssetReceive?.asset_code) {
      setSelectedAssetReceive(false);
    }
  }, [selectedAsset]);

  const filteredFromAssets = assets?.allWalletAssets?.filter(
    (asset) =>
      !(
        selectedAssetReceive?.asset_code === "NGNC" &&
        ["BTC", "ETH", "yETH"].includes(asset?.asset_code)
      )
  );

  return (
    <div className="w-full md:grid grid-cols-12">
      <div className="md:block hidden h-[100vh] sidebar p-4 pr-2 ">
        <SideNav />
      </div>
      <div className="py-6 overflow-hidden h-[100px] w-full z-50 sticky md:top-[-2%] top-0">
        <TopNav page="Swap" />
      </div>
      <div
        className={`text-white  main-container md:pl-[60px] px-4 pl-2 w-full overflow-hidden md:col-span-10 col-span-12 ${
          !next ? " mt-[70px]" : " mt-[-20px]"
        }`}
      >
        <main
          className={`flex-grow md:px-[24%] px-0 left-0 right-0 w-full  ${
            next ? "md:pt-[80px] " : "md:mt-[70px]"
          } text-white  pb-5  overflow-hidden`}
        >
          <div className="bg-[#050d2a] border border-white/10 rounded-2xl shadow-lg md:p-6 md:px-2 px-4 md:mt-[50px] text-white">
            <div className="text-center mb-8">
              <div className="inline-block bg-[#0E7BB2] mt-4 p-3 rounded-full shadow-md">
                <RiBankLine className="text-white text-xl" />
              </div>
              <h1 className="mt-4 text-2xl font-bold">Swap Asset</h1>
              <p className="text-gray-400 text-sm">
                Choose your crypto and wait for the transaction to complete.
              </p>
              <p className="text-gray-400 text-sm">
                Leave at least 1.5XLM for gas fee
              </p>
            </div>
            <div className="rounded-[11px] mt-[-50px] w-full py-[30px] md:px-[10px] ">
              <div className=" py-6 md:p-[15px] rounded-[8px] shadow  mx-auto w-full ">
                <div className="my-4">
                  <div className="flex p-4 bg-white/10 rounded-xl justify-between items-center">
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
                    <div className="flex text-[14px]">
                      <img
                        src={selectedAsset?.image}
                        alt=""
                        className="w-5 h-5"
                      />
                      <span className="uppercase text-sm">
                        {selectedAsset?.asset_code}
                      </span>
                    </div>
                  </div>

                  <div className="relative mt-5">
                    <p className="text-sm text-gray-400">FROM&nbsp;AMOUNT</p>
                    <div className="flex justify-between bg-white/10 border border-[#FFFFFF]/50 rounded-md relative z-[12] p-2 items-center">
                      <div className="flex item-center gap-2">
                        <div
                          className="flex items-center bg-white/10 rounded-md p-2 cursor-pointer"
                          onClick={() => {
                            setCurrencyDropDown(
                              currencyDropDown === "from" ? false : "from"
                            );
                          }}
                        >
                          <img src={selectedAsset?.image} alt="" width="20px" />

                          <div className="mr-3 ml-1 flex items-center  gap-2 text-[12px] text-white uppercase">
                            <p>{selectedAsset?.asset_code || "SELECT"}</p>
                            <p className="text-[12px] text-white">
                              <IoChevronDown />
                            </p>
                          </div>
                        </div>
                        <input
                          type="number"
                          id="input-amount"
                          className="outline-none lg:w-1/2 w-full bg-transparent text-[#ffffff]"
                          placeholder="Enter amount"
                          value={sourceAmount}
                          disabled={swapping}
                          onChange={(e) => {
                            handleCurrencyChange(e);
                            if (typingTimeoutRef.current)
                              clearTimeout(typingTimeoutRef.current);
                            typingTimeoutRef.current = setTimeout(() => {
                              fetchXlmRate(
                                Number(e.target.value),
                                selectedAsset?.asset_code,
                                selectedCurrency
                              );
                            }, 500);
                          }}
                        />
                      </div>
                      <p
                        className="text-white text-[12px] cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!swapping) {
                            handleMax(currentBalance);
                            fetchXlmRate(
                              currentBalance,
                              selectedAsset?.asset_code,
                              selectedCurrency
                            );
                          }
                        }}
                      >
                        Max
                      </p>
                    </div>

                    {currencyDropDown === "from" && (
                      <div className="absolute bg-black z-50 text-white rounded-md shadow-md py-2 px-3 max-h-[200px] overflow-y-auto">
                        {filteredFromAssets?.map(
                          (asset: any, index: number) => (
                            <div
                              key={index}
                              className="py-2 px-4 cursor-pointer "
                              onClick={() => {
                                handleInputCurrencyChange(
                                  asset.asset_code,
                                  sourceAmount
                                );
                                setSelectedCurrency(selectedCurrency);
                                setSelectedAsset(asset);
                                setCurrencyDropDown(false);
                                setCurrentbalance(asset.balance);
                                setSourceAmount("");
                              }}
                            >
                              <div
                                key={index}
                                className="flex items-center gap-2"
                              >
                                <img src={asset.image} alt="" width="25px" />
                                <div className="flex gap-2 items-center">
                                  <p className="font-medium text-sm">
                                    {asset.asset_name}
                                  </p>
                                  <p className="text-xs">
                                    ({asset.asset_code})
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="my-4">
                  <p className="text-sm text-gray-400">TO&nbsp;AMOUNT</p>
                  <div className="relative">
                    <div className="flex justify-between bg-white/10 border border-[#FFFFFF]/50 rounded-md relative z-[10] px-2 items-center">
                      <div
                        className="flex items-center bg-white/10 rounded-md p-2 cursor-pointer"
                        onClick={() =>
                          setCurrencyDropDown(
                            currencyDropDown === "to" ? false : "to"
                          )
                        }
                      >
                        <img
                          src={selectedAssetReceive?.image}
                          alt=""
                          width="20px"
                        />
                        <div className="mr-3 ml-1 flex items-center h-[20px]  gap-2 text-[12px] text-white uppercase">
                          <p>{selectedAssetReceive?.asset_code || "SELECT"}</p>
                          <p className="text-[12px] text-white">
                            <IoChevronDown />
                          </p>
                        </div>
                      </div>
                      &nbsp;&nbsp;
                      <div className="flex justify-between gap-3 w-auto items-center bg-white/10 my-3 rounded-xl px-4 py-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-400">AMOUNT:</p>
                        </div>
                        <input
                          type="number"
                          disabled
                          value={
                            sourceAmount ? Number(descAmount).toFixed(8) : ""
                          }
                          className="w-full bg-transparent outline-none md:text-md text-sm font-semibold"
                        />
                        {processing && sourceAmount && (
                          <img
                            src="./images/loader.gif"
                            className="w-[20px] h-[20px] mx-2"
                            alt=""
                          />
                        )}
                      </div>
                    </div>
                    {currencyDropDown === "to" && (
                      <div className="absolute bg-black z-50 text-white rounded-md shadow-md py-2 px-3 max-h-[200px] overflow-y-auto">
                        {filteredReceiveAssets?.map(
                          (asset: any, index: number) => (
                            <div
                              key={index}
                              className="py-2 px-4 cursor-pointer "
                              onClick={() => {
                                if (loading) return;
                                setSelectedCurrency(asset.asset_code);
                                setSelectedAsset(selectedAsset);
                                setSelectedAssetReceive(asset);
                                setCurrencyDropDown(false);
                                handleOuputCurrencyChange(
                                  asset.asset_code,
                                  sourceAmount
                                );
                              }}
                            >
                              <div
                                key={index}
                                className="flex items-center gap-2"
                              >
                                <img src={asset.image} alt="" width="25px" />
                                <div className="flex gap-2 items-center">
                                  <p className="font-medium text-sm">
                                    {asset.asset_name}
                                  </p>
                                  <p className="text-xs">
                                    ({asset.asset_code})
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="small-range"
                    className="text-[#ffffff] text-[14px] font-[300]"
                  >
                    Slippage
                  </label>
                  <input
                    id="small-range"
                    type="range"
                    min={0.5}
                    max={10}
                    step={0.01}
                    value={value}
                    disabled={loading}
                    onChange={handleChange}
                    className="w-full h-1 mb-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-sm dark:bg-gray-700"
                  />
                  <p className="text-[#ffffff] text-[14px] font-[300] text-center">
                    {value}%
                  </p>
                </div>

                {next ? (
                  <button
                    className="flex gap-2 justify-center items-center bg-[#0E7BB2] border border-white/50 text-white p-3 rounded-lg w-full mt-[1rem] cursor-pointer"
                    disabled={!sourceAmount || !descAmount || swapping}
                    onClick={async () => {
                      await handleSwapAssets();
                      setTimeout(() => {
                        const starAnimation = document.createElement("div");
                        starAnimation.className =
                          "fixed top-0 left-0 w-full h-full z-50 pointer-events-none star-animation";
                        document.body.appendChild(starAnimation);

                        for (let i = 0; i < 50; i++) {
                          const star = document.createElement("div");
                          star.className = "star";
                          star.style.left = `${Math.random() * 100}%`;
                          star.style.top = `${Math.random() * 100}%`;
                          starAnimation.appendChild(star);
                        }

                        setTimeout(() => {
                          document.body.removeChild(starAnimation);
                        }, 5000);
                      }, 3000);
                    }}
                  >
                    <span>Swap</span>
                    {loading && (
                      <img
                        src="./images/loader.gif"
                        className="w-[20px] mx-2"
                        alt=""
                      />
                    )}
                  </button>
                ) : (
                  <button
                    className="bg-[#0E7BB2] border border-white/50 text-white p-3 rounded-lg w-full mt-[1rem] cursor-pointer"
                    disabled={!sourceAmount && !descAmount}
                    onClick={handleNext}
                  >
                    Next
                  </button>
                )}
              </div>

              <div>
                {next && (
                  <div className="w-[100%]">
                    <div className="py-4 px-[40px] mt-[20px] rounded-[8px] w-full bg-white/10  border border-[#B2B2B27A] animate-fade-in">
                      <p className="text-[14px] text-[#ffffff] border-b border-[#CFCFCF] pb-2">
                        {selectedAsset.asset_code === "NATIVE"
                          ? "XLM"
                          : selectedAsset.asset_code}{" "}
                        {formatNumberWithCommas(sourceAmount)} ={" "}
                        {selectedCurrency === "NATIVE"
                          ? "XLM"
                          : selectedCurrency}{" "}
                        {formatNumberWithCommas(descAmount)}
                      </p>
                      <div className="flex flex-col gap-[8px] mt-5">
                        <div className="flex items-center justify-between text-[14px] text-[#ffffff]">
                          <p>Slippage</p>
                          <p>{value}%</p>
                        </div>
                        <div className="flex items-center justify-between text-[14px] text-[#ffffff]">
                          <p>Transaction Cost</p>
                          <p>~XLM 0.0000001</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <style>{`
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in {
            animation: fade-in 0.5s ease-out;
          }
        `}</style>
              </div>

              <style>{`
                  .star-animation {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    pointer-events: none;
                  }

                  .star {
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    background: radial-gradient(circle, rgba(0,255,255,1) 0%, rgba(0,255,255,0) 70%);
                    border-radius: 50%;
                    animation: star-move 5s ease-out forwards;
                  }

                  @keyframes star-move {
                    0% {
                      opacity: 1;
                      transform: scale(1) translateY(0);
                    }
                    100% {
                      opacity: 0;
                      transform: scale(1.5) translateY(-50px);
                    }
                  }
                `}</style>
            </div>
          </div>
        </main>
        <MobileNav />
      </div>
      {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
    </div>
  );
};

export default Swap;
