import React from "react";

const PrivacyAndSecurity: React.FC = () => {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between pb-6 mb-8 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-lg font-semibold mb-2">Change Password</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Update password for enhanced account security.
          </p>
        </div>
        <button className="border px-3 py-[6px] rounded-[8px] text-sm text-gray-500 dark:text-gray-400">
          Change Password
        </button>
      </div>
      <div className="flex items-center justify-between pb-6 mb-8 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-lg font-semibold mb-2">Backup Codes</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Create and store new backup codes for use in the event of losing
            access to your authentication app.
          </p>
        </div>
        <button className="border px-3 py-[6px] rounded-[8px] text-sm text-gray-500 dark:text-gray-400">
          Generate Codes
        </button>
      </div>
      <div className="flex items-center justify-between pb-6 mb-8 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-lg font-semibold mb-2">
            Two-factor Authentication
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Add an extra layer of protection to your account.
          </p>
        </div>
        <button className="border px-3 py-[6px] rounded-[8px] text-sm text-gray-500 dark:text-gray-400">
          Manage Authentication
        </button>
      </div>
      {/* Add privacy and security settings form or options here */}
    </div>
  );
};

export default PrivacyAndSecurity;
