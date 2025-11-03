import React from "react";
import { X, ArrowRight } from "lucide-react";
import { useAppContext } from "../../../context/useContext";
import { useNavigate } from "react-router-dom";

const AddMoneyModal: React.FC = () => {
  const { setIsAddMoneyModalOpen } = useAppContext();
  const navigate = useNavigate();
  const handleAddViaLumen = () => {
    navigate("/deposit-crypto");
    setIsAddMoneyModalOpen(false);
  };
  const handleChooseRecipientCountry = () => {
    navigate("/choose-recipient-deposit-country");
    setIsAddMoneyModalOpen(false);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-300/90 dark:bg-black/90">
      <div className="bg-white mx-5 dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 relative">
        {/* Close Button */}
        <button
          className="absolute bg-gray-100 dark:bg-gray-700 rounded-full p-1 text-[1rem] top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
          onClick={() => setIsAddMoneyModalOpen(false)}
        >
          <X size={24} />
        </button>

        {/* Modal Header */}
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Add Money
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Choose asset, verify network, and get wallet address.
        </p>

        {/* Options */}
        <div className="flex flex-col gap-4">
          {/* Option 1 */}
          <button
            onClick={handleAddViaLumen}
            className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                {/* Lumens Icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-6 h-6 text-gray-800 dark:text-white"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"
                  />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-white">
                  Add via Lumens
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-300">
                  Using stellar XLM as the currency bridge.
                </p>
              </div>
            </div>
            <ArrowRight className="text-gray-400" />
          </button>

          {/* Option 2 */}
          <button
            onClick={handleChooseRecipientCountry}
            className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                {/* Bank Icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-6 h-6 text-gray-800 dark:text-white"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 10l9-6 9 6M4 10v10h16V10M12 14v6"
                  />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-white">
                  Add via Bank Transfer
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-300">
                  Easily transfer funds to any local bank account within minutes
                </p>
              </div>
            </div>
            <ArrowRight className="text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMoneyModal;
