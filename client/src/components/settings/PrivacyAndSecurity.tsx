import React, { useState, useEffect } from "react";
import { Eye, EyeOff, X, Copy, Check } from "lucide-react";
import {
  generateSecret,
  getProfile,
  getTwoFaSettings,
  setup2FA,
  toggle2FASettings,
  updatePassword,
  verifyMFACode,
} from "../../function/user";
import Cookies from "js-cookie";
import Alert from "../alert/Alert";
import { useNavigate } from "react-router-dom";

const PrivacyAndSecurity: React.FC = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState("");
  const [alertType, setAlertType] = useState("");
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] =
    useState(false);
  const [isBackupCodesModalOpen, setIsBackupCodesModalOpen] = useState(false);
  const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [verifyCodeLoader, setVerifyCodeLoader] = useState(false);
  const [multiFAInfo, setMultiFAInfo] = useState<any>();
  const [qrLoading, setQrLoading] = useState(false);
  const [multiFAInfoSetUp, setMultiFAInfoSetUp] = useState<any>();
  const [backupCodes, setBackupCodes] = useState<string>("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [twoFAMode, setTwoFAMode] = useState<"setup" | "verify" | "reenable">(
    "setup"
  );

  const user = Cookies.get("token");
  const navigate = useNavigate();
  useEffect(() => {
    if (user) {
      handleGetTwoFaSettings();
      handleGetProfile();
    }
  }, [user]);

  async function handleGetProfile() {
    try {
      if (!user) {
        return;
      }
      const response = await getProfile(user);

      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        if (response.message === "Login has expired") {
          localStorage.clear();
          Cookies.remove("token");
          navigate("/login");
        }
        return;
      }

      localStorage.setItem("userData", JSON.stringify(response.data));
    } catch (error: any) {
      if (error.message === "Login has expired") {
        localStorage.clear();
        Cookies.remove("token");
        navigate("/login");
      }
      setMsg(error.message || "Failed to get profile details.");
      setAlertType("error");
    }
  }

  async function handleUpdatePassword() {
    setLoading(true);
    if (!password || !confirmPassword || !oldPassword) {
      setMsg("Please fill all fields");
      setAlertType("error");
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setMsg("Passwords do not match");
      setAlertType("error");
      setLoading(false);
      return;
    }

    try {
      if (!user) {
        setLoading(false);
        return;
      }
      const response = await updatePassword(password, oldPassword, user);

      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        setLoading(false);
        return;
      }
      setMsg(response.message);
      setAlertType("success");
      setPassword("");
      setConfirmPassword("");
      setOldPassword("");
    } catch (error: any) {
      setMsg(error.message || "Failed to update password.");
      setAlertType("error");
      setLoading(false);
    } finally {
      setLoading(false);
      setIsChangePasswordModalOpen(false);
    }
  }

  async function handleGenerateBackupCodes() {
    setLoading(true);
    try {
      if (!user) {
        setLoading(false);
        return;
      }
      const response = await generateSecret(user);

      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        setLoading(false);
        return;
      }
      setBackupCodes(response.data.secret);
      setMsg(response.message);
      setAlertType("success");
    } catch (error: any) {
      setMsg(error.message || "Failed to get backup codes.");
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetup2FA() {
    setQrLoading(true);
    if (!mfaCode) {
      setMsg("MFA code is required.");
      setAlertType("error");
      setQrLoading(false);
      return;
    }
    try {
      if (!user) {
        setQrLoading(false);
        return;
      }
      const response = await setup2FA(user, mfaCode);

      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        setQrLoading(false);
        return;
      }
      handleGetProfile();
      setMultiFAInfoSetUp(response.data);
      setMsg(response.message);
      setAlertType("success");
      setMfaCode("");
      setTwoFAMode("verify");
    } catch (error: any) {
      setMsg(error.message || "Failed setup MFA.");
      setAlertType("error");
    } finally {
      setQrLoading(false);
    }
  }

  async function handleGetTwoFaSettings() {
    setLoading(true);

    try {
      if (!user) {
        setLoading(false);
        return;
      }
      const response = await getTwoFaSettings(user);
      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        setLoading(false);
        return;
      }
      handleGetProfile();
      setMultiFAInfo(response.data);
    } catch (error: any) {
      if (error.message !== "MFA settings not found, returning default") {
        setMsg(error.message || "Failed get MFA details.");
        setAlertType("error");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle2fa() {
    setLoading(true);
    try {
      if (!user) {
        setLoading(false);
        return;
      }
      const response = await toggle2FASettings(user);

      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        setLoading(false);
        return;
      }

      setMultiFAInfo((prev) => ({
        ...prev,
        isEnabled: !prev.isEnabled,
      }));
      handleGetProfile();
      setMsg(response.message);
      setAlertType("success");

      setTimeout(() => {
        handleGetTwoFaSettings();
      }, 500);
    } catch (error: any) {
      setMsg(error.message || "Failed toggle MFA.");
      setAlertType("error");
    } finally {
      setLoading(false);
      setIsTwoFactorModalOpen(false);
    }
  }

  async function handleReenable2FA() {
    setVerifyCodeLoader(true);

    if (!mfaCode) {
      setMsg("Please enter verification code");
      setAlertType("error");
      setVerifyCodeLoader(false);
      return;
    }

    try {
      if (!user) {
        setVerifyCodeLoader(false);
        return;
      }

      // First verify the code is correct
      const verifyResponse = await verifyMFACode(user, mfaCode);
      if (!verifyResponse.success) {
        setMsg(verifyResponse.message);
        setAlertType("error");
        setVerifyCodeLoader(false);
        return;
      }

      // Then toggle 2FA on
      const toggleResponse = await toggle2FASettings(user);
      if (!toggleResponse.success) {
        setMsg(toggleResponse.message);
        setAlertType("error");
        setVerifyCodeLoader(false);
        return;
      }

      setMultiFAInfo((prev) => ({
        ...prev,
        isEnabled: true,
      }));

      setMsg("2FA has been re-enabled successfully.");
      setAlertType("success");
      setMfaCode("");
      setIsTwoFactorModalOpen(false);
      setTwoFAMode("setup");

      setTimeout(() => {
        handleGetTwoFaSettings();
      }, 500);
    } catch (error: any) {
      setMsg(error.message || "Failed to re-enable 2FA.");
      setAlertType("error");
    } finally {
      setVerifyCodeLoader(false);
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);

      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (err) {
      setMsg("Failed to copy to clipboard");
      setAlertType("error");
    }
  };

  const copyAllCodes = () => {
    copyToClipboard(backupCodes);
  };

  const handleCloseBackupCodesModal = () => {
    setIsBackupCodesModalOpen(false);
    setBackupCodes("");
    setCopiedIndex(null);
    setCopiedAll(false);
  };

  const handleTwoFactorButtonClick = () => {
    setIsTwoFactorModalOpen(true);
    setMfaCode("");

    // Check MFA state
    if (multiFAInfo?.isEnabled) {
      // 2FA is enabled - show disable option
      setTwoFAMode("setup");
    } else if (multiFAInfo?.secret) {
      // 2FA is set up but disabled - show re-enable flow
      setTwoFAMode("reenable");
    } else {
      // 2FA not set up at all - show setup flow
      setTwoFAMode("setup");
    }
  };

  return (
    <div className="p-4">
      {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
      <div className="flex items-center justify-between pb-6 mb-8 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-lg font-semibold mb-2">Change Password</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Update password for enhanced account security.
          </p>
        </div>
        <button
          onClick={() => setIsChangePasswordModalOpen(true)}
          className="border px-3 py-[6px] rounded-[8px] text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Change Password
        </button>
      </div>
      <div className="flex items-center justify-between pb-6 mb-8 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-lg font-semibold mb-2">Backup Secret Code</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Create and store new backup secret code for use in the event of
            losing access to your authentication app.
          </p>
        </div>
        <button
          onClick={() => {
            setIsBackupCodesModalOpen(true);
            handleGenerateBackupCodes();
          }}
          className="border px-3 py-[6px] rounded-[8px] text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Generate Secret Code
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
          {multiFAInfo?.isEnabled && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                2FA Enabled
              </span>
            </div>
          )}
        </div>
        <button
          onClick={handleTwoFactorButtonClick}
          className="border px-3 py-[6px] rounded-[8px] text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Manage Authentication
        </button>
      </div>

      {/* Change Password Modal */}
      {isChangePasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-300/90 dark:bg-black/90">
          <div className="bg-white mx-5 dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 relative">
            <button
              className="absolute bg-gray-100 dark:bg-gray-700 rounded-full p-1 text-[1rem] top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
              onClick={() => setIsChangePasswordModalOpen(false)}
            >
              <X size={24} />
            </button>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Change Password
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Please enter your current password and set a new password.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    type={showOldPassword ? "text" : "password"}
                    disabled={loading}
                    placeholder="Enter your current password"
                    className="w-full px-4 py-2 border border-[#0E7BB2] rounded-lg text-gray-900 dark:text-gray-100 dark:bg-gray-700 dark:border-gray-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-3 flex items-center text-gray-500 dark:text-gray-300"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                  >
                    {showOldPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    disabled={loading}
                    placeholder="Enter your new password"
                    className="w-full px-4 py-2 border border-[#0E7BB2] rounded-lg text-gray-900 dark:text-gray-100 dark:bg-gray-700 dark:border-gray-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-3 flex items-center text-gray-500 dark:text-gray-300"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    type={showConfirmPassword ? "text" : "password"}
                    disabled={loading}
                    placeholder="Confirm your new password"
                    className="w-full px-4 py-2 border border-[#0E7BB2] rounded-lg text-gray-900 dark:text-gray-100 dark:bg-gray-700 dark:border-gray-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-3 flex items-center text-gray-500 dark:text-gray-300"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6 gap-4">
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                onClick={() => setIsChangePasswordModalOpen(false)}
                disabled={loading}
              >
                Cancel
              </button>

              <button
                className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-[#0E7BB2] hover:bg-[#0B5E8C] disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleUpdatePassword}
                disabled={
                  loading || !password || !oldPassword || !confirmPassword
                }
              >
                {loading ? (
                  <div className="flex items-center">
                    <span>Saving</span>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></div>
                  </div>
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup Codes Modal */}
      {isBackupCodesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-300/90 dark:bg-black/90">
          <div className="bg-white mx-5 dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 relative">
            <button
              className="absolute bg-gray-100 dark:bg-gray-700 rounded-full p-1 text-[1rem] top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
              onClick={handleCloseBackupCodesModal}
            >
              <X size={24} />
            </button>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Backup Secret Code
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Save this backup secret code in a secure place.
            </p>

            {backupCodes ? (
              <>
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="gap-3">
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                      <code className="font-mono text-gray-800 dark:text-gray-200">
                        {backupCodes}
                      </code>
                      <button
                        onClick={() => copyToClipboard(backupCodes)}
                        className="ml-2 p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Copy code"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <button
                    onClick={copyAllCodes}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    {copiedAll ? (
                      <>
                        <Check size={16} className="text-green-500" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        Copy
                      </>
                    )}
                  </button>

                  <div className="flex gap-3">
                    <button
                      onClick={handleGenerateBackupCodes}
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="flex items-center">
                          <span>Generating</span>
                          <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin ml-2"></div>
                        </div>
                      ) : (
                        "Regenerate"
                      )}
                    </button>

                    <button
                      onClick={handleCloseBackupCodesModal}
                      className="px-4 py-2 text-sm font-medium text-white bg-[#0E7BB2] rounded-lg hover:bg-[#0B5E8C]"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                {loading ? (
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-2 border-[#0E7BB2] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">
                      Generating backup codes...
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-300">
                    No backup codes generated yet.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Two-factor Authentication Modal */}
      {isTwoFactorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-300/90 dark:bg-black/90">
          <div className="bg-white mx-5 dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 relative">
            <button
              className="absolute bg-gray-100 dark:bg-gray-700 rounded-full p-1 text-[1rem] top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
              onClick={() => {
                setIsTwoFactorModalOpen(false);
                setTwoFAMode("setup");
                setMfaCode("");
              }}
            >
              <X size={24} />
            </button>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {multiFAInfo?.isEnabled
                ? "Two-factor Authentication"
                : twoFAMode === "reenable"
                ? "Enable Two-factor Authentication"
                : twoFAMode === "verify"
                ? "Verify Two-factor Authentication"
                : "Setup Two-factor Authentication"}
            </h2>

            {multiFAInfo?.isEnabled ? (
              <>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Two-factor authentication is currently{" "}
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    enabled
                  </span>{" "}
                  for your account.
                </p>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    If you disable 2FA, your account will be less secure. Make
                    sure you have backup codes saved before proceeding.
                  </p>
                </div>
                <div className="flex justify-end gap-4">
                  <button
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    onClick={() => setIsTwoFactorModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleToggle2fa}
                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                    disabled={loading}
                  >
                    {loading ? "Disabling..." : "Disable 2FA"}
                  </button>
                </div>
              </>
            ) : (
              <>
                {twoFAMode === "setup" && !multiFAInfo?.isSetup ? (
                  <>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      Enter the MFA code from your authentication app to set up
                      2FA.
                    </p>
                    <div className="mb-6">
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                        MFA Code
                      </label>
                      <input
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value)}
                        type="text"
                        placeholder="Enter MFA code"
                        className="w-full px-4 py-2 border border-[#0E7BB2] rounded-lg text-gray-900 dark:text-gray-100 dark:bg-gray-700 dark:border-gray-600 focus:outline-none"
                      />
                    </div>
                    <div className="flex justify-end mt-6">
                      <button
                        className="px-4 py-2 text-sm font-medium text-white bg-[#0E7BB2] rounded-lg hover:bg-[#0B5E8C] disabled:opacity-50"
                        onClick={handleSetup2FA}
                        disabled={qrLoading || !mfaCode}
                      >
                        {qrLoading ? (
                          <div className="flex items-center">
                            <span>Setting up</span>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></div>
                          </div>
                        ) : (
                          "Set Up 2FA"
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      Your 2FA is already set up but currently disabled. Enter
                      the verification code from your authentication app to
                      re-enable it.
                    </p>
                    <div className="mb-6">
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Verification Code
                      </label>
                      <input
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value)}
                        type="text"
                        placeholder="Enter verification code"
                        className="w-full px-4 py-2 border border-[#0E7BB2] rounded-lg text-gray-900 dark:text-gray-100 dark:bg-gray-700 dark:border-gray-600 focus:outline-none"
                      />
                    </div>
                    <div className="flex justify-end mt-6">
                      <button
                        className="px-4 py-2 text-sm font-medium text-white bg-[#0E7BB2] rounded-lg hover:bg-[#0B5E8C] disabled:opacity-50"
                        onClick={handleReenable2FA}
                        disabled={verifyCodeLoader || !mfaCode}
                      >
                        {verifyCodeLoader ? (
                          <div className="flex items-center">
                            <span>Enabling...</span>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></div>
                          </div>
                        ) : (
                          "Enable 2FA"
                        )}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivacyAndSecurity;
