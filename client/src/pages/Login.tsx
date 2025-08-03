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
        <div className="relative">
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
                  <p className="text-[#ffffff] text-[14px]">
                    Enter Verification code
                  </p>
                </div>
                <form
                  onSubmit={handleSignIn}
                  className="flex flex-col sm:w-[400px] mx-auto"
                >
                  <p className="text-center text-[14px] text-[#ffffff] mb-[35px] mt-[4.5rem]">
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
            <p className="text-[white] text-[14px]">
              &copy; {new Date().getFullYear()} RendBit. All rights
              reserved.
            </p>
            <div className="text-[white] text-[14px] flex items-center gap-4">
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
                    className="mt-5 w-full border border-[#D0D5DD] px-[14px] py-[10px] rounded-[8px] shadow-sm outline-none text-[#ffffff]"
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
        <div className="relative bg-gradient-to-b from-[#02001C] via-[#02001C] via-85% to-[#0E7BB2]">
          <AuthNav />
          <div className="sm:mt-[5rem] md:mt-[7rem] mt-[50px] mx-3 md:px-24">
            <div className="flex flex-col h-[70vh] justify-center items-center relative z-[11]">
              <h2 className="text-[28px] text-white mb-4 font-[600]">
                Login
              </h2>
              <div className="border border-[#999999]/50 px-4 sm:px-8 pt-8 pb-5 rounded-md w-full sm:w-[650px]">
                <div className="hidden top-bg relative top-[50px] sm:flex items-center justify-center w-[300px] mx-auto">
                  <img
                    src="./images/favicon.svg"
                    alt="RendBit Logo"
                    className="mx-auto mb-4 relative top-[-65px]"
                  />
                </div>
                <div className="text-center mb-12 mt-[-30px] relative z-[100]">
                  <h2 className="text-[24px] text-white mb-2">RendBit</h2>
                  <p className="text-[#ffffff] text-[14px]">
                    Login to access your dashboard
                  </p>
                </div>
                <form
                  onSubmit={handleSignIn}
                  className="flex flex-col sm:w-[450px] mx-auto"
                >
                  <div className="w-[100%]">
                    <label className="text-[#ffffff] font-[500] text-[14px] mb-2 ml-1 block">
                      EMAIL
                    </label>
                    <input
                      type="text"
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      placeholder="Enter your email"
                      autoComplete="off"
                      name="email-field"
                      className="border border-transparent bg-[#17132e] text-[#ffffff] px-2 py-[13px] rounded-[6px] outline-none w-full"
                    />
                  </div>

                  <div className="mt-8">
                    <label className="text-[#ffffff] font-[500] text-[14px] mb-2 ml-1 block">
                      PASSWORD
                    </label>
                    <div className="flex items-center justify-between border border-transparent bg-[#17132e] text-[#ffffff] px-2 py-[13px] rounded-[6px] w-full">
                      <input
                        type={passwordType}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        placeholder="********"
                        autoComplete="new-password"
                        name="password-field"
                        className="outline-none w-full  text-white"
                      />
                      <div>
                        {passwordType === "password" ? (
                          <GoEye
                            className="cursor-pointer text-white"
                            onClick={() => setPasswordType("text")}
                          />
                        ) : (
                          <GoEyeClosed
                            className="cursor-pointer text-white"
                            onClick={() => setPasswordType("password")}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <p
                    className="text-white cursor-pointer text-end mt-2 text-[14px]"
                    onClick={() => navigate("/forgot-password")}
                  >
                    Forgot Password?
                  </p>

                  <button
                    onClick={handleSignIn}
                    disabled={loading}
                    className="flex justify-center cursor-pointer bg-[#0E7BB2] border border-[#FFFFFF]/50 items-center  text-white py-[14px] px-4 rounded-[8px] mt-7 text-[14px]"
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

                  <div className="text-center text-white mt-5 sm:mt-[40px] text-[14px]">
                    Don&apos;t have an account?{" "}
                    <Link to="/create-account" className="text-[#0E7BB2]">
                      Register
                    </Link>
                  </div>
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
            <p className="text-[white] text-[14px]">
              &copy; {new Date().getFullYear()} RendBit. All rights
              reserved.
            </p>
            <div className="text-[white] text-[14px] flex items-center gap-4">
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
                    className="mt-5 w-full border border-[#D0D5DD] bg-transparent px-[14px] py-[10px] rounded-[8px] shadow-sm outline-none text-[#ffffff]"
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
