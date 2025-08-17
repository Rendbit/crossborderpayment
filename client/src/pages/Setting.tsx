import React, { useEffect, useState } from "react";
import TopNav from "../components/top-nav/TopNav";
import { ChevronRight } from "lucide-react";

const Setting: React.FC = () => {

    const [selectedSetings, setSelectedSetings] = useState<string>("Notifications");

  const handleSettingChange = (setting: string) => {
    console.log("Selected Setting:", setting);
    
    setSelectedSetings(setting);
  };

  return (
    <>
      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 text-gray-900 dark:text-gray-100">
        <TopNav page="Setting" />
        <section className="mt-6 bg-white dark:bg-gray-800 border-[#D9D9D9] md:pt-8 pt-4 border-t dark:border-gray-700">
          <div className="w-full bg-white dark:bg-[#1c2939] mb-6">
            <div className="flex gap-[70px] items-start mb-6">
            {
                ["Notifications", "Privacy and Security"].map((item) => (
                <div
                    key={item}
                    onClick={() => handleSettingChange(item)}
                    className={`cursor-pointer flex flex-col pb-2
                    ${selectedSetings === item ? "border-b-2 border-gray-200 dark:border-gray-700" : ""}`}
                >
                    <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-1">{item}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Manage your {item.toLowerCase()} settings.
                    </p>
                </div>
            ))}
            </div>
          </div>
          <div>
            {selectedSetings === "Notifications" && (
              <div className="p-4">
                {/* <h3 className="text-lg font-semibold mb-2">Notification Settings</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Personalize your notification preferences.
                </p> */}
                {/* Add notification settings form or options here */}
                <div className="flex items-start pb-6 mb-8 border-b border-gray-200 dark:border-gray-700">
                    <div className="mr-[6rem]">
                        <p className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-1">General Notifications</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Notifications about transactions, balance and exclusive offers.</p>
                    </div>
                    <div className="flex flex-col gap-6">
                        <div className="flex items-start gap-2">
                            <img src="./image/toggle1.svg" alt="" />
                            <div>
                                <p className="text-md md:text-lg font-semibold text-gray-900 dark:text-white mb-1">Transaction Alerts</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications for every transaction</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <img src="./image/toggle1.svg" alt="" />
                            <div>
                                <p className="text-md md:text-lg font-semibold text-gray-900 dark:text-white mb-1">Low Balance Alert</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Receive a warning if your balance falls below $10,000.00.</p>
                                <button className="dark:text-gray-500 text-[#375DFB] mt-2 flex items-center gap-1">Edit Limit <ChevronRight /> </button>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <img src="./image/toggle2.svg" alt="" />
                            <div>
                                <p className="text-md md:text-lg font-semibold text-gray-900 dark:text-white mb-1">Exclusive Offers</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Get exclusive access to promotions, discounts, and more.</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-start pb-6 mb-8 border-b border-gray-200 dark:border-gray-700">
                    <div className="mr-[6rem]">
                        <p className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-1">Notification Method</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Notifications about transactions, balance and exclusive offers.</p>
                    </div>
                    <div className="flex flex-col gap-6">
                        <div className="flex items-start gap-2">
                            <img src="./image/checkbox1.svg" alt="" />
                            <div>
                                <p className="text-md md:text-lg font-semibold text-gray-900 dark:text-white mb-1">Email Notifications</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications via email</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <img src="./image/checkbox1.svg" alt="" />
                            <div>
                                <p className="text-md md:text-lg font-semibold text-gray-900 dark:text-white mb-1">Push Notifications</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Get real-time updates and alerts directly on your device</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <img src="./image/checkbox2.svg" alt="" />
                            <div>
                                <p className="text-md md:text-lg font-semibold text-gray-900 dark:text-white mb-1">SMS Notifications</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications via SMS</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-start pb-6 mb-8 border-b border-gray-200 dark:border-gray-700">
                    <div className="mr-[15rem]">
                        <p className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-1">Theme Options</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Pick theme to personalize experience.</p>
                    </div>
                    <div className="flex flex-col gap-6">
                        <div className="flex items-start gap-2">
                            <img src="./image/checkbox1.svg" alt="" />
                            <div>
                                <p className="text-md md:text-lg font-semibold text-gray-900 dark:text-white mb-1">Light Mode(Default)</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Pick a clean and classic light theme.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <img src="./image/checkbox1.svg" alt="" />
                            <div>
                                <p className="text-md md:text-lg font-semibold text-gray-900 dark:text-white mb-1">Dark Mode</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Select a sleek and modern dark theme.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <img src="./image/checkbox2.svg" alt="" />
                            <div>
                                <p className="text-md md:text-lg font-semibold text-gray-900 dark:text-white mb-1">System Mode</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Adapts to your device's theme.</p>
                            </div>
                        </div>
                    </div>
                </div>
              </div>
            )}
            {selectedSetings === "Privacy and Security" && (
              <div className="p-4">
                <div className="flex items-center justify-between pb-6 mb-8 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Change Password</h3>
                        <p className="text-gray-600 dark:text-gray-300">Update password for enhanced account security.</p>
                    </div>
                    <button className="border px-3 py-[6px] rounded-[8px] text-sm text-gray-500 dark:text-gray-400">Change Password</button>
                </div>
                <div className="flex items-center justify-between pb-6 mb-8 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Backup Codes</h3>
                        <p className="text-gray-600 dark:text-gray-300">Create and store new backup codes for use in the event of losing access to your authentication app.</p>
                    </div>
                    <button className="border px-3 py-[6px] rounded-[8px] text-sm text-gray-500 dark:text-gray-400">Generate Codes</button>
                </div>
                <div className="flex items-center justify-between pb-6 mb-8 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Two-factor Authentication</h3>
                        <p className="text-gray-600 dark:text-gray-300">Add an extra layer of protection to your account.</p>
                    </div>
                    <button className="border px-3 py-[6px] rounded-[8px] text-sm text-gray-500 dark:text-gray-400">Manage Authentication</button>
                </div>
                {/* Add privacy and security settings form or options here */}
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
};

export default Setting;
