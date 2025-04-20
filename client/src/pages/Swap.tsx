import React, { useEffect, useRef, useState } from "react";
import { IoChevronDown } from "react-icons/io5";
import SideNav from "../components/side-nav/SideNav";
import TopNav from "../components/top-nav/TopNav";
import Cookies from "js-cookie";
import Alert from "../components/alert/Alert";
import { getConversionRates, getMyAssets } from "../function/horizonQuery";
import { formateDecimal } from "../utils";
import { swapAssets } from "../function/transaction";

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
      console.log({ response });

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
      setMsg(error.message || "An error occurred. Please try again.");
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
    <div>
      <div className="flex items-start ">
        <SideNav />
        <div className="w-full lg:w-[84%]  ml-auto mb-10">
          <TopNav />
          <div className="lg:px-[10px] h-[100vh] pb-[30px] pt-[10px]  mt-[70px] lg:mx-[30px] ">
            <div className="lg:px-[10px]">
              <div className="rounded-[11px] w-full py-[30px] px-[10px] ">
                <div className="w-[70%] lg:mb-20 mb-5">
                  <p className="lg:text-[32px] text-[20px] text-white">
                    Swap Asset
                  </p>
                  <small className="text-[#ffffff]">
                    Leave at least 1.5XLM for gas fee
                  </small>
                  <p className="text-[#ffffff] font-[300] lg:text-[14px] text-[12px] mt-3">
                    Choose your crypto and start earning daily interest today.
                    Rates may increase or decrease in the future. The change
                    will be communicated in advance.
                  </p>
                </div>
                <div className="border border-[#B2B2B27A] py-6 sm:px-[40px] p-[15px] rounded-[8px] shadow lg:max-w-[500px] md:w-[100%] mx-auto w-full ">
                  <div className="my-4">
                    <div className="flex justify-between items-center">
                      <p className="text-[#ffffff] text-[14px] font-[300]">
                        Source amount
                      </p>
                      <div className="flex text-[14px]">
                        <p className="text-[#ffffff]">Balance:</p>
                        <span className="text-white mx-2">
                          {formateDecimal(currentBalance)}
                        </span>
                      </div>
                    </div>
                    <small className="text-[#ffffff]">
                      Leave at least 1.5XLM for gas fee
                    </small>

                    <div className="relative mt-5">
                      <div className="flex justify-between bg-[#FFFFFF]/8 border border-[#FFFFFF]/50 rounded-md relative z-[12] p-2 items-center">
                        <div className="flex item-center gap-2">
                          <div
                            className="flex items-center bg-[#FFFFFF]/8 rounded-md p-2 cursor-pointer"
                            onClick={() => {
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
                        <div className="absolute bg-white w-full mt-[38px] pt-3 pb-3 z-[11] top-[18px] shadow-md">
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
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="my-4">
                    <div className="flex justify-between items-center">
                      <p className="text-[#ffffff] text-[14px] font-[300]">
                        RECEIVE AMOUNT
                      </p>
                    </div>
                    <div className="relative">
                      <div className="flex justify-between bg-[#FFFFFF]/8 border border-[#FFFFFF]/50 rounded-md relative z-[10] p-2 items-center">
                        <div className="flex item-center w-full gap-2">
                          <div
                            className="flex items-center bg-[#FFFFFF]/8 rounded-md p-2 cursor-pointer"
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
                            <div className="mr-3 ml-1 flex items-center  gap-2 text-[12px] text-white uppercase">
                              <p>
                                {selectedAssetReceive?.asset_code || "SELECT"}
                              </p>
                              <p className="text-[12px] text-white">
                                <IoChevronDown />
                              </p>
                            </div>
                          </div>

                          <input
                            type="number"
                            id="input-amount"
                            disabled
                            className="outline-none w-full bg-transparent text-[#ffffff]"
                            value={
                              sourceAmount ? Number(descAmount).toFixed(8) : ""
                            }
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
                        <div className="absolute bg-[#F1F1F1] mt-[37px] w-full pt-3 pb-3 top-[18px] shadow-md">
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

                <div
                  className={`flex md:flex-row-reverse flex-col mt-[50px] md:mt-[0px] md:px-[64px] px-[16px] items-end justify-between lg:max-w-[1400px] md:w-[100%] mx-auto`}
                >
                  {next && (
                    <div className="flex justify-center items-center w-full">
                      <div className="py-4 px-[40px] rounded-[8px] lg:w-[500px] w-full bg-black mt-[1rem] border border-[#B2B2B27A] animate-fade-in">
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
                          {/* <div className="flex items-center justify-between text-[14px] text-[#ffffff]">
                            <p>Exchange Rate</p>
                            <p>
                              1
                              {selectedCurrency === "NATIVE"
                                ? "XLM"
                                : selectedCurrency}{" "}
                              ={" "}
                              {Number(
                                formatNumberWithCommas(rateExchange)
                              ).toFixed(4)}{" "}
                              {selectedAsset.asset_code === "NATIVE"
                                ? "XLM"
                                : selectedAsset.asset_code}
                            </p>
                          </div> */}
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
          </div>
        </div>
      </div>
      {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
    </div>
  );
};

export default Swap;
