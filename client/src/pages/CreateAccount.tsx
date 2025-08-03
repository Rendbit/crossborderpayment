import React, { useEffect, useState, useRef } from "react";
import { GoEye, GoEyeClosed } from "react-icons/go";
import AuthNav from "../components/auth-nav/AuthNav";
import Alert from "../components/alert/Alert";
import Cookies from "js-cookie";
import { FiExternalLink } from "react-icons/fi";
import { ImCheckboxUnchecked } from "react-icons/im";
import { ImCheckboxChecked } from "react-icons/im";
// import ReCAPTCHA from "react-google-recaptcha";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../function/auth";

const CreateAccount: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordType, setPasswordType] = useState("password");
  const [confirmPasswordType, setConfirmPasswordType] = useState("password");
  const [msg, setMsg] = useState("");
  const [alertType, setAlertType] = useState("");
  //   const recaptchaRef = useRef(null);
  const [captchaValue, setCaptchaValue] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const token = Cookies.get("token");
    if (token) navigate("/dashboard");
  }, []);

  async function handleAccountCreation(e: any) {
    e.preventDefault();
    setLoading(true);
    if (!email || !password || !confirmPassword) {
      setMsg("Please fill in all fields");
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
      const response = await register(email, password, captchaValue);

      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        return;
      }

      navigate("/confirm-email");
    } catch (error: any) {
      setMsg(error.message || "An error occurred during account creation.");
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin(e) {
    e.preventDefault();
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/auth/google/redirect`,
      {
        method: "GET",
        headers: {
          "Api-Key": `${process.env.NEXT_PUBLIC_API_KEY}`,
        },
      }
    );
    const data = await res.json();
  }

  const handleCaptchaChange = (value) => {
    setCaptchaValue(value);
  };

  return (
    <div className="relative bg-gradient-to-b from-[#02001C] via-[#02001C] via-80% to-[#0E7BB2]">
      <AuthNav />
      <div className="sm:mt-[10rem]  mt-[30px] mx-3 md:px-24">
        <div className="flex flex-col justify-center items-center relative z-[11]">
          <h2 className="text-[28px] text-white mb-4 font-[600]">
            Create Account
          </h2>
          <div className="border border-[#999999]/50 px-4 sm:px-8 pt-8 pb-[55px] rounded-[16px]  w-full sm:w-[650px]">
            <div className="top-bg relative top-[50px] sm:flex items-center justify-center w-[300px] mx-auto hidden">
              <img
                src="./images/favicon.svg"
                alt="RendBit Logo"
                className="mx-auto mb-4 relative top-[-65px]"
              />
            </div>
            <div className="text-center mb-12 mt-[-30px] relative z-[100]">
              <h2 className="text-[24px] text-white mb-2">RendBit</h2>
              <p className="text-[#ffffff] sm:text-[14px] text-[13px]">
                  Welcome to the world of premium features and explore the endless possibilities that await.
              </p>
            </div>

            <form className="flex flex-col sm:w-[450px] mx-auto">
              {/* <div className="w-full flex flex-col gap-3 mb-[20px]">
                <button
                  onClick={handleGoogleLogin}
                  className="bg-transparent border border-[#FFFFFF]/50 text-[#ffffff] py-2 px-4 rounded-[8px] sm:text-[16px] text-[14px] flex items-center justify-center w-full shadow"
                >
                  <img
                    src="./images/google.svg"
                    alt="Google Logo"
                    className="w-5 h-5 mr-2"
                  />
                  Sign in with Google
                </button>
              </div>

              <div className="text-center text-[#ffffff] flex items-center justify-center gap-2 my-[10px]">
                <div className="h-[1px] bg-[#ffffff] w-full"></div>
                <p className="text-[#ffffff]">OR</p>
                <div className="h-[1px] bg-[#ffffff] w-full"></div>
              </div> */}

              <div className="w-[100%]">
                <label
                  htmlFor="email"
                  className="text-[#ffffff] gont-[500] text-[14px] mb-2 ml-1 block"
                >
                  EMAIL
                </label>
                <input
                  type="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={loading}
                  autoComplete="off"
                  className="border autofill:bg-transparent autofill:shadow-[0_0_0px_1000px_rgba(0,0,0,0)] border-transparent bg-[#17132e] text-[#ffffff] px-2 py-[13px] rounded-[8px] outline-none w-full"
                />
              </div>

              <div className="my-8">
                <label className="text-[#ffffff] gont-[500] text-[14px] mb-2 ml-1 block">
                  PASWORD
                </label>
                <div className="flex items-center justify-between border-transparent bg-[#17132e] p-2 rounded-[6px] w-full">
                  <input
                    type={passwordType}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    disabled={loading}
                    autoComplete="off"
                    className="outline-none w-full text-white autofill:bg-transparent autofill:shadow-[0_0_0px_1000px_rgba(0,0,0,0)] border-transparent bg-transparent px-2 py-[6px]"
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

              <div>
                <label className="text-[#ffffff] gont-[500] text-[14px] mb-2 ml-1 block">
                  CONFIRM PASSWORD
                </label>
                <div className="flex items-center justify-between border-transparent bg-[#17132e] p-2 rounded-[6px] w-full">
                  <input
                    type={confirmPasswordType}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    placeholder="********"
                    autoComplete="off"
                    className="outline-none w-full text-white autofill:bg-transparent autofill:shadow-[0_0_0px_1000px_rgba(0,0,0,0)] border-transparent bg-transparent px-2 py-[6px]"
                  />
                  <div>
                    {confirmPasswordType === "password" ? (
                      <GoEye
                        className="cursor-pointer text-white"
                        onClick={() => setConfirmPasswordType("text")}
                      />
                    ) : (
                      <GoEyeClosed
                        className="cursor-pointer text-white"
                        onClick={() => setConfirmPasswordType("password")}
                      />
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={handleAccountCreation}
                className="flex justify-center cursor-pointer bg-[#0E7BB2] border border-[#FFFFFF]/50 items-center  text-white py-[14px] px-4 rounded-[8px] mt-7 text-[14px]"
                disabled={loading}
              >
                <span>Create Account</span>
                {loading && (
                  <img
                    src="./images/loader.gif"
                    className="w-[20px] mx-2"
                    alt=""
                  />
                )}
              </button>
            </form>
            <div className="text-[white] text-[14px] flex items-center gap-1 mt-2 justify-center">
              <p className="text-center mt-2">
                By joining, you agree to our
                <Link
                  to="#"
                  className="inline-flex items-center gap-[2px] text-[#0E7BB2] ml-1"
                >
                  Privacy Policy <FiExternalLink />
                </Link>{" "}
                and{" "}
                <Link
                  to="#"
                  className="inline-flex items-center gap-[2px] text-[#0E7BB2]"
                >
                  Terms of Use <FiExternalLink />
                </Link>
              </p>
            </div>

            <div className="text-center text-white mt-3 text-[14px]">
              Already have an account?{" "}
              <Link to="/login" className="text-[#0E7BB2]">
                Log in
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* <div className='flex items-center justify-center mt-3'>
          <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={process.env.NEXT_PUBLIC_SITE_KEY}
              onChange={handleCaptchaChange}
          />
      </div> */}
      <div className="mt-[100px] mb-5 sm:mx-10 flex sm:flex-row flex-col sm:gap-0 gap-3 items-center justify-between">
        <p className="text-[white] text-[14px]">
          &copy; {new Date().getFullYear()} RendBit. All rights reserved.
        </p>
        <div className="text-[white] text-[14px] flex items-center gap-4">
          <Link to="#">Privacy Policy</Link>
          <Link to="#" className="mr-4">
            Terms of Use
          </Link>
        </div>
      </div>
      {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
    </div>
  );
};

export default CreateAccount;
