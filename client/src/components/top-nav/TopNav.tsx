import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import { getProfile } from "../../function/user";
import { BiChevronRight } from "react-icons/bi";
interface TopNavProps {
  page?: string;
}

const TopNav: React.FC<TopNavProps> = ({ page }) => {
  const [userData, setUserData] = useState<any>(null);
  const token = Cookies.get("token");
  const navigate = useNavigate();

  useEffect(() => {
    const localUser = localStorage.getItem("userData") || "{}";
    setUserData(JSON.parse(localUser));
    if (token) getProfile(token).then((res) => setUserData(res.data));
  }, [token]);

  return (
    <div className="p-4 fixed  flex justify-between items-center topnav rounded-2xl border border-white/10 backdrop-blur-md">
      <div className="mb-2 lg:hidden pb-1">
        <img src="./images/rendbit-logo.svg" className="w-[200px] h-[100%]" alt="RendBit" />
      </div>
      <div className="md:block hidden font-[500] underline">
        <p className="text-[#000000] md:text-[20px] text-[18px]">{page}</p>
      </div>
      <div className="text-[#000000] font-semibold capitalize flex items-center gap-2">
        <p>{userData?.username}</p>
        <BiChevronRight className="text-[20px] cursor-pointer" onClick={() => navigate('/settings')}/>
      </div>
    </div>
  );
};

export default TopNav;
