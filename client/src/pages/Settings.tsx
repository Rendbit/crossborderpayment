import React, { useState } from "react";
import TopNav from "../components/top-nav/TopNav";
import PrivacyAndSecurity from "../components/settings/PrivacyAndSecurity";
import Notification from "../components/settings/Notification";
import TwoFASecurity from "../components/settings/TwoFASecurity";

const Setting: React.FC = () => {
  const [selectedSetings, setSelectedSetings] =
    useState<string>("Notifications");
  const handleSettingChange = (setting: string) => {
    setSelectedSetings(setting);
  };

  return (
    <>
      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 text-gray-900 dark:text-gray-100">
        <TopNav page="Setting" />
        <section className="mt-6 bg-white dark:bg-gray-800 border-[#D9D9D9] md:pt-8 pt-4 border-t dark:border-gray-700">
          <div className="w-full bg-white dark:bg-[#1c2939] mb-10">
            <div className="flex gap-[50px] items-start mb-6 border-b border-gray-200 dark:border-gray-700">
              {["Notifications", "Privacy and Security", "2FA Security"].map((item) => (
                <div
                  key={item}
                  onClick={() => handleSettingChange(item)}
                  className={`cursor-pointer flex flex-col pb-2
                    ${
                      selectedSetings === item
                        ? "border-b-2 border-gray-200 dark:border-gray-700 px-[30px]"
                        : ""
                    }`}
                >
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-1">
                    {item}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Manage your {item.toLowerCase()} settings.
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div>
            {selectedSetings === "Notifications" && <Notification />}
            {selectedSetings === "Privacy and Security" && (<PrivacyAndSecurity />)}
            {selectedSetings === "2FA Security" && (
              <TwoFASecurity />
            )}
          </div>
        </section>
      </main>
    </>
  );
};

export default Setting;
