import React, { useEffect, useState } from "react";
import { useAppContext } from "../../../context/useContext";
import OTPInput from "react-otp-input";
import { X } from "lucide-react";

interface TransactionConfirmationModalProps {
  handlTransactionConfirmation: (transactionPin: string) => void;
  loading: boolean;
  alertType: string;
}

const TransactionConfirmationModal: React.FC<
  TransactionConfirmationModalProps
> = ({ handlTransactionConfirmation, loading, alertType }) => {
  const [transactionPin, setTransactionPin] = useState<any>("");

  const { theme, setIsRemoveTransactionConfirmationModalOpen } =
    useAppContext();

  useEffect(() => {
    if (alertType === "success") {
      setIsRemoveTransactionConfirmationModalOpen(false);
    }
  }, [alertType]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 dark:bg-black/90">
      <div
        className={`bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 relative`}
      >
        <button
          className="absolute bg-gray-100 dark:bg-gray-700 rounded-full p-1 text-[1rem] top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
          onClick={() => setIsRemoveTransactionConfirmationModalOpen(false)}
        >
          <X size={24} />
        </button>
        {/* Modal Header */}
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Confirm Transaction
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Please enter your transaction PIN to confirm this transaction.
        </p>
        <OTPInput
          value={transactionPin}
          inputType="number"
          inputStyle={{ width: "80px" }}
          onChange={setTransactionPin}
          numInputs={4}
          renderSeparator={<span style={{ visibility: "hidden" }}>---</span>}
          renderInput={(props) => (
            <input
              {...props}
              placeholder="0"
              className="text-center text-white bg-white/8  border-[white]/50  otp-input text-[26px] font-[600] outline-none h-[68px] rounded-md border placeholder:text-[#96969659] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          )}
        />

        <button
          className={`p-3 mt-4 rounded-lg w-full flex items-center justify-center gap-2 ${
            theme === "dark"
              ? "hover:bg-[#0c5e89] bg-[#0E7BB2]"
              : "hover:bg-[#0c5e89] bg-[#0E7BB2]"
          } text-white disabled:opacity-50`}
          onClick={() => {
            handlTransactionConfirmation(transactionPin);
          }}
          disabled={loading || !transactionPin || transactionPin.length < 4}
        >
          Confirm
          {loading && (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          )}
        </button>
      </div>
    </div>
  );
};

export default TransactionConfirmationModal;
