import React from "react";
import { useAppContext } from "../../../context/useContext";

interface RemoveCurrencyModalProps {
  selectedTrustLine: any;
  handlRemoveTrustLine: () => void;
  loading?: boolean;
}

const RemoveCurrencyModal: React.FC<RemoveCurrencyModalProps> = ({
  selectedTrustLine,
  handlRemoveTrustLine,
  loading = false,
}) => {
  const { setSelectedAsset, theme, setIsRemoveCurrencyModalOpen } =
    useAppContext();

  if (!selectedTrustLine) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div
        className={`mx-3 w-full max-w-sm p-6 rounded-xl bg-white dark:bg-gray-800`}
      >
        <div className="text-center flex flex-col items-center mt-4">
          <img
            src={selectedTrustLine.image}
            className="w-16 h-16 mb-2"
            alt={selectedTrustLine?.asset_name}
          />
          <div>
            <p className={`font-medium text-gray-700 dark:text-gray-300`}>
              {selectedTrustLine?.asset_name}
            </p>
            <p className={`text-xs text-gray-700 dark:text-gray-300`}>
              {selectedTrustLine?.asset_code === "NATIVE"
                ? "XLM"
                : selectedTrustLine?.asset_code}
            </p>
          </div>
        </div>

        <p className="text-sm mt-6 text-center text-gray-700 dark:text-gray-300">
          Are you sure you want to <span className="font-semibold">REMOVE</span>{" "}
          this asset from your list of trustlines?
        </p>

        <div className="flex gap-4 mt-6">
          <button
            className={`p-3 rounded-lg w-full ${
              theme === "dark"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-red-500 hover:bg-red-600"
            } text-white disabled:opacity-50`}
            onClick={() => {
              setSelectedAsset(null);
              setIsRemoveCurrencyModalOpen(false);
            }}
            disabled={loading}
          >
            No
          </button>
          <button
            className={`p-3 rounded-lg w-full flex items-center justify-center gap-2 ${
              theme === "dark"
                ? "hover:bg-[#0c5e89] bg-[#0E7BB2]"
                : "hover:bg-[#0c5e89] bg-[#0E7BB2]"
            } text-white disabled:opacity-50`}
            onClick={handlRemoveTrustLine}
            disabled={loading}
          >
            Yes, continue
            {loading && (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemoveCurrencyModal;
