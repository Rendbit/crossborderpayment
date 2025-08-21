import React from "react";
import { X } from "lucide-react";
import { useAppContext } from "../../../context/useContext";
import ArrayItemLoader from "../../loader/ArrayItemLoader";
import { CgAdd } from "react-icons/cg";
import { getAssetDisplayName } from "../../../utils";

interface AddCurrencyModalProps {
  loadingPUBLIC_ASSETS: boolean;
  PUBLIC_ASSETS: Record<string, any>;
  availableAssets: string[];
  handleAddTrustLine: (asset: any) => Promise<void>;
  loading: boolean;
  setIsAddCurrencyModalOpen: (open: boolean) => void;
}

const AddCurrencyModal: React.FC<AddCurrencyModalProps> = ({
  loadingPUBLIC_ASSETS,
  PUBLIC_ASSETS,
  availableAssets,
  handleAddTrustLine,
  loading,
  setIsAddCurrencyModalOpen,
}) => {
  const { theme } = useAppContext();
  const [selectedAsset, setSelectedAsset] = React.useState<any>(null);

  const handleAddClick = async (asset: any) => {
    setSelectedAsset(asset);
  };

  const handleConfirm = async () => {
    await handleAddTrustLine(selectedAsset);
    setSelectedAsset(null);
    setIsAddCurrencyModalOpen(false);
  };

  return (
    <>
      {/* Main Add Currency Modal */}
      {!selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-300/90 dark:bg-black/90">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 relative">
            {/* Close Button */}
            <button
              className="absolute bg-gray-100 dark:bg-gray-700 rounded-full p-1 text-[1rem] top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
              onClick={() => setIsAddCurrencyModalOpen(false)}
            >
              <X size={24} />
            </button>

            {/* Modal Header */}
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Add Currency
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Select and add new currency to your currency list.
            </p>

            {/* Content */}
            {loadingPUBLIC_ASSETS ? (
              <ArrayItemLoader />
            ) : availableAssets?.length > 0 ? (
              availableAssets.map((key, index) => (
                <div
                  className={` items-center justify-between ${
                    PUBLIC_ASSETS[key].code === "NGNC" ? "hidden" : "flex"
                  }`}
                  key={index}
                >
                  <div className="flex items-center gap-3 py-2 px-3  cursor-pointer rounded-md">
                    <img
                      src={PUBLIC_ASSETS[key].image}
                      alt={PUBLIC_ASSETS[key].name}
                      className="w-8 h-8"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {PUBLIC_ASSETS[key].name}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {getAssetDisplayName(PUBLIC_ASSETS[key].code)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddClick(PUBLIC_ASSETS[key])}
                    className="flex items-center gap-1 px-2 py-1 text-sm  text-white rounded-md hover:bg-[#0c5e89] bg-[#0E7BB2]"
                  >
                    Add <CgAdd />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400">
                No more assets to add
              </p>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-300/90 dark:bg-black/90">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 relative">
            <div className="text-center flex flex-col items-center mt-4">
              <img
                src={selectedAsset.image}
                className="w-16 h-16 mb-2"
                alt={selectedAsset.name}
              />
              <div>
                <p className={`font-medium text-gray-700 dark:text-gray-300`}>
                  {selectedAsset.name}
                </p>
                <p className={`text-xs text-gray-700 dark:text-gray-300`}>
                  {getAssetDisplayName(selectedAsset?.code)}
                </p>
              </div>
            </div>

            <p className="text-sm mt-6 text-center text-gray-700 dark:text-gray-300">
              Are you sure you want to{" "}
              <span className="font-semibold">ADD</span> this asset to your list
              of trustlines?
            </p>

            <div className="flex gap-4 mt-6">
              <button
                className={`p-3 rounded-lg w-full text-gray-700 dark:text-gray-300
                    border border-gray-700 dark:border-gray-300
                    disabled:opacity-50`}
                onClick={() => setSelectedAsset(null)}
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
                onClick={handleConfirm}
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
      )}
    </>
  );
};

export default AddCurrencyModal;
