import React, { useEffect, useState } from "react";
import { MdClose } from "react-icons/md";
import { BiMenu } from "react-icons/bi";
import Cookies from "js-cookie";
import { GoChevronDown } from "react-icons/go";
import { Link, useNavigate } from "react-router-dom";
import { getProfile } from "../../function/user";

const notificationArray = [
  {
    title: "New Daily Mint by Atari",
    desc: "Unlock community, gaming, and IRL utility with a new generation of Atari.",
  },
];
const TopNav: React.FC = () => {
  const [selectedNav, setSelectedNav] = useState<any>();
  const [notification, setNotification] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const [userData, setUserData] = useState<any>(null);
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
        const response = await getProfile(user);
        setUserData(response.data);
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
    <div>
      <div className="bg-[#0E7BB2]/10 mb-[50px] fixed hidden lg:flex items-center justify-center gap-[70px] w-[100%] py-[1.2rem] top-0 right-0 z-[99] mx-auto">
        <div className="flex justify-between px-[3rem] w-full">
          <div className="p-5 cursor-pointer">
            <img
              src="./images/rendbit-logo.svg"
              className="w-[100%]"
              alt="Logo"
            />
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 text-white px-4 py-[10px] rounded-[8px] cutom-btn-gradient text-[14px]">
              <img src="./images/ranking.svg" alt="" />
              <p className="text-white">{userData?.username}</p>
            </button>
          </div>
        </div>
      </div>
      <div
        className={
          mobileNav === true
            ? `p-[20px] flex items-center bg-white justify-between  mt-[-80px] z-[9999] lg:hidden fixed w-full `
            : `p-[20px] flex lg:hidden items-center justify-between mt-[-80px]`
        }
      >
        <img
          src={
            mobileNav === true
              ? `/images/rendbit-logo.svg`
              : `/images/rendbit-logo.svg`
          }
          className="w-[200px] h-[200px]"
          alt="RendBit Logo"
        />
      </div>
      <div
        className={
          mobileNav === true
            ? `py-4 px-6 flex items-center bg-white justify-between z-[9999] lg:hidden fixed w-full top-[62px]`
            : `py-4 px-6 flex items-center justify-between lg:hidden relative`
        }
      >
        <div>
          <p
            className={
              mobileNav === true
                ? `text-black font-[500] text-[18px]`
                : `text-white font-[500] text-[18px]`
            }
          >
            Hi, {userData?.username}
          </p>
          <p
            className={
              mobileNav === true
                ? `text-[#474646] text-[14px] font-[300]`
                : `text-[#959595] text-[14px] font-[300]`
            }
          >
            Welcome to RendBit
          </p>
        </div>
        <div
          className={
            mobileNav === true
              ? "p-2 rounded-[8px] bg-[white] text-[24px] cursor-pointer"
              : "p-2 rounded-[8px] bg-[white] text-[24px] cursor-pointer"
          }
        >
          <BiMenu onClick={() => setMobileNav(!mobileNav)} />
        </div>
        {mobileNav && (
          <div className="fixed bg-white left-0 w-full pb-[20px] top-[140px] z-[9999]">
            <div className="grid gap-5 px-6 text-black text-[12px] font-[500] pt-4">
              <div>
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() =>
                    setSelectedNav(selectedNav === "home" ? false : "home")
                  }
                >
                  <p>HOME</p>
                  <GoChevronDown className="text-[24px]" />
                </div>
                {selectedNav === "home" && (
                  <div className="ml-2 my-3 text-[#2B2D36] grid gap-2 text-[14px] font-[400]">
                    <Link
                      to="/dashboard"
                      className={
                        pathname.includes("/dashboard")
                          ? `flex items-center justify-between py-[10px] text-[#072AC8] bg-[#072AC81F] px-5`
                          : `px-5 flex items-center justify-between py-[10px] text-black`
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
                    {/* <Link to='/earn-points' className={ pathname.includes('/earn-points') ? `flex items-center justify-between py-[10px] text-[#072AC8] px-5 bg-[#072AC81F]` :`px-5 flex items-center justify-between py-[10px] text-black`}>
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
                )}
              </div>

              <div>
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() =>
                    setSelectedNav(
                      selectedNav === "finance" ? false : "finance"
                    )
                  }
                >
                  <p>FINANCE</p>
                  <GoChevronDown className="text-[24px]" />
                </div>
                {selectedNav === "finance" && (
                  <div className="ml-2 my-3 text-[#2B2D36] grid gap-2 text-[14px] font-[400]">
                    <Link
                      to="/wallet"
                      className={
                        pathname.includes("/wallet") ||
                        pathname.includes("send")
                          ? `flex items-center justify-between py-[10px] text-[#072AC8] bg-[#072AC81F] px-5`
                          : `px-5 flex items-center justify-between py-[10px] text-black`
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
                          ? `flex items-center justify-between py-[10px] text-[#072AC8] bg-[#072AC81F] px-5`
                          : `px-5 flex items-center justify-between py-[10px] text-black`
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
                        pathname.includes("transfer")
                          ? `flex items-center justify-between py-[10px] text-[#072AC8] bg-[#072AC81F] px-5`
                          : `px-5 flex items-center justify-between py-[10px] text-black`
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
                        pathname.includes("swap")
                          ? `flex items-center justify-between py-[10px] text-[#072AC8] bg-[#072AC81F] px-5`
                          : `px-5 flex items-center justify-between py-[10px] text-black`
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
                          ? `flex items-center justify-between py-[10px] text-[#072AC8] px-5 bg-[#072AC81F]`
                          : `px-5 flex items-center justify-between py-[10px] text-black`
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
                )}
              </div>

              <div>
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() =>
                    setSelectedNav(
                      selectedNav === "account" ? false : "account"
                    )
                  }
                >
                  <p>ACCOUNT</p>
                  <GoChevronDown className="text-[24px]" />
                </div>
                {selectedNav === "account" && (
                  <div className="ml-2 my-3 text-[#2B2D36] grid gap-2 text-[14px] font-[400]">
                    <Link
                      to="/settings"
                      className={
                        pathname.includes("/settings")
                          ? `flex items-center justify-between py-[10px] text-[#072AC8] bg-[#072AC81F] px-5`
                          : `px-5 flex items-center justify-between py-[10px] text-black`
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
                      className="cursor-pointer px-5 flex items-center justify-between py-[10px] text-black"
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
                )}
              </div>
              <button
                style={{ display: "none" }}
                className="flex items-center gap-2 text-white px-4 py-[10px] rounded-[8px] cutom-btn-gradient mt-[3rem] mb-5 justify-center"
                onClick={() => navigate("/leader-board")}
              >
                <img src="./images/ranking.svg" alt="" />
                <p>Leaderboard</p>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopNav;
