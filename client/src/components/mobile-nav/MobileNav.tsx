import React from "react";
import { Link, useLocation } from "react-router-dom";

const MobileNav: React.FC = () => {
  const pathname = useLocation().pathname;

  const navItems = [
    { name: "Home", icon: "element-3", path: "/dashboard" },
    { name: "Deposit", icon: "money-recive", path: "/deposit" },
    { name: "Transfer", icon: "money-send", path: "/transfer" },
    { name: "Swap", icon: "swap", path: "/swap" },
    { name: "Settings", icon: "setting@3x", path: "/settings" },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#050d2a] border-t border-white/10 z-50 flex justify-around items-center py-2">
      {navItems.map((item) => (
        <Link
          key={item.name}
          to={item.path}
          className="flex flex-col items-center text-white"
        >
          <img
            src={
              pathname.includes(item.path)
                ? `/images/${item.icon}-colored.svg`
                : `/images/${item.icon}.svg`
            }
            alt={item.name}
            className="w-6 h-6 mb-1"
          />
          <span className="text-[10px]">{item.name}</span>
        </Link>
      ))}
    </div>
  );
};

export default MobileNav;
