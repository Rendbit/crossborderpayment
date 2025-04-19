import React, { useEffect, useState } from "react";
import SideNav from "../components/side-nav/SideNav";
import TopNav from "../components/top-nav/TopNav";
import { FaChevronDown } from "react-icons/fa6";
import Cookies from "js-cookie";
import { BiCopy } from "react-icons/bi";
import Alert from "../components/alert/Alert";
import QRCode from "react-qr-code";
import Loader from "../components/loader/Loader";
import { getMyAssets } from "../function/horizonQuery";
import { useNavigate } from "react-router-dom";
import { RiExchange2Line } from "react-icons/ri";

const DepositCrypto: React.FC = () => {
  const user = Cookies.get("token");
  const [assets, setAssets] = useState<any>([]);
  const [dropDown, setDropDown] = useState<any>("");
  const [selectedAsset, setSelectedAsset] = useState<any>();
  const [address, setAddress] = useState<string>("");
  const [msg, setMsg] = useState<string>("");
  const [alertType, setAlertType] = useState<string>("");
  const [loadingWalletAssets, setLoadingWalletAssets] =
    useState<boolean>(false);
  const [activateWalletAlert, setActivateWalletAlert] = useState<string>("");
  const [isActivateWalletAlert, setIsActivateWalletAlert] =
    useState<boolean>(false);
  const navigate = useNavigate();

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
          setMsg(response.message);
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
        setMsg(error.message || "Failed to get all wallet assets");
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
    <div>
      <div className="flex items-start">
        <SideNav />
        <div className="w-full lg:w-[84%] ml-auto">
          <TopNav />
          <div className="py-[20px] h-[100vh] px-[10px]  mt-[70px] lg:mx-[50px] ">
            <div className="flex items-center gap-3">
              <div className="bg-[#ffffff] p-2 rounded-full flex items-center justify-center">
                <RiExchange2Line className="text-primary-color text-[22px]" />
              </div>

              <div className="ml-2">
              <p className="text-white text-[24px] font-semibold">
                  Choose preferred crypto
                </p>
                <p className="font-[300] text-[#ffffff]">
                  Select wallet address
                </p>
              </div>
            </div>
            {isActivateWalletAlert && (
              <p className="text-black tetx-center flex justify-center items-center align-middle text-[20px] p-5 bg-red-300 rounded-md my-2">
                {isActivateWalletAlert && activateWalletAlert}
              </p>
            )}
            {loadingWalletAssets ? (
              <div className="mt-9 flex items-center justify-center">
                <Loader />
              </div>
            ) : (
              <div className="mt-9 border border-[#FFFFFF]/50 rounded-2xl p-5">
                <div className="md:flex block items-center gap-5 justify-between">
                  <div className="w-full mx-auto text-white lg:px-4 py-4">
                    <div className="relative">
                      {dropDown === "assets" && (
                        <div className="bg-black w-full absolute top-[75px] rounded-[4px] border border-[#FFFFFF]/50 h-[300px] overflow-x-hidden overflow-y-scroll left-0 px-2 py-3">
                          <div>
                            {assets?.map((asset: any, index: number) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 my-2 cursor-pointer"
                                onClick={() => {
                                  setSelectedAsset(asset);
                                  setDropDown(false);
                                }}
                              >
                                <img src={asset.image} alt="" width="25px" />
                                <div>
                                  <p className="text-[#1C1C1C] font-[300] text-[14px]">
                                    {asset.asset_name}
                                  </p>
                                  <p className="text-[10px] text-[#1C1C1C]">
                                    {asset.asset_code}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="my-5">
                      <label className="text-[#ffffff] font-[300] text-[14px] mb-1 block">
                        Network
                      </label>
                      <div className="flex items-center bg-white/8 justify-between border border-[#FFFFFF]/50 p-3 rounded-[6px] w-full">
                        <div className="flex gap-2">
                          <img
                            src="https://ipfs.io/ipfs/bafkreihntcz2lpaxawmbhwidtuifladkgew6olwuly2dz5pewqillhhpay"
                            alt=""
                            width="25px"
                          />
                          <p>Lumens</p>
                        </div>
                        <FaChevronDown
                          className="cursor-pointer text-gray-300"
                          onClick={() =>
                            setDropDown(
                              dropDown === "network" ? false : "network"
                            )
                          }
                        />
                      </div>
                      <p className={`text-[12px] text-white`}>
                        Wallet address automatically matched to corresponding
                        network
                      </p>
                    </div>
                    <div>
                      <p className="text-[#ffffff] text-[14px] font-[300]">
                        Recipient address
                      </p>
                      <div className="flex bg-white/8 justify-between mt-2 border border-[#FFFFFF]/50 rounded-[24px] px-3 py-4 items-center">
                        <input
                          value={address}
                          type="text"
                          className=" text-[#ffffff] font-[300] outline-none w-[90%]"
                        />
                        <BiCopy
                          className="text-[#FFFFFF] cursor-pointer"
                          onClick={() => {
                            navigator.clipboard.writeText(address);
                            setMsg("Address copied successfully!");
                            setAlertType("success");
                          }}
                        />
                      </div>
                      <p className="text-[#ffffff] py-4 px-2 rounded-[6px] mt-2 text-[12px] font-[300]">
                        It’s a RendBit account. Send instantly and 0 fee via
                        mammonappId: (coming soon){" "}
                        <span className="text-white">****</span>
                      </p>
                    </div>
                  </div>
                  <div className="w-full flex justify-center items-center">
                    {address && <QRCode bgColor="#0E7BB2" value={address} />}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
    </div>
  );
};

export default DepositCrypto;
