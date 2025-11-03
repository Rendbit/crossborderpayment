import React, { useState } from "react";
import AuthNav from "../components/auth-nav/AuthNav";
import Alert from "../components/alert/Alert";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword } from "../function/auth";
import { MdEmail } from "react-icons/md";
import { FiExternalLink } from "react-icons/fi";
import ThemeToggle from "../components/theme-toggle";

const ForgotPassword: React.FC = () => {
  const [msg, setMsg] = useState<string>("");
  const [alertType, setAlertType] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const navigate = useNavigate();

  async function handleForgotPassword(e: any) {
    e.preventDefault();
    if (!email) {
      setMsg("Please enter your email address");
      setAlertType("error");
      return;
    }

    try {
      setLoading(true);
      const response = await forgotPassword(email);

      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        return;
      }

      navigate("/password-reset");
    } catch (error: any) {
      setMsg(
        error.message ||
          "An error occurred while requesting for forgot password."
      );
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative bg-[#F9F9F9] dark:bg-gray-800 min-h-screen">
      <div className="flex items-center justify-between w-full md:pr-[100px] pr-[20px]">
        <AuthNav />
        <div className="text-center text-black dark:text-gray-300 text-[14px] flex items-center truncate">
          Changed your mind?{" "}
          <Link
            to="/login"
            className="text-[#0E7BB2] underline ml-1 mr-4 sm:mr-10"
          >
            Login
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
        <div className="mt-5 flex flex-col justify-center items-center relative z-[11]">
          <div className="bg-white dark:bg-gray-900 shadow shadow-[#585C5F1A] px-4 sm:px-6 pt-8 pb-5 rounded-[18px] w-full sm:w-[450px]">
            <div className="top-bg relative top-[50px] sm:flex items-center justify-center w-[300px] mx-auto">
              <img
                src="./image/CustomForgetpasswordIcon.svg"
                alt="RendBit Logo"
                className="mx-auto mb-4 relative top-[-65px] mt-5"
              />
            </div>
            <div className="text-center mb-12 mt-[-30px] relative z-[100]">
              <h2 className="text-[24px] dark:text-gray-300 text-[#0A0D14] mb-2">
                Reset Password
              </h2>
              <p className="text-[#525866] dark:text-gray-300 text-[12px] sm:text-[14px]">
                Enter your email to reset your password.
              </p>
            </div>
            <form
              onSubmit={handleForgotPassword}
              className="flex flex-col mx-auto"
            >
              <div className="w-[100%] mt-6">
                <label className="text-[#0A0D14] dark:text-gray-300 font-[500] text-[14px] mb-2 ml-1 block">
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
                    className="outline-none w-full"
                  />
                </div>
              </div>

              <button
                disabled={loading}
                className="flex justify-center cursor-pointer bg-[#0E7BB2] border border-[#FFFFFF]/50 items-center  text-white py-[10px] px-4 rounded-[8px] mt-7 text-[14px]"
              >
                <span>Reset Password</span>
                {loading && (
                  <img
                    src="./images/loader.gif"
                    className="w-[20px] mx-2"
                    alt=""
                  />
                )}
              </button>

              <div className="text-center text-[#525866] mt-5 sm:mt-[30px] text-[14px]">
                <p className="text-center">
                  Don't have access anymore?
                  <Link to="/create-account" className="dark:text-gray-300 text-[#0A0D14]">
                    Try another method
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
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

export default ForgotPassword;
