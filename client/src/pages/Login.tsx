import React, { useEffect, useState, useRef } from "react";
import AuthNav from "../components/auth-nav/AuthNav";
import Alert from "../components/alert/Alert";
import { GoEye, GoEyeClosed } from "react-icons/go";
import Cookies from "js-cookie";
import { FiExternalLink } from "react-icons/fi";
// import ReCAPTCHA from "react-google-recaptcha";
import OTPInput from "react-otp-input";
import { Link, useNavigate } from "react-router-dom";
import { signIn, verifyUser } from "../function/auth";
import { MdEmail } from "react-icons/md";
import { Key, Lock, X } from "lucide-react";
import { BsLock } from "react-icons/bs";
import ThemeToggle from "../components/theme-toggle";
import AuthFooter from "../components/auth-nav/AuthFooter";
import AuthHeader from "../components/auth-nav/AuthHeader";

const Login: React.FC = () => {
  const [msg, setMsg] = useState("");
  const [alertType, setAlertType] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordType, setPasswordType] = useState("password");
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<any>();
  const [mfaCode, setMfaCode] = useState("");
  const [verifyCodeLoader, setVerifyCodeLoader] = useState(false);
  const recaptchaRef = useRef(null);
  const [captchaValue, setCaptchaValue] = useState("");
  const [authPage, setAuthPage] = useState(false);
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [loginData, setLoginData] = useState<any>(null);
  const [showMFAModal, setShowMFAModal] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const token = Cookies.get("token");
    if (token) navigate("/dashboard");
  }, []);

  async function handleVerifyUser(e: any) {
    e.preventDefault();
    setLoading(true);

    if (!email) {
      setMsg("Please fill in all fields");
      setAlertType("error");
      setLoading(false);
      return;
    }

    try {
      const response = await verifyUser(email);

      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        return;
      }

      const { isEnabled } = response.data.mfaSetup || {};
      if (isEnabled) {
        setAuthPage(true);
        return;
      }

      // If no MFA, proceed to regular login
      handleSignIn(e);
    } catch (error: any) {
      setMsg(error.message || "An error occurred during verify-user");
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn(e: any) {
    if (e && e.preventDefault) e.preventDefault();

    if (requiresMFA) {
      // This is for MFA verification after initial login
      handleMFACodeVerification();
      return;
    }

    // Regular login (without MFA or initial login with MFA)
    setLoading(true);

    if (!email || !password) {
      setMsg("Please fill in all fields");
      setAlertType("error");
      setLoading(false);
      return;
    }

    try {
      const response = await signIn(email, password, "", captchaValue);

      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        setLoading(false);
        return;
      }

      // Check if MFA is required
      if (response.data.requiresMFA) {
        setRequiresMFA(true);
        setShowMFAModal(true);
        setLoginData(response.data);
        setLoading(false);
        return;
      }

      // No MFA required, proceed with login
      completeLogin(response.data);
    } catch (error: any) {
      setMsg(error.message || "An error occurred during sign-in");
      setAlertType("error");
      setLoading(false);
    }
  }

  async function handleMFACodeVerification() {
    if (!mfaCode || mfaCode.length !== 6) {
      setMsg("Please enter a valid 6-digit MFA code");
      setAlertType("error");
      return;
    }

    setVerifyCodeLoader(true);

    try {
      // Use the stored login data or try to login again with MFA code
      const response = await signIn(email, password, mfaCode, captchaValue);

      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        setVerifyCodeLoader(false);
        return;
      }

      // MFA verification successful
      completeLogin(response.data);
    } catch (error: any) {
      setMsg(error.message || "Failed to verify MFA code");
      setAlertType("error");
      setVerifyCodeLoader(false);
    }
  }

  function completeLogin(data: any) {
    const { isEmailVerified, stellarPublicKey } = data.user;
    const { token } = data;

    if (!isEmailVerified) {
      navigate("/confirm-email");
      return;
    }

    if (!stellarPublicKey) {
      navigate("/about-self");
      return;
    }

    Cookies.set("token", token);    
    localStorage.setItem("userData", JSON.stringify(data));

    // Reset states
    setRequiresMFA(false);
    setAuthPage(false);
    setShowMFAModal(false);
    setMfaCode("");
    setLoginData(null);

    navigate("/dashboard");
  }

  const handleCaptchaChange = (value) => {
    setCaptchaValue(value);
  };

  const goBackToLogin = () => {
    setAuthPage(false);
    setRequiresMFA(false);
    setShowMFAModal(false);
    setMfaCode("");
  };

  return (
    <>
      {showMFAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-300/90 dark:bg-black/90">
          <div className="bg-white mx-5 dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 relative">
            {/* Close Button */}
            <button
              className="absolute bg-gray-100 dark:bg-gray-700 rounded-full p-1 text-[1rem] top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
              onClick={goBackToLogin}
            >
              <X size={24} />
            </button>

            {/* Modal Header */}
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Two-Factor Authentication
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4 md:text-[16px] text-[14px]">
              Enter the 6-digit verification code from your authenticator app
            </p>

            <div className="flex justify-center mb-6">
              <OTPInput
                value={mfaCode}
                inputType="number"
                onChange={setMfaCode}
                numInputs={6}
                renderSeparator={
                  <span style={{ visibility: "hidden" }}>---</span>
                }
                renderInput={(props) => (
                  <input
                    {...props}
                    placeholder="0"
                    style={{ width: "50px" }}
                    className="text-center text-gray-700 dark:text-gray-300 focus:border-[#0E7BB2] bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 otp-input text-[20px] font-[500] outline-none h-[58px] rounded-[4px] placeholder:text-[#96969659] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none mx-1"
                  />
                )}
              />
            </div>

            <button
              onClick={handleMFACodeVerification}
              disabled={verifyCodeLoader || !mfaCode || mfaCode.length !== 6}
              className="hover:bg-[#0c5e89] bg-[#0E7BB2] mt-3 flex justify-center items-center rounded-[10px] py-3 w-full text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Verify Code
              {verifyCodeLoader && (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></div>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="min-h-screen flex flex-col relative bg-[#F9F9F9] dark:bg-gray-800">
        <AuthHeader />
        <main className="flex-1 sm:mt-[5rem] md:mt-[7rem] mt-[50px] mx-3 md:px-24 relative">
          <img
            src="./image/Pattern.svg"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            alt=""
          />
          <div className="flex flex-col h-[70vh] justify-center items-center relative z-[11]">
            <div className="bg-[white] dark:bg-gray-900 shadow shadow-[#585C5F1A] px-4 sm:px-6 pt-8 pb-5 rounded-[18px] w-full sm:w-[450px]">
              <div className="top-bg relative top-[50px] sm:flex items-center justify-center w-[300px] mx-auto">
                <img
                  src="./image/Custom-Icon.svg"
                  alt="RendBit Logo"
                  className="mx-auto mb-4 relative top-[-65px] mt-5"
                />
              </div>
              <div className="text-center mb-12 mt-[-30px] relative z-[100]">
                <h2 className="text-[18px] md:text-[24px] text-[black] dark:text-gray-300 mb-2">
                  Login to your account
                </h2>
                <p className="text-black dark:text-gray-300 text-[14px]">
                  Enter your details to login.
                </p>
              </div>
              <form
                onSubmit={handleVerifyUser}
                className="flex flex-col mx-auto"
              >
                <div className="w-[100%]">
                  <label className="text-black dark:text-gray-300 font-[500] text-[14px] mb-2 ml-1 block">
                    Email Address
                  </label>
                  <div className="border border-[#E2E4E9] text-[#868C98] px-2 py-[7px] rounded-[6px] gap-2 flex items-center justify-between w-full">
                    <MdEmail />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      placeholder="hello@rendbit.com"
                      autoComplete="off"
                      name="email-field"
                      className="outline-none w-full"
                      required
                    />
                  </div>
                </div>

                <div className="mt-8">
                  <label className="text-black dark:text-gray-300 font-[500] text-[14px] mb-2 ml-1 block">
                    Password
                  </label>
                  <div className="border border-[#E2E4E9] text-[#868C98] px-2 py-[7px] rounded-[6px] gap-2 flex items-center justify-between w-full">
                    <Key />
                    <input
                      type={passwordType}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      placeholder="********"
                      autoComplete="current-password"
                      name="password-field"
                      className="outline-none w-full text-[#868C98]"
                      required
                    />
                    <div>
                      {passwordType === "password" ? (
                        <GoEye
                          className="cursor-pointer text-[#868C98]"
                          onClick={() => setPasswordType("text")}
                        />
                      ) : (
                        <GoEyeClosed
                          className="cursor-pointer text-[#868C98]"
                          onClick={() => setPasswordType("password")}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-black dark:text-gray-300 text-end mt-2 text-[14px] underline">
                  <Link to="/forgot-password" className="cursor-pointer">
                    Forgot Password?
                  </Link>
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex justify-center cursor-pointer bg-[#0E7BB2] border border-[#FFFFFF]/50 items-center text-white py-[10px] px-4 rounded-[8px] mt-7 text-[14px] hover:bg-[#0B5E8C] disabled:opacity-50"
                >
                  <span>Login</span>
                  {loading && (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></div>
                  )}
                </button>
              </form>
            </div>
          </div>
        </main>
        <AuthFooter />

        {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
      </div>

      {authPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-300/90 dark:bg-black/90">
          <div className="bg-white mx-5 dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 relative">
            {/* Close Button */}
            <button
              className="absolute bg-gray-100 dark:bg-gray-700 rounded-full p-1 text-[1rem] top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
              onClick={() => setAuthPage(false)}
            >
              <X size={24} />
            </button>
            {/* Modal Header */}
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Enter Verification code:
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4 md:text-[16px] text-[14px]">
              Enter the 6-digit code from your google authenticator app
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleMFACodeVerification();
              }}
              className="flex flex-col sm:w-[400px] mx-auto"
            >
              <div className="flex justify-center mb-6">
                <OTPInput
                  value={mfaCode}
                  inputType="number"
                  onChange={setMfaCode}
                  numInputs={6}
                  renderSeparator={
                    <span style={{ visibility: "hidden" }}>---</span>
                  }
                  renderInput={(props) => (
                    <input
                      {...props}
                      placeholder="0"
                      style={{ width: "50px" }}
                      disabled={verifyCodeLoader}
                      className="text-center text-gray-700 dark:text-gray-300 focus:border-[#0E7BB2] bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 outline-none font-[500] h-[58px] rounded-[4px] placeholder:text-[#96969659] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none mx-1"
                    />
                  )}
                />
              </div>

              <button
                type="submit"
                disabled={verifyCodeLoader || mfaCode.length !== 6}
                className="flex justify-center items-center bg-[#0E7BB2] text-white py-3 px-4 rounded-[8px] text-[14px] mt-5 hover:bg-[#0B5E8C] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Verify Code</span>
                {verifyCodeLoader && (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></div>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Login;
