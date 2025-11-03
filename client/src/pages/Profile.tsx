import React, { useState } from "react";
import TopNav from "../components/top-nav/TopNav";
import { CopyIcon, Link } from "lucide-react";
import { useAppContext } from "../context/useContext";
import PrivateKeyModal from "../components/modals/private-key";
import { FiExternalLink } from "react-icons/fi";
import Alert from "../components/alert/Alert";

const Profile: React.FC = () => {

    const [msg, setMsg] = useState("");
    const [alertType, setAlertType] = useState("");

      const {
        isPrivateKeyModalOpen,
        setIsPrivateKeyModalOpen
      } = useAppContext();

      const userData = localStorage.getItem('userData') ? JSON.parse(localStorage.getItem('userData')!) : null;

      async function copyWalletAddrss (text: string) {
        try {
          await navigator.clipboard.writeText(text);
          setAlertType('success')
          setMsg('Address coppied successfully')
        } catch (err) {
          setAlertType('error')
          setMsg('Failed to copy')
          console.error('Failed to copy:', err);
        }
      }

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
                    <p className="text-[#0A0D14] dark:text-gray-200 font-[600]">{userData?.username}</p>
                    <p className="text-[#525866] dark:text-gray-100 text-sm">{userData?.primaryEmail}</p>
                </div>
            </div>
            {
              userData?.isEmailVerified ?
              <p className="text-[#176448] bg-[#CBF5E5] py-1 px-4 rounded-[50px] font-[600] text-sm">Verified</p>
              :
              <p className="text-[#641717] bg-[#f5cbcb] py-1 px-4 rounded-[50px] font-[600] text-sm">Un-Verified</p>
            }
          </div>

          {/* <div className="w-full bg-white dark:bg-[#1c2939] mb-10 border px-4 py-4 border-gray-200 dark:border-gray-700 rounded-[10px]">
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
          </div> */}

          <div className="w-full bg-white dark:bg-[#1c2939] mb-10 border px-4 py-4 border-gray-200 dark:border-gray-700 rounded-[10px]">
            <p className="text-[#0A0D14] dark:text-gray-200 font-[600] mb-4">Wallet Address</p>
            <div className="flex gap-[10px] items-start">
                <div className="flex items-center justify-between w-full">
                    <div>
                        <p className="font-[600] mb-1">RendBit Wallet Address</p>
                        <p>{userData?.stellarPublicKey}</p>
                    </div>
                    <CopyIcon size={"18px"} cursor={"pointer"} onClick={() => copyWalletAddrss(userData?.stellarPublicKey)}/>
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
      {
        msg && <Alert msg={msg} alertType={alertType} setMsg={setMsg}/>
      }
    </>
  );
};

export default Profile;
