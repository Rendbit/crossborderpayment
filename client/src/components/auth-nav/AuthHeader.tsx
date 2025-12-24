import React from "react";
import AuthNav from "./AuthNav";
import { Link, useLocation } from "react-router-dom";
import ThemeToggle from "../theme-toggle";

const AuthHeader: React.FC = () => {
  const location = useLocation();
  const isLoginRoute = location.pathname === "/login";

  return (
    <header className="flex items-center justify-between w-full md:pr-[100px] pr-[20px]">
      <AuthNav />

      <div className="text-center text-black dark:text-gray-300 text-[14px] flex items-center truncate">
        Changed your mind?{" "}
        <Link
          to={isLoginRoute ? "/create-account" : "/login"}
          className="text-[#0E7BB2] underline ml-1 mr-4 sm:mr-10"
        >
          {isLoginRoute ? "Register" : "Login"}
        </Link>
        <ThemeToggle type="icon" />
      </div>
    </header>
  );
};

export default AuthHeader;
