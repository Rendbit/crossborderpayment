import React, { useState } from "react";
import { IoClose } from "react-icons/io5";
import { Link } from "react-router-dom";

const AuthNav: React.FC = () => {
  const [openNav, setOpenNav] = useState(false);

  return (
    <nav className=" flex items-center justify-between py-5 relative md:px-[100px] px-[20px] z-[1000]">
      <div className="flex items-center gap-10">
        <a href="https://rendbit.com" className="block">
          <img
            src="./images/favicon.svg"
            className="md:w-[80px] w-[45px]"
            alt="Logo"
          />
        </a>

        {openNav && (
          <div className="px-[20px] py-[20px] w-full flex flex-col fixed bg-white left-0 translate-x-0 h-[100vh] z-[12] top-0 items-center gap-10">
            <div className="flex items-center justify-between w-full">
              <Link to="/" className="block">
                <img
                  src="./images/rendbit-logo.svg"
                  className="w-[250px]"
                  alt="Logo"
                />
              </Link>
              <IoClose
                className="text-[25px] cursor-pointer"
                onClick={() => setOpenNav(false)}
              />
            </div>
            {/* <ul className='w-full'>
                        <Link to="https://mammonapp100.medium.com" className="text-[#667085] flex items-center gap-2 cursor-pointer w-full justify-between mb-9">
                            Blog
                        </Link>
                    </ul> */}
          </div>
        )}
        {/* <ul className="sm:flex hidden">
                <Link to="https://mammonapp100.medium.com" className="text-[#667085] flex items-center w-full gap-2 cursor-pointer">
                    Blog
                </Link>
            </ul> */}
      </div>
      {/* <button className="hidden sm:flex items-center gap-2 bg-primary-color text-white px-4 py-[10px] rounded-[8px]">
            <BsLightningCharge />
            <p>Leaderboard</p>
        </button> */}
      {/* <BiMenu className='text-[25px] cursor-pointer sm:hidden' onClick={() => setOpenNav(true)}/> */}
    </nav>
  );
};

export default AuthNav;
