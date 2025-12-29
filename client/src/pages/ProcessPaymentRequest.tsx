import React, { useEffect, useState } from "react";
import { useAppContext } from "../context/useContext";
import TopNav from "../components/top-nav/TopNav";
import { HiOutlineDocumentCurrencyDollar } from "react-icons/hi2";
import Alert from "../components/alert/Alert";
import { X } from "lucide-react";
import OTPInput from "react-otp-input";
import { useParams } from "react-router-dom";

const ProcessPaymentRequest = () => {
  const {
    setIsRequestPaymentModalOpen,
    setIsProcessPaymentRequestModalOpen,
    isProcessPaymentRequestModalOpen,
  } = useAppContext();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [isPrivateKeyModalOpen, setIsPrivateKeyModalOpen] =
    useState<boolean>(false);
  const [msg, setMsg] = useState("");
  const [alertType, setAlertType] = useState("");
  const BASE_URL = import.meta.env.VITE_BASE_URL;
  const API_KEY = import.meta.env.VITE_API_KEY;
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("userData") || "{}");
  const [transactionPin, setTransactionPin] = useState<any>("");
  const [transactionDetails, setTransactionDetails] = useState<string>("");
  const { requestId } = useParams<{ requestId: string }>();

  // Separate state for displaying user info (read-only)
  const [toUserInfo, setToUserInfo] = useState({
    username: "",
    stellarPublicKey: "",
    primaryEmail: "",
  });

  const [fromUserInfo, setFromUserInfo] = useState({
    username: "",
    stellarPublicKey: "",
    primaryEmail: "",
  });

  const [metadata, setMetadata] = useState({
    invoiceNumber: "",
    invoiceDateAndTime: "",
  });

  const [expirationDate, setExpirationDate] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("crypto");

  const [paymentRequestData, setPaymentRequestData] = useState({
    amount: "",
    currency: "",
    description: "",
    expiresIn: "",
  });

  useEffect(() => {
    setIsRequestPaymentModalOpen(false);
  }, []);

  const proceedAndProcessPayment = async () => {
    if (!transactionPin) {
      setMsg("Please enter your transaction PIN.");
      setAlertType("error");
      return;
    }
    if (transactionPin !== user.pinCode) {
      setMsg("Invalid transaction PIN.");
      setAlertType("error");
      return;
    }

    try {
      setIsLoading(true);

      // Prepare the payload according to the new API structure
      const payload = {
        requestId: requestId,
        paymentMethod: paymentMethod,
        pinCode: transactionPin,
        transactionDetails: metadata,
      };

      const response = await fetch(`${BASE_URL}/paymentRequest/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-api-key": `${API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMsg(data.message || "Payment processed successfully");
        setAlertType("success");
        setIsPrivateKeyModalOpen(false);
        setTransactionPin("");
        // Optionally refresh the data
        fetchData();
      } else {
        setMsg(data.message || "Failed to process payment");
        setAlertType("error");
      }
    } catch (error) {
      console.error("Error:", error);
      setMsg("An error occurred while processing the payment");
      setAlertType("error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${BASE_URL}/paymentRequest/get?requestId=${requestId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-api-key": `${API_KEY}`,
          },
        }
      );
      const data = await response.json();

      if (data.success && data.data.paymentRequest) {
        const paymentRequest = data.data.paymentRequest;

        // Set the read-only user info
        if (paymentRequest.toUser) {
          setToUserInfo({
            username: paymentRequest.toUser.username || "",
            stellarPublicKey: paymentRequest.toUser.stellarPublicKey || "",
            primaryEmail: paymentRequest.toUser.primaryEmail || "",
          });
        }

        if (paymentRequest.fromUser) {
          setFromUserInfo({
            username: paymentRequest.fromUser.username || "",
            stellarPublicKey: paymentRequest.fromUser.stellarPublicKey || "",
            primaryEmail: paymentRequest.fromUser.primaryEmail || "",
          });
        }

        // Set payment method
        if (paymentRequest.paymentMethod) {
          setPaymentMethod(paymentRequest.paymentMethod);
        }

        if (paymentRequest.metadata) {
          setMetadata({
            invoiceNumber: paymentRequest.metadata.invoiceNumber || "",
            invoiceDateAndTime:
              paymentRequest.metadata.invoiceDateAndTime || "",
          });
        }

        // Calculate days until expiration
        let expiresInDays = "";
        if (paymentRequest.expiresAt) {
          setExpirationDate(paymentRequest.expiresAt);
          const expirationDate = new Date(paymentRequest.expiresAt);
          const today = new Date();
          const diffTime = expirationDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          expiresInDays = diffDays > 0 ? diffDays.toString() : "0";
        }

        // Set the payment request data (read-only display)
        setPaymentRequestData({
          amount: paymentRequest.amount || "",
          currency: paymentRequest.currency || "",
          description: paymentRequest.description || "",
          expiresIn: expiresInDays,
        });
      }
    } catch (error) {
      console.error("Error fetching payment request:", error);
      setMsg("Failed to load payment request data");
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectPayment = async () => {
    setIsLoading(true);
  };

  useEffect(() => {
    if (requestId) {
      fetchData();
    }
  }, [requestId]);

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 text-gray-900 dark:text-gray-100">
      {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
      <TopNav page="Process Payment Request" />
      <div className="flex items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          {/* Icon */}
          <div className="flex justify-center items-center py-4">
            <span className="bg-[#E7F1F7] dark:bg-gray-700 p-3 rounded-full">
              <HiOutlineDocumentCurrencyDollar className="text-gray-900 dark:text-gray-100 w-6 h-6" />
            </span>
          </div>

          {/* Heading */}
          <h2 className="text-center text-xl font-semibold mb-6">
            Payment Request Details
          </h2>

          {/* Payment Request Information (Read-only) */}
          <div className="space-y-5">
            {/* From User Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <h3 className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-200">
                From:
              </h3>
              <div className="space-y-1">
                <p className="text-[13px] text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Username:</span>{" "}
                  {fromUserInfo.username || "N/A"}
                </p>
                <p className="text-[13px] text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Email:</span>{" "}
                  {fromUserInfo.primaryEmail || "N/A"}
                </p>
                <p className="text-[13px] text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Wallet:</span>{" "}
                  {fromUserInfo.stellarPublicKey
                    ? `${fromUserInfo.stellarPublicKey.slice(0, 10)}...`
                    : "N/A"}
                </p>
              </div>
            </div>

            {/* To User Info */}
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <h3 className="text-sm font-semibold mb-2 text-green-900 dark:text-green-200">
                To:
              </h3>
              <div className="space-y-1">
                <p className="text-[13px] text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Username:</span>{" "}
                  {toUserInfo.username || "N/A"}
                </p>
                <p className="text-[13px] text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Email:</span>{" "}
                  {toUserInfo.primaryEmail || "N/A"}
                </p>
                <p className="text-[13px] text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Wallet:</span>{" "}
                  {toUserInfo.stellarPublicKey
                    ? `${toUserInfo.stellarPublicKey.slice(0, 10)}...`
                    : "N/A"}
                </p>
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Amount:
                </span>
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {paymentRequestData.amount} {paymentRequestData.currency}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Payment Method:
                </span>
                <span className="text-sm text-gray-900 dark:text-gray-100 capitalize">
                  {paymentMethod}
                </span>
              </div>

              {paymentRequestData.description && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Description:
                  </span>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                    {paymentRequestData.description}
                  </p>
                </div>
              )}

              {expirationDate && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Expires:
                    </span>
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {new Date(expirationDate).toLocaleDateString()} (
                      {paymentRequestData.expiresIn} days)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Transaction Details Input */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Transaction Details (Optional)
              </label>
              <textarea
                name="transactionDetails"
                placeholder="Add any additional transaction details..."
                value={transactionDetails}
                onChange={(e) => setTransactionDetails(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0E7BB2] resize-none"
              />
            </div>

            {/* Process Payment Button - Only show to the recipient (toUser) */}
            {user?.primaryEmail === toUserInfo?.primaryEmail && (
              <div className="flex gap-4">
                <button
                  onClick={handleRejectPayment}
                  disabled={isLoading || loading}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 rounded-lg transition-colors mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Processing..." : "Reject Payment"}
                </button>
                <button
                  onClick={() => {
                    setIsProcessPaymentRequestModalOpen(true);
                  }}
                  disabled={isLoading || loading}
                  className="w-full bg-[#0E7BB2] hover:bg-[#0B5E8C] text-white font-medium py-3 rounded-lg transition-colors mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Processing..." : "Accept Payment"}
                </button>
              </div>
            )}

            {/* Show message if user is not the recipient */}
            {user?.primaryEmail !== toUserInfo?.primaryEmail &&
              toUserInfo?.primaryEmail && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mt-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Only the recipient can process this payment request.
                  </p>
                </div>
              )}

            {/* PIN Modal */}
            {isProcessPaymentRequestModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-300/90 dark:bg-black/90">
                <div className="bg-white mx-5 dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 relative">
                  {/* Close Button */}
                  <button
                    className="absolute bg-gray-100 dark:bg-gray-700 rounded-full p-1 text-[1rem] top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                    onClick={() => setIsPrivateKeyModalOpen(false)}
                  >
                    <X size={24} />
                  </button>

                  {/* Modal Header */}
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Confirm Payment
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4 md:text-[16px] text-[14px]">
                    Please enter your transaction PIN to confirm this payment of{" "}
                    <span className="font-semibold">
                      {paymentRequestData.amount} {paymentRequestData.currency}
                    </span>
                    .
                  </p>

                  <OTPInput
                    value={transactionPin}
                    inputType="password"
                    inputStyle={{ width: "100%" }}
                    onChange={setTransactionPin}
                    numInputs={4}
                    renderSeparator={
                      <span style={{ visibility: "hidden" }}>---</span>
                    }
                    renderInput={(props) => (
                      <input
                        {...props}
                        placeholder="0"
                        className="text-center text-gray-700 dark:text-gray-300 focus:border-[#0E7BB2] bg-white/8 border-gray-300 dark:border-[white]/50 otp-input text-[26px] font-[600] outline-none h-[68px] rounded-md border placeholder:text-[#96969659] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    )}
                  />

                  <button
                    onClick={proceedAndProcessPayment}
                    disabled={
                      isLoading || !transactionPin || transactionPin.length < 4
                    }
                    className="hover:bg-[#0c5e89] bg-[#0E7BB2] mt-3 flex justify-center items-center gap-2 rounded-[10px] py-3 w-full text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Processing..." : "Confirm Payment"}
                    {isLoading && (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default ProcessPaymentRequest;
