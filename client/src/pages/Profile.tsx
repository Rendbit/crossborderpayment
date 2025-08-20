import React, { useState } from "react";
import TopNav from "../components/top-nav/TopNav";
import { CopyIcon, Link } from "lucide-react";
import { useAppContext } from "../context/useContext";
import PrivateKeyModal from "../components/modals/private-key";
import { FiExternalLink } from "react-icons/fi";

const Profile: React.FC = () => {

      const {
        isPrivateKeyModalOpen,
        setIsPrivateKeyModalOpen
      } = useAppContext();

  return (
    <>
      {/* Main Content */}
      { isPrivateKeyModalOpen && <PrivateKeyModal /> }
      <main className="flex-1 p-4 sm:p-6 lg:p-8 text-gray-900 dark:text-gray-100">
        <TopNav page="Profile" />
        <section className="text-gray-800 dark:text-gray-400 mt-6 bg-white dark:bg-gray-800 border-[#D9D9D9] md:pt-8 pt-4 border-t dark:border-gray-700">
          <div className="w-full bg-white dark:bg-[#1c2939] mb-10 flex items-center justify-between border px-4 py-4 border-gray-200 dark:border-gray-700 rounded-[10px]">
            <div className="flex gap-[10px] items-start">
                <img src="./image/avatar.svg" alt="" />
                <div>
                    <p className="text-[#0A0D14] dark:text-gray-200 font-[600]">Charles Thompson</p>
                    <p className="text-[#525866] dark:text-gray-100 text-sm">charles@rendbit.com</p>
                </div>
            </div>
            <p className="text-[#176448] bg-[#CBF5E5] py-1 px-4 rounded-[50px] font-[600] text-sm">Verified</p>
          </div>

          <div className="w-full bg-white dark:bg-[#1c2939] mb-10 border px-4 py-4 border-gray-200 dark:border-gray-700 rounded-[10px]">
            <p className="text-[#0A0D14] dark:text-gray-200 font-[600] mb-5">Personal Information</p>
            <div className="flex gap-[10px] items-start">
                <div className="flex items-center justify-between w-full">
                    <div>
                        <p className="font-[600] mb-1">First Name</p>
                        <p>Charles</p>
                    </div>
                    <div>
                        <p className="font-[600] mb-1">Last Name</p>
                        <p>Thompson</p>
                    </div>
                    <div>
                        <p className="font-[600] mb-1">Middle Name</p>
                        <p>-</p>
                    </div>
                </div>
            </div>
            <div className="flex gap-[10px] items-start mt-5">
                <div className="flex items-center justify-between w-full">
                    <div>
                        <p className="font-[600] mb-1">Date of birth(DOB)</p>
                        <p>Charles</p>
                    </div>
                    <div>
                        <p className="font-[600] mb-1">Email address</p>
                        <p>charles@rendbit.com</p>
                    </div>
                    <div>
                        <p className="font-[600] mb-1">Phone number</p>
                        <p>+234 9056755123</p>
                    </div>
                </div>
            </div>
          </div>

          <div className="w-full bg-white dark:bg-[#1c2939] mb-10 border px-4 py-4 border-gray-200 dark:border-gray-700 rounded-[10px]">
            <p className="text-[#0A0D14] dark:text-gray-200 font-[600] mb-4">Wallet Address</p>
            <div className="flex gap-[10px] items-start">
                <div className="flex items-center justify-between w-full">
                    <div>
                        <p className="font-[600] mb-1">RendBit Wallet Address</p>
                        <p>GBWMCCC3NHYP3QWKQ6KJPXNJGCX3MHEVGJ5CTJJNHFMC4JFWF4NXSLV7</p>
                    </div>
                    <CopyIcon size={"18px"} cursor={"pointer"}/>
                </div>
            </div>
          </div>

          <div className="w-full bg-white dark:bg-[#1c2939] mb-10 border px-4 py-4 border-gray-200 dark:border-gray-700 rounded-[10px]">
            <p className="text-[#0A0D14] dark:text-gray-200 font-[600] mb-4">Private Key</p>
            <div className="flex gap-[10px] items-start">
                <div className="flex items-center justify-between w-full">
                    <div>
                        <p className="font-[600] mb-1">RendBit Private Key</p>
                        <p>****</p>
                    </div>
                    <FiExternalLink onClick={() => setIsPrivateKeyModalOpen(true)} size={"18px"} cursor={"pointer"}/>
                </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default Profile;
