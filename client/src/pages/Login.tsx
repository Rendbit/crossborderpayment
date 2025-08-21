import React, { useEffect, useState, useRef } from "react";
import AuthNav from "../components/auth-nav/AuthNav";
import Alert from "../components/alert/Alert";
import { GoEye, GoEyeClosed } from "react-icons/go";
import Cookies from "js-cookie";
import { FiExternalLink } from "react-icons/fi";
// import ReCAPTCHA from "react-google-recaptcha";
import OTPInput from "react-otp-input";
import { Link, useNavigate } from "react-router-dom";
import { signIn } from "../function/auth";
import { MdEmail } from "react-icons/md";
import { Key, Lock } from "lucide-react";
import { BsLock } from "react-icons/bs";
import ThemeToggle from "../components/theme-toggle";

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

  const navigate = useNavigate();

  useEffect(() => {
    const token = Cookies.get("token");
    if (token) navigate("/dashboard");
  }, []);

  async function handleSignIn(e: any) {
    e.preventDefault();
    setLoading(true);

    if (!email || !password) {
      setMsg("Please fill in all fields");
      setAlertType("error");
      setLoading(false);
      return;
    }

    try {
      const response = await signIn(email, password, mfaCode, captchaValue);

      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        return;
      }

      const { isMFA, isEmailVerified, stellarPublicKey, token, ...safeData } =
        response.data;

      if (isMFA) {
        setAuthPage(true);
        return;
      }

      if (!isEmailVerified) {
        navigate("/confirm-email");
        return;
      }

      if (!stellarPublicKey) {
        navigate("/about-self");
        return;
      }

      Cookies.set("token", token);
      localStorage.setItem("userData", JSON.stringify(safeData));
      navigate("/dashboard");
    } catch (error: any) {
      setMsg(error.message || "An error occurred during sign-in");
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  }

  const handleCaptchaChange = (value) => {
    setCaptchaValue(value);
  };

  return (
    <>
      {authPage ? (
        <div className="relative bg-gray-100 dark:bg-gray-800">
          <AuthNav />
          <div className="sm:mt-[5rem] mt-[50px] mx-3 md:px-24">
            <div className="flex flex-col justify-center items-center relative z-[11]">
              <div className="px-4 sm:px-8 pt-8 pb-5 rounded-[16px] w-full sm:w-[488px] border">
                <div className="hidden top-bg relative top-[-20px] sm:flex items-center justify-center w-[300px] mx-auto">
                  <img
                    src="./images/favicon.svg"
                    alt="RendBit Logo"
                    className="mx-auto mb-4 relative top-[-65px]"
                  />
                </div>
                <div className="text-center mb-12 mt-[-80px] relative z-[100]">
                  {/* <h2 className="text-[36px] font-semibold mb-2">Login</h2> */}
                  <p className="text-black dark:text-gray-300 text-[14px]">
                    Enter Verification code
                  </p>
                </div>
                <form
                  onSubmit={handleSignIn}
                  className="flex flex-col sm:w-[400px] mx-auto"
                >
                  <p className="text-center text-[14px] text-black dark:text-gray-300 mb-[35px] mt-[4.5rem]">
                    Enter the 6-digit code from your google authenticator app
                  </p>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
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
                          placeholder="1"
                          style={{ width: "50px" }}
                          disabled={verifyCodeLoader}
                          className="text-center outline-none font-[500] h-[58px] rounded-[4px] w-[71px] border placeholder:text-[#96969659] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      )}
                    />
                  </div>

                  <button
                    onClick={handleSignIn}
                    disabled={verifyCodeLoader}
                    className="flex justify-center items-center bg-primary-color text-white py-2 px-4 rounded-[8px] text-[14px] mt-5"
                  >
                    <span>Verify Code</span>
                    {verifyCodeLoader && (
                      <img
                        src="./image/loader.gif"
                        className="w-[20px] mx-2"
                        alt=""
                      />
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
          <div className="mt-[50px] mb-5 sm:mx-10 flex sm:flex-row flex-col sm:gap-0 gap-3 items-center justify-between">
            <p className="text-black dark:text-gray-300 text-[14px]">
              &copy; {new Date().getFullYear()} RendBit. All rights
              reserved.
            </p>
            <div className="text-black dark:text-gray-300 text-[14px] flex items-center gap-4">
              <Link to="#" className="flex items-center gap-[2px]">
                Privacy Policy <FiExternalLink />
              </Link>
              <Link to="#" className="mr-4 flex items-center gap-[2px]">
                Terms of Use <FiExternalLink />
              </Link>
            </div>
          </div>
          {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
          {modal === "verify-code" && (
            <div>
              <div
                className="h-full w-full fixed top-0 left-0 z-[1001]"
                style={{ background: "rgba(14, 14, 14, 0.58)" }}
              ></div>
              <div
                className="bg-white fixed top-[50%] left-[50%] z-[10002] rounded-[8px]"
                style={{ transform: "translate(-50%, -50%)" }}
              >
                <div className="bg-white p-10" style={{ borderRadius: "10px" }}>
                  <p className="text-center text-white text-[14px]">
                    Enter 6-digit code from your google authenticator app
                  </p>
                  <input
                    type="text"
                    placeholder="******"
                    className="mt-5 w-full border border-[#D0D5DD] px-[14px] py-[10px] rounded-[8px] shadow-sm outline-none text-black dark:text-gray-300"
                    onChange={(e) => setMfaCode(e.target.value)}
                  />
                  <button
                    className="flex justify-center items-center bg-primary-color text-white py-[8px] px-8 rounded-[6px] mt-5 w-full text-[14px] lg:text-[16px]"
                    onClick={handleSignIn}
                    disabled={verifyCodeLoader}
                  >
                    <span>Verify Code</span>
                    {verifyCodeLoader && (
                      <img
                        src="./image/loader.gif"
                        className="w-[20px] mx-2"
                        alt=""
                      />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative bg-gray-100 dark:bg-gray-800 min-h-screen">
          <div className="flex items-center justify-between w-full md:pr-[100px] pr-[20px]">
            <AuthNav />
            <div className="text-center text-black dark:text-gray-300 text-[14px] flex items-center truncate">
              Don&apos;t have an account?{" "}
              <Link to="/create-account" className="text-[#0E7BB2] underline ml-1 mr-4 sm:mr-10">
                Register
              </Link>
              <ThemeToggle type={"icon"} />
            </div>
          </div>
          <div className="sm:mt-[5rem] md:mt-[7rem] mt-[50px] mx-3 md:px-24 relative">
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
                  <h2 className="text-[18px] md:text-[24px] text-[black] dark:text-gray-300 mb-2">Login to your account</h2>
                  <p className="text-black dark:text-gray-300 text-[14px]">
                    Enter your details to login.
                  </p>
                </div>
                <form
                  onSubmit={handleSignIn}
                  className="flex flex-col mx-auto"
                >
                  <div className="w-[100%]">
                    <label className="text-black dark:text-gray-300 font-[500] text-[14px] mb-2 ml-1 block">
                      Email Address
                    </label>
                    <div className="border border-[#E2E4E9] text-[#868C98] px-2 py-[7px] rounded-[6px] gap-2 flex items-center justify-between w-full">
                      <MdEmail />
                      <input
                        type="text"
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        placeholder="hello@rendbit.com"
                        autoComplete="off"
                        name="email-field"
                        className="outline-none w-full"
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
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        placeholder="********"
                        autoComplete="new-password"
                        name="password-field"
                        className="outline-none w-full text-[#868C98]"
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

                  <p
                    className="text-black dark:text-gray-300 cursor-pointer text-end mt-2 text-[14px] underline"
                    onClick={() => navigate("/forgot-password")}
                  >
                    Forgot Password?
                  </p>

                  <button
                    onClick={handleSignIn}
                    disabled={loading}
                    className="flex justify-center cursor-pointer bg-[#0E7BB2] border border-[#FFFFFF]/50 items-center  text-white py-[10px] px-4 rounded-[8px] mt-7 text-[14px]"
                  >
                    <span>Login</span>
                    {loading && (
                      <img
                        src="./image/loader.gif"
                        className="w-[20px] mx-2"
                        alt=""
                      />
                    )}
                  </button>
                </form>
              </div>
            </div>
            {/* <div className="flex items-center justify-center mt-3">
              <div>
                <p>Complete ReCaptcha to continue.</p>

                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={process.env.NEXT_PUBLIC_SITE_KEY}
                  onChange={handleCaptchaChange}
                />
              </div>
            </div> */}
          </div>
          <div className="mt-[50px] mb-5 sm:mx-10 flex sm:flex-row flex-col sm:gap-0 gap-3 items-center justify-between">
            <p className="text-black dark:text-gray-300 text-[14px]">
              &copy; {new Date().getFullYear()} RendBit. All rights
              reserved.
            </p>
            <div className="text-black dark:text-gray-300 text-[14px] flex items-center gap-4">
              <Link to="#" className="flex items-center gap-[2px]">
                Privacy Policy <FiExternalLink />
              </Link>
              <Link to="#" className="mr-4 flex items-center gap-[2px]">
                Terms of Use <FiExternalLink />
              </Link>
            </div>
          </div>
          {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
          {modal === "verify-code" && (
            <div>
              <div
                className="h-full w-full fixed top-0 left-0 z-[1001]"
                style={{ background: "rgba(14, 14, 14, 0.58)" }}
              ></div>
              <div
                className="border border-[#B2B2B27A] fixed top-[50%] left-[50%] z-[10002] rounded-[8px]"
                style={{ transform: "translate(-50%, -50%)" }}
              >
                <div
                  className="border border-[#B2B2B27A] p-10"
                  style={{ borderRadius: "10px" }}
                >
                  <p className="text-center text-white text-[14px]">
                    Enter 6-digit code from your google authenticator app
                  </p>
                  <input
                    type="text"
                    placeholder="******"
                    disabled={verifyCodeLoader}
                    className="mt-5 w-full border border-[#D0D5DD] bg-transparent px-[14px] py-[10px] rounded-[8px] shadow-sm outline-none text-black dark:text-gray-300"
                    onChange={(e) => setMfaCode(e.target.value)}
                  />

                  <button
                    className="flex justify-center items-center bg-primary-color text-white py-[8px] px-8 rounded-[6px] mt-5 w-full text-[14px] lg:text-[16px]"
                    onClick={handleSignIn}
                    disabled={verifyCodeLoader}
                  >
                    <span>Verify code</span>
                    {verifyCodeLoader && (
                      <img
                        src="./image/loader.gif"
                        className="w-[20px] mx-2"
                        alt=""
                      />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default Login;
