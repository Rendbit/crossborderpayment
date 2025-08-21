import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAppContext } from "../../../context/useContext";
import { useNavigate } from "react-router-dom";
import OTPInput from "react-otp-input";

interface PrivateKeyModalProps {
  handleConfirmation: (transactionPin: string) => void;
  loading: boolean;
  showPrivateKey: any;
}

const PrivateKeyModal: React.FC<PrivateKeyModalProps> = ({
  handleConfirmation,
  loading,
  showPrivateKey,
}) => {
  const { setIsPrivateKeyModalOpen } = useAppContext();
  const [transactionPin, setTransactionPin] = useState<any>("");

  useEffect(() => {
    if (showPrivateKey) {
      setIsPrivateKeyModalOpen(false);
    }
  }, [showPrivateKey]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-300/90 dark:bg-black/90">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 relative">
        {/* Close Button */}
        <button
          className="absolute bg-gray-100 dark:bg-gray-700 rounded-full p-1 text-[1rem] top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
          onClick={() => setIsPrivateKeyModalOpen(false)}
        >
          <X size={24} />
        </button>

        {/* Modal Header */}
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Enter Password
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4 md:text-[16px] text-[14px]">
          Exporting your private key will reveal sensitive information about
          your wallet. Ensure you store it securely and never share it with
          anyone. Losing your private key may result in the permanent loss of
          your assets.
        </p>

        <p className="font-medium text-gray-900 dark:text-white">
          Enter your pin
        </p>
        <OTPInput
          value={transactionPin}
          inputType="password"
          inputStyle={{ width: "100px" }}
          onChange={setTransactionPin}
          numInputs={4}
          renderSeparator={<span style={{ visibility: "hidden" }}>---</span>}
          renderInput={(props) => (
            <input
              {...props}
              placeholder="0"
              className="text-center text-gray-700 darktext-gray-300 focus:border-[#0E7BB2] bg-white/8 border-gray-300 dark:border-[white]/50  otp-input text-[26px] font-[600] outline-none h-[68px] rounded-md border placeholder:text-[#96969659] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          )}
        />

        <button
          onClick={() => {
            handleConfirmation(transactionPin);
          }}
          disabled={loading || !transactionPin || transactionPin.length < 4}
          className="hover:bg-[#0c5e89] bg-[#0E7BB2] mt-3 flex justify-center items-center rounded-[10px] py-2 w-full text-white"
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

export default PrivateKeyModal;
