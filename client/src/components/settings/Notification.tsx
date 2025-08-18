import React from "react";
import { useAppContext } from "../../context/useContext";
import { ChevronRight } from "lucide-react";

const Notification: React.FC = () => {
  const { setTheme, theme } = useAppContext();

  return (
    <div className="p-4">
      {/* <h3 className="text-lg font-semibold mb-2">Notification Settings</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Personalize your notification preferences.
                </p> */}
      {/* Add notification settings form or options here */}
      <div className="flex items-start pb-6 mb-8 border-b border-gray-200 dark:border-gray-700">
        <div className="mr-[6rem]">
          <p className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-1">
            General Notifications
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Notifications about transactions, balance and exclusive offers.
          </p>
        </div>
        <div className="flex flex-col gap-6">
          <div className="flex items-start gap-2">
            <img src="./image/toggle1.svg" alt="" />
            <div>
              <p className="text-md md:text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Transaction Alerts
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Receive notifications for every transaction
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <img src="./image/toggle1.svg" alt="" />
            <div>
              <p className="text-md md:text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Low Balance Alert
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Receive a warning if your balance falls below $10,000.00.
              </p>
              <button className="dark:text-gray-500 text-[#375DFB] mt-2 flex items-center gap-1">
                Edit Limit <ChevronRight />{" "}
              </button>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <img src="./image/toggle2.svg" alt="" />
            <div>
              <p className="text-md md:text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Exclusive Offers
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Get exclusive access to promotions, discounts, and more.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-start pb-6 mb-8 border-b border-gray-200 dark:border-gray-700">
        <div className="mr-[6rem]">
          <p className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-1">
            Notification Method
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Notifications about transactions, balance and exclusive offers.
          </p>
        </div>
        <div className="flex flex-col gap-6">
          <div className="flex items-start gap-2">
            <img src="./image/checkbox1.svg" alt="" />
            <div>
              <p className="text-md md:text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Email Notifications
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Receive notifications via email
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <img src="./image/checkbox1.svg" alt="" />
            <div>
              <p className="text-md md:text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Push Notifications
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Get real-time updates and alerts directly on your device
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <img src="./image/checkbox2.svg" alt="" />
            <div>
              <p className="text-md md:text-lg font-semibold text-gray-900 dark:text-white mb-1">
                SMS Notifications
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Receive notifications via SMS
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-start pb-6 mb-8 border-b border-gray-200 dark:border-gray-700">
        <div className="mr-[15rem]">
          <p className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-1">
            Theme Options
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Pick theme to personalize experience.
          </p>
        </div>
        <div className="flex flex-col gap-6">
          {/* Light Mode */}
          <button
            onClick={() => setTheme("light")}
            className="flex items-start gap-2"
          >
            {theme === "light" ? (
              <img src="./image/checkbox1.svg" alt="" />
            ) : (
              <img src="./image/checkbox2.svg" alt="" />
            )}
            <div>
              <p className="text-md md:text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Light Mode (Default)
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Pick a clean and classic light theme.
              </p>
            </div>
          </button>

          {/* Dark Mode */}
          <button
            onClick={() => setTheme("dark")}
            className="flex items-start gap-2"
          >
            {theme === "dark" ? (
              <img src="./image/checkbox1.svg" alt="" />
            ) : (
              <img src="./image/checkbox2.svg" alt="" />
            )}
            <div>
              <p className="text-md md:text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Dark Mode
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Select a sleek and modern dark theme.
              </p>
            </div>
          </button>

          {/* System Mode */}
          <button
            onClick={() => setTheme("system")}
            className="flex items-start gap-2"
          >
            {theme === "system" ? (
              <img src="./image/checkbox1.svg" alt="" />
            ) : (
              <img src="./image/checkbox2.svg" alt="" />
            )}
            <div>
              <p className="text-md md:text-lg font-semibold text-gray-900 dark:text-white mb-1">
                System Mode
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Adapts to your device's theme.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Notification;
