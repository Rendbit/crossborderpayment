import React, { useEffect, useRef, useState } from "react";
import { RiBankLine } from "react-icons/ri";
import SideNav from "../components/side-nav/SideNav";
import TopNav from "../components/top-nav/TopNav";
import Cookies from "js-cookie";
import { TbCurrencyNaira } from "react-icons/tb";
import Alert from "../components/alert/Alert";
import { GoChevronDown } from "react-icons/go";
import { initiateTransfer24, queryTransaction } from "../function/sep24";
import { makeWithdrawal } from "../function/transaction";
import { getConversionRates, getMyAssets } from "../function/horizonQuery";
import { formateDecimal } from "../utils";
import { useNavigate } from "react-router-dom";
import { IoChevronDown } from "react-icons/io5";
import { FiLoader } from "react-icons/fi";

const WithdrawProvider: React.FC = () => {
  const user = Cookies.get("token");
  const [loading, setLoading] = useState<boolean>(false);
  const [currencyChange, setCurrencyChange] = useState<any>(false);
  const [url, setUrl] = useState<any>(null);
  const fiatAssets = [
    { symbol: "NGNC", name: "Nigeria Naira", displaySymbol: "NGN" },
    // { symbol: "GHSC", name: "Ghana Cedis", displaySymbol: "GHS" },
    // { symbol: "KESC", name: "Kenya Shillings", displaySymbol: "KES" },
  ];
  const [amount, setAmount] = useState<string>("0");
  const [currencyDropDown, setCurrencyDropDown] = useState<any>(false);
  const [descAmount, setDescAmount] = useState<number | string>("");
  const [processing, setProcessing] = useState<boolean>(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [selectedCurrency, setSelectedCurrency] = useState<any>(fiatAssets[0]);
  const [transactionInfo, setTransactionInfo] = useState<any>();
  const [modal, setModal] = useState<any>(false);
  const [msg, setMsg] = useState<string>("");
  const [alertType, setAlertType] = useState<string>("");
  const [activateWalletAlert, setActivateWalletAlert] = useState<string>("");
  const [isActivateWalletAlert, setIsActivateWalletAlert] =
    useState<boolean>(false);
  const [loadingWalletAssets, setLoadingWalletAssets] =
    useState<boolean>(false);
  const [assets, setAssets] = useState<any>([]);
  const [address, setAddress] = useState<string>("");
  const navigate = useNavigate();
  const [isIframeLoading, setIsIframeLoading] = useState<boolean>(false);
  const [country, setCountry] = useState<any>("");
  const [loader, setLoader] = useState<any>(false);
  const [allCountries, setAllCountries] = useState<any>([]);
  const [showCountries, setShowCountries] = useState<any>(false);
  const [searchText, setSeacrhText] = useState<any>("");
  const [selectedAsset, setSelectedAsset] = useState<any>();
  const [currentBalance, setCurrentbalance] = useState<number>(0);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        if (event.data === "closeIframe") {
          setModal(false);
          setUrl(null);
          setIsIframeLoading(true);
        }
      } catch (err) {
        console.error("Error in postMessage handling:", err);
      }
    };

    window.addEventListener("message", handleMessage);

    return () => window.removeEventListener("message", handleMessage);
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

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      navigate("/login");
    }
    const storedUserData = localStorage.getItem("userData");
    const parsedUserData = JSON.parse(storedUserData || "null");
    setAddress(parsedUserData?.stellarPublicKey);
    handleGetMyAssets();
    getAllCountries();
  }, []);

  useEffect(() => {
    if (!url) return;

    const iframeDoneListener = () => {
      const iframe = document.getElementById(
        "withdrawal-iframe"
      ) as HTMLIFrameElement;
      if (!iframe) return;

      try {
        const currentUrl = iframe.contentWindow?.location.href;
        if (
          currentUrl?.includes("success") ||
          currentUrl?.includes("callback")
        ) {
          setModal(false);
          setUrl(null);
          handleQueryTransaction();
        }
      } catch (err) {
        // CORS restrictions might block access, ignore silently
      }
    };

    const interval = setInterval(iframeDoneListener, 1500); // check every 1.5s

    return () => clearInterval(interval);
  }, [url]);

  async function handleInitiateWithdrawal() {
    setLoading(true);
    if (!country) {
      setMsg("Please enter recipient country");
      setAlertType("error");
      setLoading(false);
      return;
    }
    if (isActivateWalletAlert) {
      setMsg("Fund your wallet with at least 5 XLM to activate your account.");
      setAlertType("error");
      setLoading(false);

      return;
    }

    // if (currentBalance < 20000) {
    //   setMsg("Must have atleast N 20,000");
    //   setAlertType("error");
    //   setLoading(false);

    //   return;
    // }
    try {
      if (!user) {
        setLoading(false);
        return;
      }
      const response = await initiateTransfer24(
        user,
        selectedCurrency.symbol,
        address,
        "withdraw"
      );
      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        setLoading(false);
        return;
      }
      setUrl(response.data.json.url);
      setModal("withdraw");
    } catch (error: any) {
      setMsg(error.message || "Failed to Initiate withdrawal");
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  }

  async function getAllCountries() {
    setLoader(true);
    const response = await fetch(
      "https://api.countrystatecity.in/v1/countries",
      {
        headers: {
          "X-CSCAPI-KEY":
            "VUJ1UU5aSmlLU2xiNEJxdUg0RnQ0akNZbXAyV2ZiVHlnN1F6dHA1dg==",
        },
      }
    );
    const data = await response.json();
    if (response) setLoader(false);
    setAllCountries(data);
    return data;
  }

  const handleInputCurrencyChange = (currencySymbol: string, value: number) => {
    const currency = assets.allWalletAssets.find(
      (cur: any) => cur.asset_code === currencySymbol
    );
    console.log({
      inputAsset: currencySymbol,
      amount: value,
      outputAsset: selectedAsset.asset_code,
    });
    if (currency && amount) {
      fetchXlmRate(value, currencySymbol, selectedAsset.asset_code);
    }
  };

  async function handleMakeWithdrawal(transactionInfo: any) {
    setLoading(true);

    try {
      if (!user) {
        setLoading(false);
        return;
      }
      const response = await makeWithdrawal(
        Number(transactionInfo?.amount_in),
        transactionInfo.withdraw_anchor_account,
        selectedCurrency.symbol,
        "fiat",
        "withdraw",
        transactionInfo,
        user
      );
      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        setLoading(false);
        return;
      }
    } catch (error: any) {
      setAlertType("error");
      setMsg(error.message || "Failed to make withdrawal");
    } finally {
      setLoading(false);
    }
  }

  async function handleQueryTransaction() {
    setLoading(true);
    try {
      if (!user) {
        setLoading(false);
        return;
      }
      const response = await queryTransaction(user, selectedCurrency.symbol);
      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        setLoading(false);
        return;
      }
      setTransactionInfo(response?.data?.json?.transactions[0]);
      if (
        !response?.data?.json?.transactions[0] ||
        !response?.data?.json?.transactions[0]?.amount_in
      ) {
        setMsg("Please complete withdrawal process on the provider's website.");
        setAlertType("error");
      } else {
        await handleMakeWithdrawal(response?.data?.json?.transactions[0]);
      }
    } catch (error: any) {
      setAlertType("error");
      setMsg(error.message || "Failed to query transaction");
    } finally {
      setLoading(false);
    }
  }

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
      setAmount(value);
    }
    if (!value) {
      setDescAmount("");
    }
  };

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
      const response = await getMyAssets(user, selectedCurrency.symbol);

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
      const asset = response?.data?.allWalletAssets?.find(
        (asset: any) => asset.asset_code === selectedCurrency.symbol
      );

      setCurrentbalance(asset?.balance || 0);
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
    <div className="h-auto py-6">
      {isActivateWalletAlert && (
        <p className="text-black tetx-center flex justify-center items-center align-middle text-[20px] p-5 bg-red-300 rounded-md my-2">
          {isActivateWalletAlert && activateWalletAlert}
        </p>
      )}
      <div className="space-y-8 text-center text-gray-300">
        <div className="grid gap-6">
          <div className="flex justify-between gap-3 items-end bg-white/10 rounded-xl p-4">
            <div className="w-full">
              <p className="text-sm font-medium text-gray-400 text-left mb-2">Balance</p>
              <p className="text-lg font-semibold text-left border px-3 py-2 rounded-[7px] w-full">
                {/* {currentBalance === 0 ? "0" : formateDecimal(currentBalance)} */}
                {selectedAsset?.asset_code === "GHSC"
                  ? 500
                  : currentBalance === 0
                  ? "0"
                  : formateDecimal(currentBalance)}
              </p>
            </div>
            <div
              className="flex items-center gap-2 cursor-pointer px-3 py-3 bg-[#2A313D] rounded-lg"
              onClick={() => {
                if (isActivateWalletAlert) return;
                setShowCountries(false);

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
        </div>

        {currencyDropDown === "from" && (
          <div className="absolute top-[21%] md:left-[32.5%] bg-black text-white mt-[-30px] rounded-md shadow-md py-2 px-3 max-h-[200px] overflow-y-auto">
            {assets?.allWalletAssets?.map((asset, index) => (
              <div
                key={index}
                className="flex items-center gap-3 py-2 cursor-pointer px-2 hover:bg-white/50 hover:text-black"
                onClick={() => {
                  if (loading) return;
                  handleInputCurrencyChange(asset.asset_code, Number(amount));
                  setSelectedAsset(asset);
                  setCurrencyDropDown(false);
                  setCurrentbalance(asset.balance || 0);
                }}
              >
                <img src={asset.image} alt="" className="w-6 h-6" />
                <div className="flex gap-2 items-center">
                  <p className="font-medium text-sm">{asset.asset_name}</p>
                  <p className="text-xs">({asset.asset_code})</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between mt-[-10px] items-end gap-3 bg-white/10 rounded-xl p-4">
          <div className="w-full">
            <p className="text-sm font-medium text-gray-400 text-left mb-2">
              Recipient's&nbsp;Country
            </p>
            <p className="text-lg font-semibold text-left border border-gray-300 px-3 py-2 rounded-[7px] w-full">
              {country ? country : "Select country"}
            </p>
          </div>
          <div
            className="flex items-center gap-2 cursor-pointer px-3 py-3 bg-[#2A313D] rounded-lg"
            onClick={() => {
              setShowCountries(!showCountries);
              setCurrencyDropDown(false);
            }}
          >
            <span className="uppercase text-sm">
              {country ? country : "Select"}
            </span>
            <IoChevronDown />
          </div>
        </div>

        {showCountries && !loading && (
          <div className="absolute top-[40%] md:left-[36.5%] bg-black text-white mt-[-30px] rounded-md shadow-md py-2 px-3 max-h-[200px] overflow-y-auto">
            <input
              type="text"
              onChange={(e) => setSeacrhText(e.target.value)}
              disabled={loading}
              placeholder="Search Country"
              className="border bg-white/2 text-white border-gray-300 w-full placeholder:text-[13px] text-[13px] outline-none px-[4px] rounded mb-1 py-[5px]"
            />
            <div>
              {loader ? (
                <div className="flex items-center justify-center flex-col gap-3 mt-[7rem]">
                  <FiLoader className="text-[28px] animate-spin" />
                  <p className="text-black text-[14px]">
                    Fetching Countries Please Wait...
                  </p>
                </div>
              ) : (
                allCountries
                  .filter((country) =>
                    country.name
                      .toLowerCase()
                      .includes(searchText.toLowerCase())
                  )
                  .map((country, index) => (
                    <div
                      key={index}
                      className="flex text-white items-center gap-2 hover:bg-gray-300/50 cursor-pointer p-[5px] text-[14px]"
                      onClick={() => {
                        setShowCountries(false);
                        setCountry(country.name);
                      }}
                    >
                      <p>{country.emoji}</p>
                      <p>{country.name}</p>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        <div className="bg-white/10 rounded-xl p-4 mt-[-10px]">
          <p className="text-sm mb-2 text-gray-400 text-left">Amount</p>
          <input
            type="number"
            placeholder="Enter amount in your currency"
            disabled={loading}
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
            className="w-full bg-transparent outline-none text-lg font-semibold border border-gray-300 text-gray-400 p-2 rounded-md"
          />
        </div>
        

        <div className="bg-white/10 mt-[-10px] rounded-xl p-4">
          <p className="text-sm mb-2 text-gray-400 text-left">Anchor</p>
          <div className="flex justify-between items-center cursor-pointer border border-gray-300 px-3 py-2 rounded-[7px]">
            <span className="font-light">LinkIO</span>
            <IoChevronDown />
          </div>
          <p className="mt-2 text-xs text-gray-400 text-left">
            Automatically linked to linkio
          </p>
        </div>

        <div className="flex mt-[-70px] items-center justify-center mx-3">
          <button
            className="flex border border-[#FFFFFF]/50 w-full cursor-pointer bg-[#0E7BB2] rounded-md justify-center items-center py-2  mx-auto text-white mb-3 mt-[4rem]"
            onClick={handleInitiateWithdrawal}
            disabled={loading}
          >
            <span>Proceed</span>
            {loading && (
              <img src="./image/loader.gif" className="w-[20px] mx-2" alt="" />
            )}
          </button>
        </div>
      </div>

      {modal === "withdraw" && url && (
        <div className="fixed w-[50%]  bg-black/10 inset-0 z-50 flex items-center justify-center">
          <div className="relative w-[100%] max-w-[600px] h-[700px] md:h-[65vh] bg-black border border-white/50 rounded-lg">
            {isIframeLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/80">
                <div className="text-white text-[20px] animate-pulse">
                  Loading...
                </div>
              </div>
            )}
            <iframe
              id="withdrawal-iframe"
              onError={(e) => console.error("Iframe load error:", e)}
              src={url}
              onLoad={() => setIsIframeLoading(false)}
              title="Withdrawal Process"
              className="w-full absolute h-full overflow-hidden bg-black"
            ></iframe>
            <button
              className="absolute cursor-pointer top-[10%] right-[5%] border border-white/50 bg-[#B3261E] text-white px-3 py-1 rounded hover:bg-red-600"
              onClick={() => {
                setModal(false);
                setUrl(null);
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {modal === "confirmPayment" && (
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
          <div className="bg-[black] border border-white/50 rounded-md p-5">
            {/* <i className=' ri-close-fill block text-[1.2rem] text-end mt-[1rem] mr-[1rem] cursor-pointer'></i> */}
            <div className="flex items-center justify-between mt-[1rem] px-[2rem] mb-[2rem] flex-col">
              <p className="text-white text-[16px] mb-5 text-center">
                Click on the button to confirm your transaction
              </p>
              <p className="text-red-500 text-[16px] mb-5 text-center">
                {msg
                  ? "Please complete withdrawal process on the provider's website."
                  : ""}
              </p>

              <div className="flex gap-3 items-center justify-center ">
                <button
                  className="flex bg-[#0E7BB2] border border-white/50 cursor-pointer rounded-md justify-center items-center px-3 mx-2 py-[6px] text-white bg-primary-color"
                  onClick={handleQueryTransaction}
                  disabled={loading}
                >
                  <span>Confirm</span>
                  {loading && (
                    <img
                      src="./image/loader.gif"
                      className="w-[20px] mx-2"
                      alt=""
                    />
                  )}
                </button>
                <button
                  className="px-3 mx-2 py-[6px] rounded-md text-white bg-[#B3261E] border border-white/50 cursor-pointer"
                  onClick={() => setModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {modal === "success" && (
        <>
          <div>
            <div
              className="h-full w-full fixed top-0 left-0 z-[99]"
              style={{ background: "rgba(14, 14, 14, 0.58)" }}
            ></div>
            <div
              className="bg-[balck] border border-white/50 rounded-md p-5 lg:w-[500px] md:w-[50%] sm:w-[70%] w-[90%] fixed top-[50%] left-[50%] z-[100]"
              style={{ transform: "translate(-50%, -50%)" }}
            >
              <img
                src="./images/check-mark.png"
                alt=""
                className="rounded-t-[11px] w-[100px] mx-auto mt-5"
              />
              <p className="font-[500] text-[22px] text-center mb-2 text-white">
                Thank you!
              </p>
              <p className="text-white text-[16px] text-center">
                Your Transaction is being processed. <br /> You can monitor this
                transaction in your transaction history
              </p>
              <div className="md:px-8 px-4 mt-7 mb-[1rem] text-center">
                <p className="text-[18px] lg:text-[20px] text-[white] font-[500]">
                  Withdrwal Info:
                </p>
              </div>

              <div className="md:w-[80%] w-[90%] mx-auto text-white">
                <div className="flex justify-between mt-3">
                  <p>Amount In</p>
                  <div className="flex items-center justify-between">
                    <TbCurrencyNaira />
                    <p>{transactionInfo?.amount_in}</p>
                  </div>
                </div>
                <div className="flex justify-between mt-3 border-t pt-3 font-[500]">
                  <p>Total</p>
                  <div className="flex items-center justify-between">
                    <TbCurrencyNaira />
                    <p>{Number(transactionInfo?.amount_in)}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center mt-10 gap-4 md:w-[80%] w-[90%] mx-auto mb-[1.5rem]">
                <button
                  onClick={() => setModal(false)}
                  className="flex text-white py-2 px-8 rounded-md bg-[#0E7BB2] border border-white/50 cursor-pointer w-full text-[14px] lgtext-[16px]"
                >
                  Yes, I understand
                </button>

                <button
                  onClick={() => setModal(false)}
                  disabled={loading}
                  className="bg-[#B3261E] border border-white/50 cursor-pointer text-[white] py-2 px-8 rounded-md w-full text-[14px] lgtext-[16px]"
                >
                  No Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
    </div>
  );
};

export default WithdrawProvider;
