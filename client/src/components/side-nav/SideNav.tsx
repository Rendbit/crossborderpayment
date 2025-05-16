import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { Link, useNavigate } from "react-router-dom";
import { getProfile } from "../../function/user";

const SideNav: React.FC = () => {
  const [userData, setUserData] = useState<any>({});
  const navigate = useNavigate();
  const pathname = window.location.pathname;
  const user = Cookies.get("token");

  function handleLogout() {
    localStorage.clear();
    Cookies.remove("token");
    navigate("/login");
  }

  async function getUserInfo() {
    try {
      if (user) {
        const respone = await getProfile(user);
        setUserData(respone.data);
      }
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    const user = localStorage.getItem("userData") || "{}";
    const parsedUser = JSON.parse(user);
    if (parsedUser) {
      setUserData(parsedUser);
    }
    getUserInfo();
  }, []);

  return (
    <div
      className=" z-[1] bg-[#0E7BB2]/10 fixed mt-[111.5px] h-screen scrollbar w-[18%] hidden lg:block"
    >
     
      <div className="h-screen">
        <div className="mt-7 text-white ">
          <p className="text-[12px] text-[#ffffff] mb-2 px-5">DASHBOARD</p>
          <Link
            to="/dashboard"
            className={
              pathname.includes("/dashboard")
                ? `flex items-center justify-between py-[10px] text-[#ffffff] bg-[#ffffff1F] px-8`
                : `px-8 flex items-center justify-between py-[10px] text-[#ffffff]`
            }
          >
            <div className="flex items-center">
              {pathname.includes("/dashboard") ? (
                <img
                  src="./images/element-3.svg"
                  className="w-[20px] h-[20px]"
                  alt="cup image"
                />
              ) : (
                <img
                  src="./images/element-3-color.svg"
                  className="w-[20px] h-[20px]"
                  alt="cup image"
                />
              )}
              <p className="ml-[10px]">Dashboard</p>
            </div>
          </Link>
        </div>

        <div className="mt-7 text-white">
          <p className="text-[12px] text-[#ffffff] mb-2 px-5">FINANCE</p>
          <Link
            to="/wallet"
            className={
              pathname.includes("/wallet") || pathname.includes("send")
                ? `flex items-center justify-between py-[10px] text-[#ffffff] bg-[#ffffff1F] px-8`
                : `px-8 flex items-center justify-between py-[10px] text-[#ffffff]`
            }
          >
            <div className="flex items-center">
              {pathname.includes("/wallet") ? (
                <img
                  src="./images/wallet-colored.svg"
                  className="w-[20px] h-[20px]"
                  alt="cup image"
                />
              ) : (
                <img
                  src="./images/wallet.svg"
                  className="w-[20px] h-[20px]"
                  alt="cup image"
                />
              )}
              <p className="ml-[10px]">Wallet</p>
            </div>
          </Link>
          <Link
            to="/deposit"
            className={
              pathname.includes("deposit")
                ? `flex items-center justify-between py-[10px] text-[#ffffff] bg-[#ffffff1F] px-8`
                : `px-8 flex items-center justify-between py-[10px] text-[#ffffff]`
            }
          >
            <div className="flex items-center">
              {pathname.includes("deposit") ? (
                <img
                  src="./images/money-recive-colored.svg"
                  className="w-[20px] h-[20px]"
                  alt="cup image"
                />
              ) : (
                <img
                  src="./images/money-recive.svg"
                  className="w-[20px] h-[20px]"
                  alt="cup image"
                />
              )}
              <p className="ml-[10px]">Deposit</p>
            </div>
          </Link>

          <Link
            to="/transfer"
            className={
              pathname.includes("transfer")
                ? `flex items-center justify-between py-[10px] text-[#ffffff] bg-[#ffffff1F] px-8`
                : `px-8 flex items-center justify-between py-[10px] text-[#ffffff]`
            }
          >
            <div className="flex items-center">
              {pathname.includes("transfer") ? (
                <img
                  src="./images/money-send-colored.svg"
                  className="w-[20px] h-[20px]"
                  alt="cup image"
                />
              ) : (
                <img
                  src="./images/money-send.svg"
                  className="w-[20px] h-[20px]"
                  alt="cup image"
                />
              )}
              <p className="ml-[10px]">Transfer</p>
            </div>
          </Link>
          <Link
            to="/swap"
            className={
              pathname.includes("/swap") || pathname.includes("swap")
                ? `flex items-center justify-between py-[10px] text-[#ffffff] bg-[#ffffff1F] px-8`
                : `px-8 flex items-center justify-between py-[10px] text-[#ffffff]`
            }
          >
            <div className="flex items-center">
              {pathname.includes("swap") ? (
                <img
                  src="./images/swap-colored.svg"
                  className="w-[20px] h-[20px]"
                  alt="cup image"
                />
              ) : (
                <img
                  src="./images/swap.svg"
                  className="w-[20px] h-[20px]"
                  alt="cup image"
                />
              )}
              <p className="ml-[10px]">Swap Assets</p>
            </div>
          </Link>
          <Link
            to="/history"
            className={
              pathname.includes("/history") ||
              pathname.includes("/transaction-info")
                ? `flex items-center justify-between py-[10px] text-[#ffffff] px-8 bg-[#ffffff1F]`
                : `px-8 flex items-center justify-between py-[10px] text-[#ffffff]`
            }
          >
            <div className="flex items-center">
              {pathname.includes("history") ? (
                <img
                  src="./images/receipt@3x-1.svg"
                  className="w-[20px] h-[20px]"
                  alt="cup image"
                />
              ) : (
                <img
                  src="./images/receipt@3x.svg"
                  className="w-[20px] h-[20px]"
                  alt="cup image"
                />
              )}
              <p className="ml-[10px]">History</p>
            </div>
          </Link>
        </div>

        <div className="mt-7 text-white">
          <p className="text-[12px] text-[#ffffff] mb-2 px-5">ACCOUNT</p>
          <Link
            to="/settings"
            className={
              pathname.includes("/settings")
                ? `flex items-center justify-between py-[10px] text-[#ffffff] bg-[#ffffff1F] px-8`
                : `px-8 flex items-center justify-between py-[10px] text-[#ffffff]`
            }
          >
            <div className="flex items-center">
              {pathname.includes("settings") ? (
                <img
                  src="./images/settings-colored.svg"
                  className="w-[20px] h-[20px]"
                  alt="cup image"
                />
              ) : (
                <img
                  src="./images/setting@3x.svg"
                  className="w-[20px] h-[20px]"
                  alt="cup image"
                />
              )}
              <p className="ml-[10px]">Settings</p>
            </div>
          </Link>

          <div
            onClick={handleLogout}
            className="cursor-pointer px-8 flex items-center justify-between py-[10px] text-[#ffffff]"
          >
            <div className="flex items-center">
              <img
                src="./images/logout@3x.svg"
                className="w-[20px] h-[20px]"
                alt="cup image"
              />
              <p className="ml-[10px]">Logout</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SideNav;
