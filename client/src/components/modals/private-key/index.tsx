import React from "react";
import { X, ArrowRight, Lock, EyeOff, Eye } from "lucide-react";
import { useAppContext } from "../../../context/useContext";
import { useNavigate } from "react-router-dom";

const PrivateKeyModal: React.FC = () => {
  const { setIsPrivateKeyModalOpen } = useAppContext();
  const [showPin, setShowPin] = React.useState(false);
  const [pinType, setPinType] = React.useState("password");
  const navigate = useNavigate();

  const handleAddViaLumen = () => {
    navigate("/deposit-crypto");
    setIsPrivateKeyModalOpen(false);
  };

  const handleChooseRecipientCountry = () => {
    navigate("/choose-recipient-deposit-country");
    setIsPrivateKeyModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
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
          Exporting your private key will reveal sensitive information about your wallet. Ensure you store it securely and never share it with anyone. Losing your private key may result in the permanent loss of your assets.
        </p>

        {/* Options */}
        <div className="flex flex-col gap-4">
          {/* Option 1 */}
            <div className="flex items-center gap-3">
              <div className="text-left w-full">
                <p className="font-medium text-gray-900 dark:text-white">
                  Enter your pin
                </p>
                <div className="flex items-center gap-2 mt-2 border py-2 w-full border-gray-200 dark:border-gray-700 rounded-lg px-3">
                    <div className="flex items-center gap-2 w-full">
                        <Lock size={"15px"} className="text-gray-500 dark:text-gray-400" />
                        <input type={pinType} placeholder="********" className="w-full outline-none text-gray-500 dark:text-gray-400"/>
                    </div>
                    {
                        showPin ?
                        <EyeOff onClick={() => {
                            setPinType('password');
                            setShowPin(false);
                        }} size={"15px"} className="text-gray-500 dark:text-gray-400 cursor-pointer" />
                        :
                        <Eye onClick={() => {
                            setPinType('text');
                            setShowPin(true);
                        }} size={"15px"} className="text-gray-500 dark:text-gray-400 cursor-pointer" />
                    }
                </div>
                <div className="flex justify-end mt-5 gap-3">
                    <button className="border border-[#E2E4E9] rounded-[10px] py-[6px] w-full text-gray-500 dark:text-gray-400">Discard</button>
                    <button className="bg-[#375DFB] rounded-[10px] py-2 w-full text-white">Apply Changes</button>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PrivateKeyModal;
