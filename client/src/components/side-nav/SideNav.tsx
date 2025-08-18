import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import { X, ArrowRightIcon, LogOutIcon } from "lucide-react";
import { GrDashboard } from "react-icons/gr";
import {
  RiMoneyDollarCircleFill,
  RiSendPlaneFill,
  RiExchangeDollarFill,
  RiFileListFill,
  RiSettings3Fill,
  RiCustomerService2Fill,
} from "react-icons/ri";
import ThemeToggle from "../theme-toggle";
import { useAppContext } from "../../context/useContext";

const SideNav: React.FC = () => {
  const { pathname } = useLocation();
  const {
    sidebarOpen,
    setSidebarOpen,
    setIsAddMoneyModalOpen,
    setIsSendMoneyModalOpen,
    userData,
  } = useAppContext();

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    Cookies.remove("token");
    navigate("/login");
  };

  const isActive = (path: string) => pathname.includes(path);

  const mainLinks = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: <GrDashboard />,
      onClick: () => {
        navigate("/dashboard");
      },
    },
    {
      label: "Deposit",
      path: "/deposit",
      icon: <RiMoneyDollarCircleFill />,
      onClick: () => {
        setIsAddMoneyModalOpen(true);
      },
    },
    {
      label: "Transfer",
      path: "/transfer",
      icon: <RiSendPlaneFill />,
      onClick: () => {
        setIsSendMoneyModalOpen(true);
      },
    },
    {
      label: "Exchange",
      path: "/swap",
      icon: <RiExchangeDollarFill />,
      onClick: () => {
        navigate("/swap");
      },
    },
    {
      label: "History",
      path: "/history",
      icon: <RiFileListFill />,
      onClick: () => {
        navigate("/history");
      },
    },
  ];

  const otherLinks = [
    {
      label: "Settings",
      path: "/settings",
      icon: <RiSettings3Fill />,
      onClick: () => {
        navigate("/settings");
      },
    },
    // {
    //   label: "Support",
    //   path: "/support",
    //   icon: <RiCustomerService2Fill />,
    //   onClick: () => {
    //     navigate("/support");
    //   },
    // },
  ];

  return (
    <>
      <aside
        className={`fixed h-screen inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 border-r border-[#E2E4E9] dark:border-gray-700 flex flex-col transform transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} 
        lg:translate-x-0 lg:static`}
      >
        {/* Header */}
        <div className="p-4 flex justify-between items-center lg:block">
          <div>
            <img
              src="./images/rendbit-logo.svg"
              className="w-[200px] h-[100%]"
              alt="RendBit"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Finance & Banking
            </p>
          </div>
          <button
            className="lg:hidden text-gray-500 dark:text-gray-400"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="border-b border-[#E2E4E9] dark:border-gray-700"></div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          {/* Main Links */}
          <p className="text-xs uppercase text-gray-400 dark:text-gray-500 mb-2 px-2">
            Main
          </p>
          {mainLinks.map((link, index) => (
            <div key={index} className="flex items-center mb-2 cursor-pointer">
              <div
                className={`${
                  isActive(link.path)
                    ? "w-[4px] h-[20px] bg-[#0E7BB2] rounded-br-[4px] ml-[-9px] rounded-tr-[4px]"
                    : "w-[4px] h-[20px] ml-[-9px]"
                }`}
              ></div>
              <button
                onClick={link.onClick}
                className={`flex items-center justify-between p-2 ml-3 w-full rounded-lg ${
                  isActive(link.path)
                    ? "bg-blue-50 dark:bg-gray-700 text-[#000] dark:text-white"
                    : "hover:bg-[#F6F8FA] dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                {/* Icon always visible */}
                <div className="flex items-center gap-3">
                  {link.icon}
                  <span>{link.label}</span>
                </div>
                {/* Arrow only visible if active */}
                {isActive(link.path) && <ArrowRightIcon />}
              </button>
            </div>
          ))}

          {/* Other Links */}
          <p className="text-xs uppercase text-gray-400 dark:text-gray-500 mt-4 mb-2 px-2">
            Other
          </p>
          {otherLinks.map((link, index) => (
            <div key={index} className="flex items-center mb-2 cursor-pointer">
              <div
                className={`${
                  isActive(link.path)
                    ? "w-[4px] h-[20px] bg-[#0E7BB2] rounded-br-[4px] ml-[-9px] rounded-tr-[4px]"
                    : "w-[4px] h-[20px] ml-[-9px]"
                }`}
              ></div>
              <button
                onClick={link.onClick}
                className={`flex items-center justify-between p-2 ml-3 w-full rounded-lg ${
                  isActive(link.path)
                    ? "bg-blue-50 dark:bg-gray-700 text-[#000] dark:text-white"
                    : "hover:bg-[#F6F8FA] dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  {link.icon}
                  <span>{link.label}</span>
                </div>
                {isActive(link.path) && <ArrowRightIcon />}
              </button>
            </div>
          ))}

          <div className="mt-4">
            <button
              onClick={handleLogout}
              className="cursor-pointer text-left w-full py-2 transition-colors
              flex items-center gap-3 p-2 mb-2 rounded-lg pl-4
          hover:bg-[#F6F8FA] dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              <LogOutIcon size={16} /> <span>Logout</span>
            </button>
          </div>

          {/* Theme Toggle for mobile */}
          <div className="block dark:text-gray-300 lg:hidden mt-4">
            <ThemeToggle />
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-[#E2E4E9] dark:border-gray-700 p-4">
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Need support?
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Contact with one of our experts to get support.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-yellow-200"></div>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {userData?.username}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {userData?.primaryEmail}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </>
  );
};

export default SideNav;
