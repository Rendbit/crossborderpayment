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
import { MdEmail } from "react-icons/md";
import { Key, User } from "lucide-react";

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
    <div className="relative bg-gray-100 dark:bg-gray-800">
      <div className="flex items-center justify-between w-full md:pr-[100px] pr-[20px]">
        <AuthNav />
        <div className="text-center text-black dark:text-gray-300 text-[14px]">
          Already have an account?{" "}
          <Link to="/login" className="text-[#0E7BB2] underline ml-1">
            Log in
          </Link>
        </div>
      </div>
      <div className="sm:mt-[5rem] md:mt-[7rem] mt-[50px] mx-3 md:px-24 relative">
        <img
          src="./image/Pattern.svg"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          alt=""
        />
        <div className="flex flex-col justify-center items-center relative z-[11]">
          <div className="bg-[white] dark:bg-gray-900 shadow shadow-[#585C5F1A] px-4 sm:px-6 pt-8 pb-5 rounded-[18px] w-full sm:w-[450px]">
            <div className="top-bg relative top-[50px] sm:flex items-center justify-center w-[300px] mx-auto">
              <img
                src="./image/CustomRegisterIcon.svg"
                alt="RendBit Logo"
                className="mx-auto mb-4 relative top-[-65px] mt-5"
              />
            </div>
            <div className="text-center mb-12 mt-[-30px] relative z-[100]">
              <h2 className="text-[18px] md:text-[24px] text-black dark:text-gray-300 mb-2">
                Create a new account
              </h2>
              <p className="text-black dark:text-gray-300 text-[14px]">
                Enter your details to register.
              </p>
            </div>
            <form className="flex flex-col mx-auto">
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

              <div className="w-[100%] mt-6">
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

              <div className="mt-6">
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
                    className="outline-none w-full"
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

              <div className="mt-6">
                <label className="text-black dark:text-gray-300 font-[500] text-[14px] mb-2 ml-1 block">
                  Confirm Password
                </label>
                <div className="border border-[#E2E4E9] text-[#868C98] px-2 py-[7px] rounded-[6px] gap-2 flex items-center justify-between w-full">
                  <Key />
                  <input
                    type={confirmPasswordType}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    placeholder="********"
                    autoComplete="new-password"
                    name="password-field"
                    className="outline-none w-full"
                  />
                  <div>
                    {confirmPasswordType === "password" ? (
                      <GoEye
                        className="cursor-pointer text-[#868C98]"
                        onClick={() => setConfirmPasswordType("text")}
                      />
                    ) : (
                      <GoEyeClosed
                        className="cursor-pointer text-[#868C98]"
                        onClick={() => setConfirmPasswordType("password")}
                      />
                    )}
                  </div>
                </div>
              </div>

              <p className="text-[#525866] text-[12px] mt-1">
                Must contain 1 uppercase letter, 1 number, min. 8 characters.
              </p>

              <button
                onClick={handleAccountCreation}
                className="flex justify-center cursor-pointer bg-[#0E7BB2] border border-[#FFFFFF]/50 items-center  text-white py-[10px] px-4 rounded-[8px] mt-7 text-[14px]"
                disabled={loading}
              >
                <span>Reister</span>
                {loading && (
                  <img
                    src="./images/loader.gif"
                    className="w-[20px] mx-2"
                    alt=""
                  />
                )}
              </button>
            </form>
            <div className="text-[#868C98] text-[14px] flex items-center gap-1 mt-2 justify-center">
              <p className="text-center mt-2">
                By clicking Register, you agree to accept Rendbit
                <Link
                  to="#"
                  className="block text-black dark:text-gray-300 underline ml-1"
                >
                  Terms and Conditions
                </Link>
              </p>
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
      <div className="mt-[50px] mb-5 sm:mx-10 flex sm:flex-row flex-col sm:gap-0 gap-3 items-center justify-between">
        <p className="text-[#525866] text-[14px]">
          &copy; {new Date().getFullYear()} RendBit. All rights reserved.
        </p>
        <div className="text-[#525866] text-[14px] flex items-center gap-4">
          <Link to="#" className="flex items-center gap-[2px]">
            Privacy Policy <FiExternalLink />
          </Link>
          <Link to="#" className="mr-4 flex items-center gap-[2px]">
            Terms of Use <FiExternalLink />
          </Link>
        </div>
      </div>
      {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
    </div>
  );
};

export default CreateAccount;
