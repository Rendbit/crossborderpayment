import React, { useEffect, useRef, useState } from "react";
import SideNav from "../components/side-nav/SideNav";
import TopNav from "../components/top-nav/TopNav";
import { FaChevronDown } from "react-icons/fa6";
import Cookies from "js-cookie";
import { BiCopy } from "react-icons/bi";
import Alert from "../components/alert/Alert";
import Loader from "../components/loader/Loader";
import { getMyAssets } from "../function/horizonQuery";
import { useNavigate } from "react-router-dom";
import { RiExchange2Line } from "react-icons/ri";
import html2canvas from "html2canvas";
import QRCode from "react-qr-code";
import { Copy, Banknote, Share2 } from "lucide-react";
import { BsBank } from "react-icons/bs";
import EmptyTopNav from "../components/top-nav/EmptyTopNav";

const DepositCrypto: React.FC = () => {
  const user = Cookies.get("token");
  const [assets, setAssets] = useState<any>([]);
  const [dropDown, setDropDown] = useState<any>("");
  const [selectedAsset, setSelectedAsset] = useState<any>();
  const [showQR, setShowQR] = useState<boolean>(false);
  const [address, setAddress] = useState<string>("");
  const [msg, setMsg] = useState<string>("");
  const [alertType, setAlertType] = useState<string>("");
  const [loadingWalletAssets, setLoadingWalletAssets] =
    useState<boolean>(false);
  const [activateWalletAlert, setActivateWalletAlert] = useState<string>("");
  const [isActivateWalletAlert, setIsActivateWalletAlert] =
    useState<boolean>(false);
  const navigate = useNavigate();
  const qrRef = useRef<any>(null);
  const [segment, setSegment] = useState<"crypto" | "fiat">("crypto");

  const handleShare = async () => {
    try {
      setShowQR(true);
      const message = `Wallet Address: ${address}\nNetwork: Stellar`;
      await navigator.clipboard.writeText(message);

      setMsg("Wallet details copied!");
      setAlertType("success");
      setTimeout(() => {
        if (!qrRef.current) {
          setMsg("QR code is not ready.");
          setAlertType("error");
          return;
        }
        html2canvas(qrRef.current).then(async (canvas) => {
          canvas.toBlob(async (blob) => {
            if (blob) {
              const data = [new ClipboardItem({ [blob.type]: blob })];
              await navigator.clipboard.write(data);

              const message = `Wallet Address: ${address}\nNetwork: Stellar`;
              await navigator.clipboard.writeText(message);

              setMsg("Wallet address and QR copied!");
              setAlertType("success");
            } else {
              setMsg("Failed to generate QR image.");
              setAlertType("error");
            }
          }, "image/png");
        });
      }, 350);
    } catch (err) {
      console.error(err);
      setMsg("Failed to share wallet. Try again.");
      setAlertType("error");
    }
  };

  async function handleGetMyAssets() {
    const storedWalletAssets = localStorage.getItem("allWalletAssets");
    const parsedWalletAssets = JSON.parse(storedWalletAssets || "null");
    const storedSelectedAsset = localStorage.getItem("selectedAsset");
    const parsedSelectedAsset = JSON.parse(storedSelectedAsset || "null");

    if (parsedWalletAssets) {
      setAssets(parsedWalletAssets);
    }
    if (parsedSelectedAsset) {
      setSelectedAsset(parsedSelectedAsset);
    }
    if (!parsedWalletAssets || !parsedSelectedAsset) {
      setLoadingWalletAssets(true);
    }
    try {
      if (!user) {
        setLoadingWalletAssets(false);
        return;
      }
      const response = await getMyAssets(user, selectedAsset);

      if (!response.success) {
        if (
          response.message.includes(
            "Fund your wallet with at least 5 XLM to activate your account."
          )
        ) {
          setActivateWalletAlert(response.message);
          setIsActivateWalletAlert(true);
        } else {
          // setMsg(response.message);
          setAlertType("error");
        }
        setLoadingWalletAssets(false);
        return;
      }

      setAssets(response?.data?.allWalletAssets);
      setSelectedAsset(response?.data?.allWalletAssets[0]);
    } catch (error: any) {
      if (
        error.message.includes(
          "Fund your wallet with at least 5 XLM to activate your account."
        )
      ) {
        setActivateWalletAlert(error.message);
        setIsActivateWalletAlert(true);
      } else {
        // setMsg(error.message || "Failed to get all wallet assets");
        setAlertType("error");
      }
    } finally {
      setLoadingWalletAssets(false);
    }
  }

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      navigate("/login");
    }
    const storedUserData = localStorage.getItem("userData");
    const parsedUserData = JSON.parse(storedUserData || "null");
    setAddress(parsedUserData?.account?.stellarPublicKey);
    handleGetMyAssets();
  }, []);


  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setMsg("Address copied successfully!");
    setAlertType("success");
  };
  return (
    <>
      {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
      <EmptyTopNav />
      <main className="flex items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <div className="w-full max-w-md">
          {/* Top icon */}
          <div className="flex justify-center items-center py-4">
            <span className="bg-[#E7F1F7] dark:bg-gray-700 p-3 rounded-full">
              <BsBank className="text-gray-900 dark:text-gray-100 w-6 h-6" />
            </span>
          </div>

          {/* Title */}
          <h2 className="mt-4 text-center text-xl font-semibold text-gray-800 dark:text-white">
            Method & Details
          </h2>
          <p className="text-gray-500 text-center text-sm dark:text-gray-300">
            Select a payment method and see recipient bank details.
          </p>

          {/* Card */}
          <div className="bg-white dark:bg-gray-800 w-full mt-6 rounded-lg shadow-lg p-6 space-y-5">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="pt-6 animate-fadeIn" ref={qrRef}>
                <QRCode
                  fgColor="#0E7BB2"
                  bgColor="transparent"
                  value={address}
                />
              </div>
            </div>

            {/* Network */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                Network
              </label>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden dark:border-gray-600">
                {/* Lumens Logo */}
                <div className="flex items-center justify-center w-10 h-full bg-gray-100 dark:bg-gray-700 px-2">
                  <img
                    src="https://ipfs.io/ipfs/bafkreihntcz2lpaxawmbhwidtuifladkgew6olwuly2dz5pewqillhhpay"
                    alt="Lumens Logo"
                    className="w-5 h-5"
                  />
                </div>

                <input
                  type="text"
                  readOnly
                  value="Lumens"
                  disabled
                  className="flex-1 p-2 text-gray-700 text-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            </div>

            {/* Lumens Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                Lumens Address
              </label>
              <div className="flex border border-gray-300 rounded-lg overflow-hidden dark:border-gray-600">
                <input
                  type="text"
                  readOnly
                  value={address}
                  className="flex-1 p-2 text-gray-700 text-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-100 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 bg-gray-100 hover:bg-gray-200 border-l border-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:border-gray-600 transition"
                >
                  <Copy className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-between gap-3">
              <button
                onClick={() => navigate(-1)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700 transition"
              >
                Back
              </button>
              <button
                onClick={handleShare}
                className="flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-white transition 
             bg-[#0E7BB2] hover:bg-[#0C6699]"
              >
                <Share2 className="w-4 h-4" /> Share address
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default DepositCrypto;
