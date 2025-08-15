import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import {
  RiDashboard2Fill,
  RiExchangeDollarFill,
  RiFileListFill,
  RiMoneyDollarCircleFill,
  RiSendPlaneFill,
  RiSettings3Fill,
} from "react-icons/ri";

const SideNav: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    Cookies.remove("token");
    navigate("/login");
  };

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: RiDashboard2Fill },
    { name: "Deposit", path: "/deposit", icon: RiMoneyDollarCircleFill },
    { name: "Transfer", path: "/transfer", icon: RiSendPlaneFill },
    { name: "Swap Assets", path: "/swap", icon: RiExchangeDollarFill },
    { name: "History", path: "/history", icon: RiFileListFill },
    { name: "Settings", path: "/settings", icon: RiSettings3Fill },
  ];

  return (
    <div className="w-[18%] bg-[#02001C] overflow-hidden col-span-2 fixed left-0 border border-white/10 rounded-r-2xl p-2 hidden lg:flex flex-col gap-6 top-0 h-[100vh] z-40 backdrop-blur-md">
      <div className="mb-2 pb-1">
        <img src="./images/rendbit-logo.svg" alt="RendBit" />
      </div>
      {navItems.map(({ name, path, icon: Icon }) => (
        <Link
          key={name}
          to={path}
          className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            pathname.includes(path)
              ? "bg-[#ffffff1F] text-white"
              : "hover:bg-[#ffffff1F] text-white"
          }`}
        >
          <Icon
            className={`w-[20px] h-[20px] ${
              pathname.includes(path) ? "text-[#0E7BB2]" : "text-text-gray-400"
            }`}
          />
          <span className="text-sm">{name}</span>
        </Link>
      ))}
      <div
        onClick={handleLogout}
        className="flex items-center gap-3 p-3 mt-auto rounded-xl text-white cursor-pointer hover:bg-[#ffffff1F] transition-all"
      >
        <img src="./images/logout@3x.svg" className="w-[20px] h-[20px]" alt="Logout" />
        <span className="text-sm">Logout</span>
      </div>
    </div>
  );
};

export default SideNav;
