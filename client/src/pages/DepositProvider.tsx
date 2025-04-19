import React, { useEffect, useState } from "react";
import { RiBankLine } from "react-icons/ri";
import SideNav from "../components/side-nav/SideNav";
import TopNav from "../components/top-nav/TopNav";
import Cookies from "js-cookie";
import { TbCurrencyNaira } from "react-icons/tb";
import { GoChevronDown } from "react-icons/go";
import Alert from "../components/alert/Alert";
import { initiateTransfer24, queryTransaction } from "../function/sep24";
import { getMyAssets } from "../function/horizonQuery";
import { formateDecimal } from "../utils";
import { useNavigate } from "react-router-dom";
const DepositProvider: React.FC = () => {
  const user = Cookies.get("token");
  const [loading, setLoading] = useState<boolean>(false);
  const [url, setUrl] = useState<any>(null);
  const [transactionInfo, setTransactionInfo] = useState<any>();
  const [modal, setModal] = useState<any>(false);
  const [msg, setMsg] = useState<string>("");
  const [alertType, setAlertType] = useState<string>("");
  const [activateWalletAlert, setActivateWalletAlert] = useState<string>("");
  const [isActivateWalletAlert, setIsActivateWalletAlert] =
    useState<boolean>(false);
  const [loadingWalletAssets, setLoadingWalletAssets] =
    useState<boolean>(false);
  const [currentBalance, setCurrentbalance] = useState<number>(0);
  const [assets, setAssets] = useState<any>([]);
  const [address, setAddress] = useState<string>("");

  const fiatAssets = [
    { symbol: "NGNC", name: "Nigeria Naira", displaySymbol: "NGN" },
    // { symbol: "GHSC", name: "Ghana Cedis", displaySymbol: "GHS" },
    // { symbol: "KESC", name: "Kenya Shillings", displaySymbol: "KES" },
  ];
  const [currencyChange, setCurrencyChange] = useState<any>(false);
  const [selectedCurrency, setSelectedCurrency] = useState<any>(fiatAssets[0]);
  const navigate = useNavigate();
  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      navigate("/login");
    }
    const storedUserData = localStorage.getItem("userData");
    const parsedUserData = JSON.parse(storedUserData || "null");
    setAddress(parsedUserData?.stellarPublicKey);
    handleGetMyAssets();
  }, []);

  async function handleMakeDeposit() {
    setLoading(true);
    if (isActivateWalletAlert) {
      setMsg("Fund your wallet with at least 5 XLM to activate your account.");
      setAlertType("error");
      setLoading(false);

      return;
    }
    try {
      if (!user) {
        setLoading(false);
        return;
      }
      const response = await initiateTransfer24(
        user,
        selectedCurrency.symbol,
        address,
        "deposit"
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
      setMsg(error.message || "Failed to Initiate deposit");
      setAlertType("error");
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
        setMsg("Please complete deposit process on the provider's website.");
        setAlertType("error");
        setLoading(false);

        return;
      }
      setModal("success");
    } catch (error: any) {
      setAlertType("error");
      setMsg(error.message || "Failed to query transaction");
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
    <div>
      <div className="flex items-start">
        <SideNav />
        <div className="w-full lg:w-[84%]  ml-auto">
          <TopNav />
          <div className="py-[20px] px-[10px] h-[100vh] mt-[90px] lg:mx-[50px] ">
            <h1 className="text-white text-[28px] font-semibold">
              Bank Transfer
            </h1>
            {isActivateWalletAlert && (
              <p className="text-black tetx-center flex justify-center items-center align-middle text-[20px] p-5 bg-red-300 rounded-md my-2">
                {isActivateWalletAlert && activateWalletAlert}
              </p>
            )}

            <div className="border mt-5 border-[#FFFFFF]/50 rounded-2xl p-5 lg:w-[500px] w-full lg:ml-0 lg:mr-auto mx-auto">
              <div className="flex items-center gap-3">
                <div className="bg-[#ffffff] p-2 rounded-full flex items-center justify-center">
                  <RiBankLine className="text-primary-color text-[22px]" />
                </div>

                <div className="ml-2">
                  <p className="text-white text-[18px] font-semibold">
                    Send money to get crypto
                  </p>
                  <p className="font-[300] text-[#ffffff] text-[14px]">
                    Choose Preferred Method
                  </p>
                </div>
              </div>
              <div className="mt-9">
                <div className="flex items-center justify-between">
                  <h2 className=" lg:text-[#ffffff] text-white mb-2 font-[500] lg:font-[400]">
                    Choose a currency
                  </h2>
                  <div className="flex text-[14px] font-semibold">
                    <p className="text-[#ffffff] mr-1">Balance:</p>
                    <span className={`text-white`}>
                      {currentBalance === 0
                        ? "0"
                        : formateDecimal(currentBalance)}
                    </span>
                  </div>
                </div>
                <div className="flex  gap-5">
                  <div className="w-full lg:w-[500px] lg:p-2 bg-gradient-to-b from-[#FFFFFF]/70 to-[#41F8F8]/40 rounded-lg border border-[#FFFFFF]/50">
                    <div className="p-3 rounded-[8px]">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-end">
                            <div className="relative mb-[10px]">
                              <span
                                className="text-sm text-white bg-[#FFFFFF]/30 rounded-md p-3 inline-flex items-center cursor-pointer"
                                onClick={() => {
                                  if (loading) return;
                                  setCurrencyChange(!currencyChange);
                                }}
                              >
                                {selectedCurrency.name} <GoChevronDown />
                              </span>
                              {currencyChange && (
                                <div className="absolute bg-white border rounded shadow">
                                  {fiatAssets.map((currency, index) => (
                                    <p
                                      key={index}
                                      className="px-2 py-1 text-[black] cursor-pointer"
                                      onClick={() => {
                                        setCurrencyChange(false);
                                        setSelectedCurrency(currency);
                                      }}
                                    >
                                      {currency.name}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-5">
                        <p className="text-white">Provider fee</p>
                        <p className="font-300 text-[#ffffff]">
                          Dynamic partner fees
                        </p>
                      </div>
                    </div>
                    <div className="lg:flex items-center justify-center hidden">
                      <button
                        className="flex bg-[#0E7BB2] cursor-pointer border border-[#FFFFFF]/50 justify-center items-center py-2 w-[90%] mx-auto text-white bg-primary-color rounded-md mb-3 mt-[4rem]"
                        onClick={handleMakeDeposit}
                        disabled={loading}
                      >
                        <span>Proceed</span>
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
                <div className="lg:hidden items-center justify-center flex mt-[8rem] mb-[3rem] w-full mx-auto responsive-widths">
                  <button
                    className="flex justify-center cursor-pointer border bg-[#0E7BB2] border-[#FFFFFF]/50 items-center py-2 w-full mx-auto text-white bg-primary-color rounded-md mb-3 mt-[4rem]"
                    onClick={handleMakeDeposit}
                    disabled={loading}
                  >
                    <span>Proceed</span>
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
        </div>
      </div>
      {modal === "withdraw" && (
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
                Note that you are being redirected to a third-party website to
                make your deposit. <br /> Once transaction is completed please
                come back to the website to confirm your transaction
              </p>
              <div className="flex items-center gap-3 justify-between">
                <button
                  className="px-3 py-[6px] bg-[#0E7BB2] border border-white/50 cursor-pointer text-white bg-primary-color rounded-md"
                  onClick={() => {
                    setModal("confirmPayment");
                    window.open(url, "_blank");
                  }}
                >
                  Continue
                </button>
                <button
                  className="px-3 py-[6px] text-white cursor-pointer border border-white/50 bg-[#B3261E] rounded-md"
                  onClick={() => {
                    setModal(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
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
          <div className="bg-[black] p-5 rounded-md border border-white/50">
            {/* <i className=' ri-close-fill block text-[1.2rem] text-end mt-[1rem] mr-[1rem] cursor-pointer'></i> */}
            <div className="flex items-center justify-between mt-[1rem] px-[2rem] mb-[2rem] flex-col">
              <p className="text-white text-[16px] mb-5 text-center">
                Click on the button to confirm your transaction
              </p>
              <p className="text-red-500 text-[16px] mb-5 text-center">
                {msg
                  ? "Please complete deposit process on the provider's website."
                  : ""}
              </p>

              <div className="flex gap-3 items-center justify-between">
                <button
                  className="flex bg-[#0E7BB2] border border-white/50 cursor-pointer justify-center items-center px-3  py-[6px] text-white bg-primary-color rounded-md"
                  disabled={loading}
                  onClick={handleQueryTransaction}
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
                  className="px-3  py-[6px] text-white cursor-pointer border border-white/50 bg-[#B3261E] rounded-md"
                  onClick={() => {
                    setModal(false);
                  }}
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
              onClick={() => setModal(false)}
            ></div>
            <div
              className="bg-[black] border border-white/50 lg:w-[500px] md:w-[50%] sm:w-[70%] w-[90%] fixed top-[50%] left-[50%] z-[100] rounded-[8px]"
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
                  Transaction Info:
                </p>
              </div>
              <div className="md:w-[80%] w-[90%] mx-auto text-white">
                <div className="flex justify-between">
                  <p>Amount Fee</p>
                  <div className="flex items-center justify-between">
                    <TbCurrencyNaira />
                    <p>{transactionInfo?.amount_fee}</p>
                  </div>
                  {/* <p>{transactionInfo?.amount_fee}</p> */}
                </div>
                <div className="flex justify-between mt-3">
                  <p>Amount In</p>
                  <div className="flex items-center justify-between">
                    <TbCurrencyNaira />
                    <p>{transactionInfo?.amount_in}</p>
                  </div>
                  {/* <p>{transactionInfo?.amount_fee}</p> */}
                </div>
                <div className="flex justify-between mt-3 border-t pt-3 font-[500]">
                  <p>Total</p>
                  <div className="flex items-center justify-between">
                    <TbCurrencyNaira />
                    <p>
                      {Number(transactionInfo?.amount_in) +
                        Number(transactionInfo?.amount_fee)}
                    </p>
                  </div>
                  {/* <p>{transactionInfo?.amount_fee}</p> */}
                </div>
              </div>
              <div className="flex flex-col items-center mt-10 gap-4 md:w-[80%] w-[90%] mx-auto mb-[1.5rem]">
                <button
                  onClick={() => setModal(false)}
                  className="bg-[#0E7BB2] cursor-pointer border rounded-md border-white/50 text-white py-2 px-8 w-full text-[14px] lgtext-[16px]"
                >
                  Yes, I understand
                </button>
                <button
                  onClick={() => setModal(false)}
                  className="bg-[#B3261E] cursor-pointer rounded-md text-[white] border border-white/50 py-2 px-8 w-full text-[14px] lgtext-[16px]"
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

export default DepositProvider;
