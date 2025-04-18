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
      className=" z-[1] fixed h-screen scrollbar w-[18%] hidden lg:block"
      style={{ borderTopRightRadius: "8px", borderBottomRightRadius: "8px" }}
    >
      <div className="p-5 border-b cursor-pointer">
        <img
          src="./images/mammon-app-logo.svg"
          className="w-[50px] h-[50px]"
          alt="Logo"
        />
      </div>
      <div className="border-r border-[#B2B2B27A] h-screen">
        <div className="mt-7 text-white ">
          <p className="text-[12px] text-[#ffffff] mb-2 px-5">DASHBOARD</p>
          {/* <Link to='/get-started' className={ pathname.includes('/get-started') ? `flex items-center justify-between py-[10px] text-[#ffffff] bg-[#ffffff1F] px-8` :`px-8 flex items-center justify-between py-[10px] text-[#ffffff]`}>
          <div className="flex items-center">
            <BsEmojiSmile />
            <p className="ml-[10px]">Get Started</p>
          </div>
        </Link> */}
          <Link
            to="/dashboard"
            className={
              pathname.includes("/dashboard")
                ? `flex items-center justify-between py-[10px] text-[#ffffff] bg-[#ffffff1F] px-8`
                : `px-8 flex items-center justify-between py-[10px] text-[#ffffff]`
            }
          >
            <div className="flex items-center">
              {/* <RxDashboard /> */}
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
          {/* <Link to='/earn-points' className={ pathname.includes('/earn-points') ? `flex items-center justify-between py-[10px] text-[#ffffff] px-8 bg-[#ffffff1F]` :`px-8 flex items-center justify-between py-[10px] text-[#ffffff]`}>
          <div className="flex items-center">
            {
              pathname.includes('/earn-points') ?
              <img src="./images/cup-colored.svg" className="w-[20px] h-[20px]"  alt="cup image" />
              :
              <img src="./images/cup.svg" className="w-[20px] h-[20px]"  alt="cup image" />
            }
              <p className="ml-[10px]">Earn Points</p>
          </div>
        </Link> */}
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
            to="/withdraw"
            className={
              pathname.includes("withdraw")
                ? `flex items-center justify-between py-[10px] text-[#ffffff] bg-[#ffffff1F] px-8`
                : `px-8 flex items-center justify-between py-[10px] text-[#ffffff]`
            }
          >
            <div className="flex items-center">
              {pathname.includes("withdraw") ? (
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
              <p className="ml-[10px]">Withdraw</p>
            </div>
          </Link>
          <Link
            to="/swap-assets"
            className={
              pathname.includes("/swap-assets") ||
              pathname.includes("swap-assets")
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

        {/* <div className="mt-7 text-white">
        <p className="text-[12px] text-[#ffffff] mb-2 px-5">EARN</p>
        <Link to='/savings' className={ pathname.includes('/savings') || pathname.includes('/save-asset') ? `flex items-center justify-between py-[10px] text-[#ffffff] bg-[#ffffff1F] px-8` :`px-8 flex items-center justify-between py-[10px] text-[#ffffff]`}>
          <div className="flex items-center">
            {
              pathname.includes('savings') ?
              <img src="./images/strongbox@3x-1.svg" className="w-[20px] h-[20px]"  alt="cup image" />
              :
              <img src="./images/strongbox@3x.svg" className="w-[20px] h-[20px]"  alt="cup image" />
            }
            <p className="ml-[10px]">Savings</p>
          </div>
        </Link>
      </div> */}

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
          {/* <Link to='/help-and-support' className={ pathname.includes('/help-and-support') ? `flex items-center justify-between py-[10px] text-[#ffffff] bg-[#ffffff1F] px-8` :`px-8 flex items-center justify-between py-[10px] text-[#ffffff]`}>
          <div className="flex items-center">
            {
              pathname.includes('help-and-support') ?
              <img src="./images/message-question@3x-1.svg" className="w-[20px] h-[20px]"  alt="cup image" />
              :
              <img src="./images/message-question@3x.svg" className="w-[20px] h-[20px]"  alt="cup image" />
            }
              <p className="ml-[10px]">Help & Support</p>
          </div>
        </Link> */}
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

        {/* <div className="ml-[10px] mt-[15rem] mb-16">
        <div className="flex align-center">
            <img src={userData?.userProfileUrl} className="w-[50px]" style={{ marginRight: 12, }} />
            <div>
              <p className='text-[#ffffff] text-[14px] font-[500]'>{userData?.username}</p>
              <p className="text-[#6F7975] text-[12px] tex-[#ffffff]">{userData?.primaryEmail}</p>
            </div>
          </div>
      </div> */}
      </div>
    </div>
  );
};

export default SideNav;
