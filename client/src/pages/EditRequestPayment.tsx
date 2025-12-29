import React, { useEffect, useState } from "react";
import { useAppContext } from "../context/useContext";
import { FaExchangeAlt } from "react-icons/fa";
import TopNav from "../components/top-nav/TopNav";
import { HiOutlineDocumentCurrencyDollar } from "react-icons/hi2";
import { MdUpload, MdCalendarToday } from "react-icons/md";
import Alert from "../components/alert/Alert";
import { X } from "lucide-react";
import OTPInput from "react-otp-input";
import { useParams } from "react-router-dom";

const EditRequestPayment = () => {
  const {
    setIsRequestPaymentModalOpen,
    setIsProcessPaymentRequestModalOpen,
    isProcessPaymentRequestModalOpen,
  } = useAppContext();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("crypto");
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

  const [expirationDate, setExpirationDate] = useState<string>("");

  const [formData, setFormData] = useState({
    amount: "",
    currency: "",
    toUserInput: "", // Separate input field value
    paymentMethod: "crypto",
    expiresIn: "",
    description: "",
    frequency: "weekly",
  });

  useEffect(() => {
    setIsRequestPaymentModalOpen(false);
    console.log(user.pinCode);
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const proceedAndMakePaymentRequest = async () => {
    console.log("Called ======= ");

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
    // Handle continue action
    try {
      setIsLoading(true);

      // Prepare the payload with the actual user object, not the input
      const payload = {
        requestId,
        amount: formData.amount.toString(),
        currency: formData.currency,
        toUser: formData.toUserInput, // Send the input value
        // paymentMethod: selectedPaymentMethod,
        expiresIn: formData.expiresIn,
        description: formData.description,
      };

      console.log("Payload:", payload);

      const response = await fetch(`${BASE_URL}/paymentRequest/edit`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-api-key": `${API_KEY}`,
        },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        fetchData();
      }
      const data = await response.json();
      setMsg(data.message);
      setAlertType(data.success ? "success" : "error");
      console.log("Response:", data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProceed = async () => {
    setIsPrivateKeyModalOpen(true);
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

        // Set the form data
        setFormData({
          amount: paymentRequest.amount || "",
          currency: paymentRequest.currency || "",
          toUserInput: paymentRequest.toUser?.username || "", // Initialize with username
          paymentMethod: paymentRequest.paymentMethod || selectedPaymentMethod,
          expiresIn: expiresInDays,
          description: paymentRequest.description || "",
          frequency: "weekly",
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

  useEffect(() => {
    if (requestId) {
      fetchData();
    }
  }, [requestId]);

  const handleCancelPaymentRequest = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/paymentRequest/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-api-key": `${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestId }),
      });
      const data = await response.json();
      if (data.success) {
        setMsg(data.message || "Payment request canceled successfully");
        setAlertType("success");
      } else {
        setMsg(data.message || "Failed to cancel payment request");
        setAlertType("error");
      }
    } catch (error) {
      console.error("Error canceling payment request:", error);
      setMsg("An error occurred while canceling the payment request");
      setAlertType("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 text-gray-900 dark:text-gray-100">
      {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
      <TopNav page="Request Payment" />
      <div className="flex items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          {/* Icon */}
          <div className="flex justify-center items-center py-4">
            <span className="bg-[#E7F1F7] dark:bg-gray-700 p-3 rounded-full">
              <HiOutlineDocumentCurrencyDollar className="text-gray-900 dark:text-gray-100 w-6 h-6" />
            </span>
          </div>

          {/* Heading */}
          {localStorage.getItem("paymentMethod") === "one-time" ? (
            <h2 className="text-center text-xl font-semibold mb-6">
              One time payment
            </h2>
          ) : (
            <h2 className="text-center text-xl font-semibold mb-6">
              Recurring payment
            </h2>
          )}

          {/* Form */}
          <div className="space-y-5">
            {/* Amount */}
            <div>
              <label className="block text-sm font-medium mb-2">Amount</label>
              <input
                type="text"
                name="amount"
                placeholder="Amount"
                value={formData.amount}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0E7BB2]"
              />
            </div>

            {/* To User */}
            <div>
              <label className="block text-sm font-medium mb-2">To User</label>
              <input
                type="text"
                name="toUserInput"
                placeholder="Recipient username or ID"
                value={formData.toUserInput}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0E7BB2]"
              />
            </div>

            {/* Display User Info (Read-only) */}
            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg space-y-1">
              <p className="text-[13px] text-gray-600 dark:text-gray-300">
                <span className="font-medium">Username:</span>{" "}
                {toUserInfo.username || "N/A"}
              </p>
              <p className="text-[13px] text-gray-600 dark:text-gray-300">
                <span className="font-medium">Email:</span>{" "}
                {toUserInfo.primaryEmail || "N/A"}
              </p>
              <p className="text-[13px] text-gray-600 dark:text-gray-300">
                <span className="font-medium">Wallet Address:</span>{" "}
                {toUserInfo.stellarPublicKey
                  ? `${toUserInfo.stellarPublicKey.slice(0, 10)}...`
                  : "N/A"}
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <input
                type="text"
                name="description"
                placeholder="Description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0E7BB2]"
              />
            </div>

            {/* Currency Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Currency</label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0E7BB2]"
              >
                <option value="">Select a currency</option>
                <option value="NGNC">NGN - Nigerian Naira</option>
                <option value="GHSC">GHSC - Ghanaian Cedi</option>
                <option value="KESC">KES - Kenyan Shilling</option>
                <option value="NATIVE">XLM - Stellar Token</option>
              </select>
            </div>

            {/* Expires In */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">
                  Expires in (days)
                </label>
                {expirationDate && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(expirationDate).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="relative">
                <input
                  type="number"
                  name="expiresIn"
                  placeholder="Number of Days"
                  value={formData.expiresIn}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0E7BB2]"
                />
              </div>
            </div>

            {/* Proceed Button */}
            {user?.primaryEmail === fromUserInfo?.primaryEmail && (
              <div className="flex gap-4">
                <button
                  onClick={handleCancelPaymentRequest}
                  disabled={isLoading || loading}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 rounded-lg transition-colors mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Processing..." : "Cancel Payment"}
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
                    Note:
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4 md:text-[16px] text-[14px]">
                    Exporting your private key will reveal sensitive information
                    about your wallet. Ensure you store it securely and never
                    share it with anyone. Losing your private key may result in
                    the permanent loss of your assets.
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
                        className="text-center text-gray-700 darktext-gray-300 focus:border-[#0E7BB2] bg-white/8 border-gray-300 dark:border-[white]/50  otp-input text-[26px] font-[600] outline-none h-[68px] rounded-md border placeholder:text-[#96969659] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    )}
                  />

                  <button
                    onClick={proceedAndMakePaymentRequest}
                    disabled={
                      loading || !transactionPin || transactionPin.length < 4
                    }
                    className="hover:bg-[#0c5e89] bg-[#0E7BB2] mt-3 flex justify-center items-center rounded-[10px] py-2 w-full text-white"
                  >
                    Confirm
                    {isLoading && (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></div>
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

export default EditRequestPayment;
