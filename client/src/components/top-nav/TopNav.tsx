import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import { getProfile } from "../../function/user";
interface TopNavProps {
  page?: string;
}

const TopNav: React.FC<TopNavProps> = ({ page }) => {
  const [userData, setUserData] = useState<any>(null);
  const token = Cookies.get("token");

  useEffect(() => {
    const localUser = localStorage.getItem("userData") || "{}";
    setUserData(JSON.parse(localUser));
    if (token) getProfile(token).then((res) => setUserData(res.data));
  }, [token]);

  return (
    <div className="p-4 fixed  flex justify-between items-center topnav rounded-2xl bg-[#050d2a90] border border-white/10 backdrop-blur-md">
      <div className="mb-2 lg:hidden pb-1">
        <img src="./images/rendbit-logo.svg" className="w-[200px] h-[100%]" alt="RendBit" />
      </div>
      <div className="md:block hidden">
        <p className="text-[white] md:text-[20px] text-[18px]">{page}</p>
      </div>
      <div className="text-white font-semibold">{userData?.username}</div>
    </div>
  );
};

export default TopNav;
