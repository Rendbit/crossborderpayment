import React, { useState } from "react";
import AuthNav from "../components/auth-nav/AuthNav";
import Alert from "../components/alert/Alert";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword } from "../function/auth";

const ForgotPassword: React.FC = () => {
  const [msg, setMsg] = useState<string>("");
  const [alertType, setAlertType] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const navigate = useNavigate();

  async function handleForgotPassword(e: any) {
    e.preventDefault();
    setLoading(true);
    if (!email) {
      setMsg("Please enter your email address");
      setAlertType("error");
      return;
    }

    try {
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
    <div className="relative bg-gradient-to-b from-[#02001C] via-[#02001C] via-85% to-[#0E7BB2]">
      <AuthNav />
      <div className="sm:mt-[10rem] h-[60vh] mt-[5rem] mx-3">
        <h2 className="text-[28px] text-white mb-4 font-[600] text-center">
          Forgot Password
        </h2>
        <div className="mt-5 flex flex-col justify-center items-center relative z-[11]">
          <div className="border border-[#999999]/50 px-4 sm:px-8 pt-8 pb-5 rounded-[16px] w-full sm:w-[650px]">
            <div className="top-bg relative top-[50px] sm:flex items-center justify-center w-[300px] mx-auto">
              <img
                src="./images/favicon.svg"
                alt="RendBit Logo"
                className="mx-auto mb-4 relative top-[-65px]"
              />
            </div>
            <div className="text-center mb-12 mt-[-30px] relative z-[100]">
              <h2 className="text-[24px] text-white mb-2">RendBit</h2>
              <p className="text-[#667085] text-[12px] sm:text-[14px]">
                Request for forgot password to reset your password and login.
              </p>
            </div>
            <form
              onSubmit={handleForgotPassword}
              className="flex flex-col sm:w-[450px] mx-auto"
            >
              <div className="w-full">
                <label className="text-[#ffffff] gont-[500] text-[14px] mb-2 ml-1 block">
                  EMAIL
                </label>
                <input
                  type="text"
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  placeholder="Enter your email"
                  className="border autofill:bg-transparent autofill:shadow-[0_0_0px_1000px_rgba(0,0,0,0)] border-transparent bg-[#17132e] text-[#ffffff] px-2 py-[13px] rounded-[8px] outline-none w-full"
                />
              </div>

              <button
                disabled={loading}
                className="flex justify-center cursor-pointer bg-[#0E7BB2] border border-[#FFFFFF]/50 items-center  text-white py-[14px] px-4 rounded-[8px] mt-7 text-[14px]"
              >
                <span>Proceed</span>
                {loading && (
                  <img
                    src="./images/loader.gif"
                    className="w-[20px] mx-2"
                    alt=""
                  />
                )}
              </button>

              <div className="text-center text-white mt-5 sm:mt-[70px] text-[14px]">
                <p className="text-center">
                  Don&apos;t have an account?{" "}
                  <Link to="/create-account" className="text-[#0E7BB2]">
                    Register
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="mt-[100px] mb-5 sm:mx-10 flex sm:flex-row flex-col sm:gap-0 gap-3 items-center justify-between">
        <p className="text-[white] text-[12px]">
          &copy; {new Date().getFullYear()} RendBit. All rights reserved.
        </p>
        <div className="text-[white] text-[12px] flex items-center gap-4">
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

export default ForgotPassword;
