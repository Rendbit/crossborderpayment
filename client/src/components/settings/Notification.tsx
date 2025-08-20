import React from "react";
import { useAppContext } from "../../context/useContext";
import { ChevronRight } from "lucide-react";

const Notification: React.FC = () => {
  const { setTheme, theme } = useAppContext();

  return (
    <div className="p-4">
      {/* General Notifications */}
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
          {/* Transaction Alerts */}
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              checked
              disabled
              className="relative w-11 h-6 cursor-pointer appearance-none rounded-full bg-gray-300 
              checked:bg-[#0E7BB2] transition-colors duration-300
              before:content-[''] before:absolute before:top-0.5 before:left-0.5 
              before:w-5 before:h-5 before:rounded-full before:bg-white 
              before:transition-transform before:duration-300
              checked:before:translate-x-5
              disabled:pointer-events-none disabled:opacity-100"
            />
            <div>
              <p className="text-md md:text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Transaction Alerts
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Receive notifications for every transaction
              </p>
            </div>
          </div>

          {/* Low Balance Alert */}
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              disabled
              className="relative w-11 h-6 cursor-pointer appearance-none rounded-full bg-gray-300 
              checked:bg-[#0E7BB2] transition-colors duration-300
              before:content-[''] before:absolute before:top-0.5 before:left-0.5 
              before:w-5 before:h-5 before:rounded-full before:bg-white 
              before:transition-transform before:duration-300
              checked:before:translate-x-5
              disabled:pointer-events-none disabled:opacity-100"
            />
            <div>
              <p className="text-md md:text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Low Balance Alert
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Receive a warning if your balance falls below $10,000.00.
              </p>
              <button className="dark:text-gray-500 text-[#0E7BB2] mt-2 flex items-center gap-1">
                Edit Limit <ChevronRight />
              </button>
            </div>
          </div>

          {/* Exclusive Offers */}
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              disabled
              className="relative w-11 h-6 cursor-pointer appearance-none rounded-full bg-gray-300 
              checked:bg-[#0E7BB2] transition-colors duration-300
              before:content-[''] before:absolute before:top-0.5 before:left-0.5 
              before:w-5 before:h-5 before:rounded-full before:bg-white 
              before:transition-transform before:duration-300
              checked:before:translate-x-5
              disabled:pointer-events-none disabled:opacity-100"
            />
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

      {/* Notification Method */}
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
          {/* Email */}
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              checked
              disabled
              className="accent-[#0E7BB2] h-4 w-4 cursor-pointer hover:accent-[#0c5e89] disabled:pointer-events-none disabled:opacity-100"
            />
            <div>
              <p className="text-md md:text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Email Notifications
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Receive notifications via email
              </p>
            </div>
          </div>

          {/* Push */}
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              disabled
              className="accent-[#0E7BB2] h-4 w-4 cursor-pointer hover:accent-[#0c5e89] disabled:pointer-events-none disabled:opacity-100"
            />
            <div>
              <p className="text-md md:text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Push Notifications
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Get real-time updates and alerts directly on your device
              </p>
            </div>
          </div>

          {/* SMS */}
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              disabled
              className="accent-[#0E7BB2] h-4 w-4 cursor-pointer hover:accent-[#0c5e89] disabled:pointer-events-none disabled:opacity-100"
            />
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

      {/* Theme Options */}
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
            <input
              type="checkbox"
              checked={theme === "light"}
              className="accent-[#0E7BB2] h-4 w-4 cursor-pointer hover:accent-[#0c5e89] disabled:opacity-100"
              readOnly
            />
            <div className="text-left">
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
            <input
              type="checkbox"
              checked={theme === "dark"}
              className="accent-[#0E7BB2] h-4 w-4 cursor-pointer hover:accent-[#0c5e89] disabled:opacity-100"
              readOnly
            />
            <div className="text-left">
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
            <input
              type="checkbox"
              checked={theme === "system"}
              className="accent-[#0E7BB2] h-4 w-4 cursor-pointer hover:accent-[#0c5e89] disabled:opacity-100"
              readOnly
            />
            <div className="text-left">
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
