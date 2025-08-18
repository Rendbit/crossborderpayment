import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import EmptyTopNav from "../components/top-nav/EmptyTopNav";
import { useAppContext } from "../context/useContext";
import Cookies from "js-cookie";
import { getMyAssets } from "../function/horizonQuery";
import { initiateTransfer24, queryTransaction } from "../function/sep24";
import Alert from "../components/alert/Alert";
import { BsBank } from "react-icons/bs";

const AnchorDepositMethod: React.FC = () => {
  const user = Cookies.get("token");
  const [loading, setLoading] = useState<boolean>(false);
  const [isIframeLoading, setIsIframeLoading] = useState<boolean>(false);
  const [url, setUrl] = useState<any>(null);
  const [transactionInfo, setTransactionInfo] = useState<any>();
  const [modal, setModal] = useState<any>(false);
  const [msg, setMsg] = useState<string>("");
  const [alertType, setAlertType] = useState<string>("");
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [address, setAddress] = useState<string>("");
  const [isActivateWalletAlert, setIsActivateWalletAlert] =
    useState<boolean>(false);
  const navigate = useNavigate();
  const { selectedCountryForTransfer } = useAppContext();

  useEffect(() => {
    if (!selectedCountryForTransfer) {
      navigate("/choose-recipient-country");
    }
  }, []);

  useEffect(() => {
    if (!modal || !url) return;

    const interval = setInterval(() => {
      try {
        const newSrc = iframeRef.current?.contentWindow?.location.href;
        if (newSrc && newSrc !== url) {
          console.log("Detected redirect to:", newSrc);
          setFallbackUrl(newSrc);
          setUrl(newSrc); // replace with the new iframe url
        }
      } catch (err) {
        // This will throw due to cross-origin, we expect this
        // But if you already have fallbackUrl, you can load it
        if (fallbackUrl) {
          console.log({ fallbackUrl });
          setUrl(fallbackUrl);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [modal, url, fallbackUrl]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === "closeIframe") {
        setModal(false);
        setUrl(null);
        setIsIframeLoading(true);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (!url) return;

    const iframeDoneListener = () => {
      const iframe = document.getElementById(
        "deposit-iframe"
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
        selectedCountryForTransfer.symbol,
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
      setModal("deposit");
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
      const response = await queryTransaction(
        user,
        selectedCountryForTransfer.symbol
      );
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
    if (!user) {
      return;
    }
    try {
      const response = await getMyAssets(
        user,
        selectedCountryForTransfer.symbol
      );

      if (!response.success) {
        if (
          response.message.includes(
            "Fund your wallet with at least 5 XLM to activate your account."
          )
        ) {
          setAlertType("error");
          setMsg(
            "Fund your wallet with at least 5 XLM to activate your account."
          );
        }
        setMsg(response.message);
        setAlertType("error");
        return;
      }
    } catch (error: any) {
      if (
        error.message.includes(
          "Fund your wallet with at least 5 XLM to activate your account."
        )
      ) {
        setAlertType("error");
        setMsg(
          "Fund your wallet with at least 5 XLM to activate your account."
        );
      } else {
        setAlertType("error");
        setMsg(error.message || "Failed to get all wallet assets");
      }
    }
  }

  return (
    <>
      <EmptyTopNav />
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 px-4">
        {/* Icon */}
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-6">
          <BsBank className="text-gray-900 dark:text-gray-100" size={16} />
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Deposit&nbsp;Funds&nbsp;Easily
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
          Add money to your wallet instantly with secure <br /> payment methods
          and no hidden fees.
        </p>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 w-full max-w-md">
          {/* Country */}
          <div className="flex justify-between items-center p-4">
            <div className="flex items-center gap-3">
              <span className="rounded-full overflow-hidden">
                <img
                  src={selectedCountryForTransfer?.logo}
                  alt={selectedCountryForTransfer?.name}
                  className="h-[25px] w-[25px]"
                />
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {selectedCountryForTransfer?.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedCountryForTransfer?.currency}{" "}
                  {selectedCountryForTransfer?.code}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/choose-recipient-country")}
              className="text-[#0E7BB2] dark:text-gray-100 hover:text-[#0C6699] dark:hover:text-[#FFFFFF] dark:hover:underline text-sm font-medium hover:underline"
            >
              Edit
            </button>
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          <hr className="border-gray-200 dark:border-gray-700" />

          {/* Anchor */}
          <div className="p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
              Anchor
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-600 dark:text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M6 20h12M4 6h16l-8-4-8 4z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  LinkIO
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Automatically linked to linkio
                </p>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-between items-center p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Back
            </button>
            <button
              onClick={handleMakeDeposit}
              disabled={loading}
              className="flex justify-center items-center px-4 py-2 rounded-lg bg-[#0E7BB2] hover:bg-[#0C6699] text-white 0"
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
        {/* Deposit Modal */}
        {modal === "deposit" && url && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div
              className="relative w-[500px] max-w-[600px] h-[700px] md:h-[85vh] 
                    bg-gray-300 dark:bg-gray-800 
                    border border-gray-400 dark:border-gray-700 
                    rounded-lg overflow-hidden"
            >
              {isIframeLoading && (
                <div
                  className="absolute inset-0 flex items-center justify-center z-10 
                        bg-gray-200 dark:bg-gray-900/80"
                >
                  <div className="text-gray-700 dark:text-white text-center text-[20px] animate-pulse">
                    Loading...
                  </div>
                </div>
              )}

              <iframe
                id="deposit-iframe"
                src={url}
                title="Deposit Process"
                className="w-full absolute h-full overflow-hidden 
                   bg-gray-200 dark:bg-gray-900"
                onLoad={() => setIsIframeLoading(false)}
              ></iframe>

              <button
                className="absolute cursor-pointer top-[1%] right-[5%] 
                   border border-gray-400 dark:border-gray-600 
                   bg-red-600 text-white px-3 py-1 rounded 
                   hover:bg-red-700"
                onClick={() => {
                  setModal(false);
                  setUrl(null);
                  setIsIframeLoading(true);
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Confirm Payment Modal */}
        {modal === "confirmPayment" && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center 
                  bg-gray-200/80 dark:bg-gray-900/80"
          >
            <div
              className="bg-gray-300 dark:bg-gray-800 
                    p-5 rounded-md border border-gray-400 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mt-[1rem] px-[2rem] mb-[2rem] flex-col">
                <p className="text-gray-900 dark:text-white text-[16px] mb-5 text-center">
                  Click on the button to confirm your transaction
                </p>
                <p className="text-red-600 text-[16px] mb-5 text-center">
                  {msg
                    ? "Please complete deposit process on the provider's website."
                    : ""}
                </p>

                <div className="flex gap-3 items-center justify-between">
                  <button
                    className="flex bg-[#0E7BB2] hover:bg-[#0C6699] 
                       border border-gray-400 dark:border-gray-700 
                       cursor-pointer justify-center items-center px-3  
                       py-[6px] text-white rounded-md"
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
                    className="px-3 py-[6px] text-white cursor-pointer 
                       border border-gray-400 dark:border-gray-700 
                       bg-red-600 hover:bg-red-700 rounded-md"
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

        {/* Success Modal */}
        {modal === "success" && (
          <>
            <div
              className="h-full w-full fixed top-0 left-0 z-[99] 
                 bg-gray-200/70 dark:bg-gray-900/80"
            ></div>
            <div
              className="bg-white dark:bg-gray-800 
                 border border-gray-400 dark:border-gray-700 
                 lg:w-[500px] md:w-[50%] sm:w-[70%] w-[90%] 
                 fixed top-[50%] left-[50%] z-[100] rounded-[8px]"
              style={{ transform: "translate(-50%, -50%)" }}
            >
              <img
                src="./images/check-mark.png"
                alt=""
                className="rounded-t-[11px] w-[100px] mx-auto mt-5"
              />
              <p className="font-[500] text-[22px] text-center mb-2 text-gray-900 dark:text-white">
                Thank you!
              </p>
              <p className="text-gray-800 dark:text-gray-200 text-[16px] text-center">
                Your Transaction is being processed. <br />
                You can monitor this transaction in your transaction history
              </p>

              <div className="md:px-8 px-4 mt-7 mb-[1rem] text-center">
                <p className="text-[18px] lg:text-[20px] text-gray-900 dark:text-white font-[500]">
                  Transaction Info:
                </p>
              </div>

              <div className="md:w-[80%] w-[90%] mx-auto text-gray-900 dark:text-gray-100">
                <div className="flex justify-between">
                  <p>Amount Fee</p>
                  <div className="flex items-center justify-between">
                    {selectedCountryForTransfer?.code}&nbsp;
                    <p>{transactionInfo?.amount_fee || 0}</p>
                  </div>
                </div>
                <div className="flex justify-between mt-3">
                  <p>Amount In</p>
                  <div className="flex items-center justify-between">
                    {selectedCountryForTransfer?.code}&nbsp;
                    <p>{transactionInfo?.amount_in || 0}</p>
                  </div>
                </div>
                <div className="flex justify-between mt-3 border-t pt-3 font-[500]">
                  <p>Total</p>
                  <div className="flex items-center justify-between">
                    {selectedCountryForTransfer?.code}&nbsp;
                    <p>
                      {Number(transactionInfo?.amount_in || 0) +
                        Number(transactionInfo?.amount_fee || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center mt-10 gap-4 md:w-[80%] w-[90%] mx-auto mb-[1.5rem]">
                <button
                  onClick={() => setModal(false)}
                  className="bg-[#0E7BB2] hover:bg-[#0C6699] 
                     cursor-pointer border rounded-md 
                     border-gray-400 dark:border-gray-700 
                     text-white py-2 px-8 w-full text-[14px] lg:text-[16px]"
                >
                  Yes, I understand
                </button>
                <button
                  onClick={() => setModal(false)}
                  className="bg-red-600 hover:bg-red-700 
                     cursor-pointer rounded-md 
                     border border-gray-400 dark:border-gray-700 
                     text-white py-2 px-8 w-full text-[14px] lg:text-[16px]"
                >
                  No Cancel
                </button>
              </div>
            </div>
          </>
        )}

        {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
      </div>
    </>
  );
};

export default AnchorDepositMethod;
