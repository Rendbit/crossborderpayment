import React, { useState } from "react";
import TopNav from "../components/top-nav/TopNav";
import { CopyIcon } from "lucide-react";
import { useAppContext } from "../context/useContext";
import PrivateKeyModal from "../components/modals/private-key";
import { FiExternalLink } from "react-icons/fi";
import { exportPrivateKey } from "../function/user";
import Alert from "../components/alert/Alert";

const Profile: React.FC = () => {
  const { isPrivateKeyModalOpen, setIsPrivateKeyModalOpen, token, userData } =
    useAppContext();
  const [alertType, setAlertType] = useState<"" | "error" | "success">("");
  const [loading, setLoading] = useState<boolean>(false);
  const [privateKey, setPrivateKey] = useState<string>("");
  const [showPrivateKey, setShowPrivateKey] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>("");

  async function handleExportPrivateKey(pinCode: string) {
    setLoading(true);
    if (!pinCode) {
      setMsg("Please enter your PIN code");
      setAlertType("error");
      setLoading(false);
      return;
    }

    try {
      if (!token) {
        setLoading(false);
        return;
      }
      const response = await exportPrivateKey(pinCode, token);
      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        setLoading(false);
        return;
      }
      console.log({ response });
      setPrivateKey(response.data.privateKey);
      setShowPrivateKey(true);
    } catch (error: any) {
      setMsg(error.message || "Failed to export private key.");
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setMsg("Copied to clipboard!");
        setAlertType("success");
      })
      .catch(() => {
        setMsg("Failed to copy."), setAlertType("success");
      });
  };

  return (
    <>
      {isPrivateKeyModalOpen && (
        <PrivateKeyModal
          handleConfirmation={handleExportPrivateKey}
          loading={loading}
          showPrivateKey={showPrivateKey}
        />
      )}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 text-gray-900 dark:text-gray-100">
        <TopNav page="Profile" />

        <section className="text-gray-800 dark:text-gray-400 mt-6 bg-white dark:bg-gray-800 border-[#D9D9D9] md:pt-8 pt-4 border-t dark:border-gray-700">
          {/* User Info */}
          <div className="w-full bg-white dark:bg-[#1c2939] mb-10 flex items-center justify-between border px-4 py-4 border-gray-200 dark:border-gray-700 rounded-[10px]">
            <div className="flex gap-[10px] items-start">
              <img src="./image/avatar.svg" alt="" />
              <div>
                <p className="text-[#0A0D14] dark:text-gray-200 font-[600]">
                  {userData?.username}
                </p>
                <p className="text-[#525866] dark:text-gray-100 text-sm">
                  {userData?.primaryEmail}
                </p>
              </div>
            </div>
            {userData?.isEmailVerified ? (
              <p className="text-[#176448] bg-[#CBF5E5] py-1 px-4 rounded-[50px] font-[600] text-sm">
                Verified
              </p>
            ) : (
              <div>
                <p className="text-[#641717] bg-[#f5cbcb] py-1 px-4 rounded-[50px] font-[600] text-sm">
                  Not Verified
                </p>
                <button className="underline text-sm ml-2 text-gray-700 dark:text-gray-300">
                  Verify now
                </button>
              </div>
            )}
          </div>

          {/* Personal Info */}
          <div className="w-full bg-white dark:bg-[#1c2939] mb-10 border px-4 py-4 border-gray-200 dark:border-gray-700 rounded-[10px]">
            <p className="text-[#0A0D14] dark:text-gray-200 font-[600] mb-5">
              Personal Information
            </p>
            <div className="flex gap-[10px] items-start">
              <div className="flex items-center justify-between w-full">
                <div>
                  <p className="font-[600] mb-1">Username</p>
                  <p>{userData?.username}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-[10px] items-start mt-5">
              <div className="flex items-center justify-between w-full">
                <div>
                  <p className="font-[600] mb-1">Email address</p>
                  <p>{userData?.primaryEmail}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Wallet Address */}
          <div className="w-full bg-white dark:bg-[#1c2939] mb-10 border px-4 py-4 border-gray-200 dark:border-gray-700 rounded-[10px]">
            <p className="text-[#0A0D14] dark:text-gray-200 font-[600] mb-4">
              Wallet Address
            </p>
            <div className="flex gap-[10px] items-center justify-between w-full">
              <p>{userData?.stellarPublicKey}</p>
              <CopyIcon
                size={18}
                cursor="pointer"
                onClick={() =>
                  copyToClipboard(userData?.stellarPublicKey || "")
                }
              />
            </div>
          </div>

          {/* Private Key */}
          <div className="w-full bg-white dark:bg-[#1c2939] mb-10 border px-4 py-4 border-gray-200 dark:border-gray-700 rounded-[10px]">
            <p className="text-[#0A0D14] dark:text-gray-200 font-[600] mb-4">
              Private Key
            </p>
            <div className="flex gap-[10px] items-center justify-between w-full">
              <p>{showPrivateKey ? privateKey : "**************"}</p>

              {!showPrivateKey ? (
                <FiExternalLink
                  onClick={() => {
                    setShowPrivateKey(false);
                    setIsPrivateKeyModalOpen(true);
                  }}
                  size={18}
                  cursor="pointer"
                />
              ) : (
                <CopyIcon
                  size={18}
                  cursor="pointer"
                  onClick={() => {
                    copyToClipboard(privateKey);
                    setShowPrivateKey(false);
                    setPrivateKey("");
                  }}
                />
              )}
            </div>
          </div>
        </section>
      </main>
      {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
    </>
  );
};

export default Profile;
