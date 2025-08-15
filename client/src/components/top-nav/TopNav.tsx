import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import { getProfile } from "../../function/user";
import { Menu } from "lucide-react";
import ThemeToggle from "../theme-toggle";
import { useAppContext } from "../../context/useContext";
interface TopNavProps {
  page?: string;
}

const TopNav: React.FC<TopNavProps> = ({ page }) => {
  const [userData, setUserData] = useState<any>(null);
  const token = Cookies.get("token");
  const { setSidebarOpen } = useAppContext();

  useEffect(() => {
    const localUser = localStorage.getItem("userData") || "{}";
    setUserData(JSON.parse(localUser));
    if (token) getProfile(token).then((res) => setUserData(res.data));
  }, [token]);

  return (
    <>
      {/* Topbar for Mobile */}
      <div className="flex items-center justify-between mb-4 lg:hidden">
        <h2 className="text-lg font-semibold">{page}</h2>
        <button
          className="text-gray-600 dark:text-gray-300"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Greeting */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold mb-2">
            Hello {userData?.username}, <span className="wave">👋</span>
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
            Send, save and receive funds in various currencies
          </p>
        </div>
        <div className="md:block hidden">
          <ThemeToggle />
        </div>
      </div>
    </>
  );
};

export default TopNav;
