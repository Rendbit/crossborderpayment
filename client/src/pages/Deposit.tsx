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
import DepositProvider from "./DepositProvider";
import MobileNav from "../components/mobile-nav/MobileNav";

const Deposit: React.FC = () => {
  const user = Cookies.get("token");
  const [assets, setAssets] = useState<any[]>([]);
  const [dropDown, setDropDown] = useState<string>("");
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
      const message = `Wallet Address: ${address}\nToken: ${selectedAsset?.asset_name}\nNetwork: Stellar`;
      await navigator.clipboard.writeText(message);
      setMsg("Wallet details copied!");
      setAlertType("success");
    } catch (err) {
      console.error(err);
      setMsg("Failed to share wallet. Try again.");
      setAlertType("error");
    }
  };

  const handleGetMyAssets = async () => {
    const storedWalletAssets = localStorage.getItem("allWalletAssets");
    const parsedWalletAssets = JSON.parse(storedWalletAssets || "null");
    const storedSelectedAsset = localStorage.getItem("selectedAsset");
    const parsedSelectedAsset = JSON.parse(storedSelectedAsset || "null");

    if (parsedWalletAssets) setAssets(parsedWalletAssets);
    if (parsedSelectedAsset) setSelectedAsset(parsedSelectedAsset);
    if (!parsedWalletAssets || !parsedSelectedAsset)
      setLoadingWalletAssets(true);

    try {
      if (!user) {
        setLoadingWalletAssets(false);
        return;
      }

      const response = await getMyAssets(user, selectedAsset);

      if (!response.success) {
        if (response.message === "Login has expired") {
          localStorage.clear();
          Cookies.remove("token");
          navigate("/login");
        }
        if (response.message.includes("Fund your wallet with at least 5 XLM")) {
          setActivateWalletAlert(response.message);
          setIsActivateWalletAlert(true);
        } else {
          setAlertType("error");
        }
        setLoadingWalletAssets(false);
        return;
      }

      setAssets(response.data?.allWalletAssets || []);
      setSelectedAsset(response.data?.allWalletAssets?.[0]);
    } catch (error: any) {
      if (error.message === "Login has expired") {
        localStorage.clear();
        Cookies.remove("token");
        navigate("/login");
      }
      if (error.message.includes("Fund your wallet with at least 5 XLM")) {
        setActivateWalletAlert(error.message);
        setIsActivateWalletAlert(true);
      } else {
        setAlertType("error");
      }
    } finally {
      setLoadingWalletAssets(false);
    }
  };

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      navigate("/login");
      return;
    }
    const storedUserData = localStorage.getItem("userData");
    const parsedUserData = JSON.parse(storedUserData || "null");
    setAddress(parsedUserData?.stellarPublicKey || "");
    handleGetMyAssets();
  }, []);

  return (
    <div className="w-full md:grid grid-cols-12">
      <div className="md:block hidden h-[100vh] sidebar p-4 pr-2 ">
        <SideNav />
      </div>
      <div className="py-6 overflow-hidden h-[100px] w-full z-50 sticky md:top-[-2%] top-0">
        <TopNav page="Deposit" />
      </div>
      <div className="text-white mt-[150px]  main-container md:pl-[60px] px-4 pl-2 w-full overflow-hidden md:col-span-10 col-span-12">
        <main className="top-0 md:px-[24%] px-0 left-0 right-0 w-full">
          <div className="max-w-6xl mx-auto">
            <div className="bg-[#050d2a] border border-white/10 rounded-3xl shadow-xl md:p-8 p-2 backdrop-blur-md overflow-hidden">
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
                  <section className="w-1/2 md:px-4 px-2">
                    <div className="space-y-8">
                      <div>
                        <label className="block text-sm text-gray-300 mb-2">
                          Select Asset
                        </label>
                        <div
                          className="bg-white/10 px-4 py-3 rounded-lg flex items-center justify-between cursor-pointer"
                          onClick={() =>
                            setDropDown(dropDown === "assets" ? "" : "assets")
                          }
                        >
                          <span>
                            {selectedAsset?.asset_name || "Choose an asset"}
                          </span>
                          <FaChevronDown className="text-gray-400" />
                        </div>
                        {dropDown === "assets" && (
                          <div className="absolute md:w-[48.5%] top-[15%] mt-2 max-h-60 overflow-y-auto bg-black rounded-lg p-3 border border-white/20 z-50 ">
                            {assets?.map((asset, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 py-2 cursor-pointer hover:bg-white/10 rounded-md px-2"
                                onClick={() => {
                                  setSelectedAsset(asset);
                                  setDropDown("");
                                }}
                              >
                                <img src={asset.image} alt="" width="25" />
                                <div>
                                  <p className="text-sm">{asset.asset_name}</p>
                                  <p className="text-xs text-gray-400">
                                    {asset.asset_code}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
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

                      <div>
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
                          0-fee internal transfer via RendBit ID:{" "}
                          <span className="text-white">****</span>
                        </p>
                      </div>

                      <div className="pt-4">
                        <button
                          onClick={handleShare}
                          className="bg-[#0E7BB2] cursor-pointer hover:bg-[#0b5e88] transition-colors duration-200 w-full py-3 rounded-lg text-white font-medium"
                        >
                          Share Wallet Address
                        </button>
                      </div>
                    </div>
                  </section>
                  <section className="w-1/2 md:px-4 px-2">
                    <div className="space-y-8 text-center text-gray-300">
                      <DepositProvider />
                    </div>
                  </section>
                </div>
              </div>

              {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
            </div>
          </div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
};

export default Deposit;
