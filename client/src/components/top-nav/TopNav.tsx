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
      <div
        // style={{ display: "none" }}
        className="bg-[#02001C] fixed hidden lg:flex items-center justify-center gap-[70px] w-[100%] py-[1.2rem] top-0 right-0 z-[99] mx-auto"
      >
        <div className="flex justify-between px-[3rem] w-full">
          <div className=" cursor-pointer">
            <img
              src="./images/rendbit-logo.svg"
              className="w-[100%]"
              alt="Logo"
            />
          </div>

          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              {/* <img src="./images/overview.svg" alt="" /> */}
              <p>
                {/* <p className='text-black capitalize'>{location.pathname.replace(/^\//, '')}</p> */}
              </p>
            </div>
            {/* <div className='flex items-center gap-2 bg-[#F8F8F8] shadow-[inset_5px_0px_10px_black,inset_-5px_0px_10px_#E1E1E1] rounded-[4px] px-[12px] py-[7px] w-[200px] lg:w-[400px] '>
              <CiSearch className='text-black text-[26px] cursor-pointer'/>
              <input type="text" placeholder='Search transactions, assets etc.' className='text-[#333333] w-full placeholder:text-[#333333] bg-transparent text-[14px] outline-none'/>
            </div> */}
          </div>
          <div className="flex items-center gap-2">
            {/* <img src="./images/moon.svg" alt="" /> */}
            {/* <div className="p-2 rounded-[8px] bg-[#B9B9B926]">
              <img
                src="./images/notification.svg"
                alt=""
                className="cursor-pointer"
                onClick={() => setNotification(true)}
              />
            </div> */}
            <button
              className="flex items-center gap-2 text-white px-4 py-[10px] rounded-[8px] cutom-btn-gradient text-[14px]"
              // onClick={() => navigate("/leader-board")}
            >
              <img src="./images/ranking.svg" alt="" />
              {/* <p>Leaderboard</p> */}
              <p className="text-white">{userData?.username}</p>
            </button>
          </div>
        </div>

        {/* {notification && (
          <div className="h-[500px] overflow-y-scroll absolute z-[9999] mt-[590px] right-0 bg-white shadow-md border w-[360px] p-5 rounded-[8px]">
            <div className="flex items-center justify-between">
              <p className="text-[#282828] font-[500] text-[20px]">
                Notifications
              </p>
              <MdClose
                className="text-black cursor-pointer text-[20px]"
                onClick={() => setNotification(false)}
              />
            </div>
            {notificationArray.map((item, index) => {
              return (
                <div key={index} className="border-b mt-5 pb-1">
                  <p className="text-primary-color font-[600]">{item.title}</p>
                  <p className="text-[#767676] font-[300] text-[14px]">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        )} */}
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
        {/* <div className="flex items-center gap-4">
          <div className="p-2 rounded-[8px] bg-[white]">
            <img
              src="/images/notification.svg"
              alt="Notification Icon"
              className="w-[20px] h-[20px] cursor-pointer"
              // onClick={() => setNotification(true)}
            />
          </div>
        </div> */}
        {/* */}
        {/* {notification && (
          <div className="h-[500px] overflow-y-scroll absolute z-[999999] mt-[590px] right-0 bg-white shadow-md border w-[360px] p-5 rounded-[8px]">
            <div className="flex items-center justify-between">
              <p className="text-[#282828] font-[500] text-[20px]">
                Notifications
              </p>
              <MdClose
                className="text-white cursor-pointer text-[20px]"
                // onClick={() => setNotification(false)}
              />
            </div>
            {notificationArray.map((item, index) => {
              return (
                <div
                  style={{ display: "none" }}
                  key={index}
                  className="border-b mt-5 pb-1"
                >
                  <p className="text-primary-color font-[600]">{item.title}</p>
                  <p className="text-[#767676] font-[300] text-[14px]">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        )} */}
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
                    {/* <div className='flex items-center gap-3 cursor-pointer'>
                      <BsEmojiSmile className='text-[16px]'/>
                      <p>Get Started</p>
                    </div> */}
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
                        pathname.includes("withdraw")
                          ? `flex items-center justify-between py-[10px] text-[#072AC8] bg-[#072AC81F] px-5`
                          : `px-5 flex items-center justify-between py-[10px] text-black`
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

              {/* <div>
                <div className='flex items-center justify-between cursor-pointer' onClick={() => setSelectedNav(selectedNav === 'earn' ? false : 'earn')}>
                  <p>EARN</p>
                  <GoChevronDown className='text-[24px]'/>
                </div>
                {
                  selectedNav === "earn" &&
                  <div className='ml-2 my-3 text-[#2B2D36] grid gap-2 text-[14px] font-[400]'>
                    <Link to='/savings' className={ pathname.includes('/savings') || pathname.includes('/save-asset') ? `flex items-center justify-between py-[10px] text-[#072AC8] bg-[#072AC81F] px-5` :`px-5 flex items-center justify-between py-[10px] text-black`}>
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
                  </div>
                }
              </div> */}

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
                    {/* <Link to='/help-and-support' className={ pathname.includes('/help-and-support') ? `flex items-center justify-between py-[10px] text-[#072AC8] bg-[#072AC81F] px-5` :`px-5 flex items-center justify-between py-[10px] text-black`}>
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
