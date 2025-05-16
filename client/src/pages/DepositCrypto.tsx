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
      // setTimeout(() => {
      //   if (!qrRef.current) {
      //     setMsg("QR code is not ready.");
      //     setAlertType("error");
      //     return;
      //   }
      //   html2canvas(qrRef.current).then(async (canvas) => {
      //     canvas.toBlob(async (blob) => {
      //       if (blob) {
      //         const data = [new ClipboardItem({ [blob.type]: blob })];
      //         await navigator.clipboard.write(data);

      //         const message = `Wallet Address: ${address}\nNetwork: Stellar`;
      //         await navigator.clipboard.writeText(message);

      //         setMsg("Wallet address and QR copied!");
      //         setAlertType("success");
      //       } else {
      //         setMsg("Failed to generate QR image.");
      //         setAlertType("error");
      //       }
      //     }, "image/png");
      //   });
      // }, 350);
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
    setAddress(parsedUserData?.stellarPublicKey);
    handleGetMyAssets();
  }, []);

  return (
    <div className="flex items-start">
      <SideNav />
      <div className="w-full lg:w-[84%] ml-auto">
        <TopNav />
        <main className="flex-grow px-4 text-white sm:px-10 py-10 mt-[70px] overflow-y-hidden">
          <div className="max-w-6xl  mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-3xl shadow-xl p-8 backdrop-blur-md overflow-hidden">
              <div className="text-center mb-8">
                <div className="inline-block bg-[#0E7BB2] p-3 rounded-full shadow-md">
                  <RiExchange2Line className="text-white text-xl" />
                </div>
                <h1 className="mt-4 text-2xl font-bold">Manage Your Wallet</h1>
                <p className="text-gray-400 text-sm">
                  Choose asset, verify network, and get wallet address.
                </p>
              </div>
              <div className="flex justify-center mb-8 space-x-6 text-white">
                <button
                  onClick={() => setSegment("crypto")}
                  className={`cursor-pointer px-6 py-2 rounded-full transition-colors duration-300 font-semibold ${
                    segment === "crypto"
                      ? "bg-[#0E7BB2] text-white shadow-lg"
                      : "bg-white/10 hover:bg-white/20"
                  }`}
                >
                  Crypto
                </button>
                <button
                  onClick={() => setSegment("fiat")}
                  className={`cursor-pointer px-6 py-2 rounded-full transition-colors duration-300 font-semibold ${
                    segment === "fiat"
                      ? "bg-[#0E7BB2] text-white shadow-lg"
                      : "bg-white/10 hover:bg-white/20"
                  }`}
                >
                  Fiat
                </button>
              </div>
              {isActivateWalletAlert && (
                <div className="bg-red-500/80 text-white text-center text-sm py-3 px-4 rounded-md mb-6">
                  {activateWalletAlert}
                </div>
              )}
              {loadingWalletAssets ? (
                <div className="flex justify-center items-center mt-10">
                  <Loader />
                </div>
              ) : (
                <div className="relative min-h-[350px] overflow-hidden">
                  <div
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{
                      width: "200%",
                      transform:
                        segment === "crypto"
                          ? "translateX(0%)"
                          : "translateX(-50%)",
                    }}
                  >
                    {/* Crypto Section */}
                    <section className="w-1/2 px-4">
                      <div className="space-y-8">
                        <div className="flex-1">
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">
                              Select Asset
                            </label>
                            <div
                              className="bg-white/10 px-4 py-3 rounded-lg flex items-center justify-between cursor-pointer"
                              onClick={() =>
                                setDropDown(
                                  dropDown === "assets" ? false : "assets"
                                )
                              }
                            >
                              <span>
                                {selectedAsset?.asset_name || "Choose an asset"}
                              </span>
                              <FaChevronDown className="text-gray-400" />
                            </div>
                            {dropDown === "assets" && (
                              <div className="mt-2 max-h-60 overflow-y-auto bg-white/10 rounded-lg p-3 border border-white/20 z-50 relative">
                                {assets?.map((asset, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center gap-2 py-2 cursor-pointer hover:bg-white/10 rounded-md px-2"
                                    onClick={() => {
                                      setSelectedAsset(asset);
                                      setDropDown(false);
                                    }}
                                  >
                                    <img src={asset.image} alt="" width="25" />
                                    <div>
                                      <p className="text-sm">
                                        {asset.asset_name}
                                      </p>
                                      <p className="text-xs text-gray-400">
                                        {asset.asset_code}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="mt-6">
                            <label className="block text-sm text-gray-300 mb-2">
                              Network
                            </label>
                            <div className="bg-white/10 px-4 py-3 rounded-lg flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <img
                                  src="https://ipfs.io/ipfs/bafkreihntcz2lpaxawmbhwidtuifladkgew6olwuly2dz5pewqillhhpay"
                                  alt="Lumens"
                                  width="25"
                                />
                                <p>Lumens</p>
                              </div>
                              <FaChevronDown className="text-gray-400" />
                            </div>
                          </div>

                          <div className="mt-6">
                            <label className="block text-sm text-gray-300 mb-2">
                              Recipient Address
                            </label>
                            <div className="bg-white/10 px-4 py-3 rounded-lg flex items-center justify-between">
                              <input
                                value={address}
                                type="text"
                                className="bg-transparent text-white w-full outline-none placeholder-gray-400"
                                placeholder="Wallet address"
                                readOnly
                              />
                              <BiCopy
                                className="ml-3 text-white cursor-pointer"
                                onClick={() => {
                                  navigator.clipboard.writeText(address);
                                  setMsg("Address copied successfully!");
                                  setAlertType("success");
                                }}
                              />
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                              0-fee internal transfer via Mammon ID:{" "}
                              <span className="text-white">****</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex-1 gap-3">
                          {/* <div className="w-48 flex justify-center items-center">
                            <div className="pt-6 animate-fadeIn" ref={qrRef}>
                              <QRCode bgColor="#0E7BB2" value={address} />
                            </div>
                          </div> */}

                          <div className="pt-4">
                            <button
                              onClick={handleShare}
                              className="bg-[#0E7BB2] cursor-pointer hover:bg-[#0b5e88] transition-colors duration-200 w-full py-3 rounded-lg text-white font-medium"
                            >
                              Share Wallet Address
                            </button>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Fiat Section */}
                    <section className="w-1/2 px-4">
                      <div className="space-y-8 text-center text-gray-300">
                        <h2 className="text-xl font-semibold mb-4">
                          Fiat Deposit
                        </h2>
                        <p>
                          To deposit fiat currency, please use your bank
                          transfer details or payment provider info below.
                        </p>
                        <div className="bg-white/10 p-6 rounded-xl">
                          <p className="mb-2">
                            Bank Name:{" "}
                            <span className="text-white">Example Bank</span>
                          </p>
                          <p className="mb-2">
                            Account Number:{" "}
                            <span className="text-white">1234567890</span>
                          </p>
                          <p className="mb-2">
                            Routing Number:{" "}
                            <span className="text-white">987654321</span>
                          </p>
                          <p className="mb-2">
                            SWIFT Code:{" "}
                            <span className="text-white">EXAMP123</span>
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setMsg("Fiat deposit details copied!");
                            setAlertType("success");
                            navigator.clipboard.writeText(
                              "Bank Name: Example Bank\nAccount Number: 1234567890\nRouting Number: 987654321\nSWIFT Code: EXAMP123"
                            );
                          }}
                          className="bg-[#0E7BB2] hover:bg-[#0b5e88] transition-colors duration-200 py-3 px-8 rounded-lg text-white font-semibold"
                        >
                          Copy Fiat Deposit Details
                        </button>
                      </div>
                    </section>
                  </div>
                </div>
              )}
              {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DepositCrypto;
