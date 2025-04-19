import React, { useEffect, useState } from "react";
import AuthNav from "../components/auth-nav/AuthNav";
import Alert from "../components/alert/Alert";
import { GoEye, GoEyeClosed } from "react-icons/go";
import Cookies from "js-cookie";
import { Link, useNavigate } from "react-router-dom";
import { passwordReset, resendForgotPasswordOtp } from "../function/auth";

const PasswordReset: React.FC = () => {
  const [otp, setOtp] = useState("");
  const [msg, setMsg] = useState("");
  const [alertType, setAlertType] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordType, setPasswordType] = useState("password");
  const [email, setEmail] = useState("");

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = Cookies.get("token");
      const storedEmail = localStorage.getItem("forgot-password-email");
      if (token) {
        navigate("/dashboard");
      }
      if (storedEmail) {
        setEmail(storedEmail);
      }
    }
  }, [navigate]);

  async function handlePasswordReset() {
    setLoading(true);
    if (!otp) {
      setMsg("Please input the OTP sent to you.");
      setAlertType("error");
      return;
    }

    if (password !== confirmPassword) {
      setMsg("Passwords do not match");
      setAlertType("error");
      return;
    }

    try {
      const response = await passwordReset(otp, password, email);

      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        return;
      }
      setMsg(response.message);
      setAlertType("success");
      navigate("/login");
    } catch (error: any) {
      setMsg(error.message || "An error occurred during password reset.");
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp(e: any) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await resendForgotPasswordOtp(email);

      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        setLoading(false);
        return;
      }
      setMsg(response.message);
      setAlertType("success");
    } catch (error: any) {
      setMsg(
        error.message ||
          "An error occurred whiel resending forgot password OTP."
      );
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <AuthNav />
      <div className="sm:mt-[10rem] h-[100%] mt-[5rem] mx-3">
        <h2 className="text-[24px] font-semibold text-center text-white">
          Reset your password
        </h2>
        <div className="mt-5 flex flex-col justify-center items-center relative z-[11]">
          <div className="px-4 border-[#FFFFFF]/50 sm:px-8 pt-8 pb-5 rounded-[16px] border w-full sm:w-[588px]">
            <div className="top-bg relative top-[50px] hidden sm:flex items-center justify-center w-[300px] mx-auto">
              <img
                src="./images/favicon.svg"
                alt="RendBit Logo"
                className="mx-auto mb-4 relative top-[-65px]"
              />
            </div>
            <div className="text-center mb-12 mt-[-30px] relative z-[100]">
              <h2 className="text-[24px] text-white">RendBit</h2>
              <p className="text-[#667085] text-[14px] mt-3">
                Please input the OTP sent to {email}
              </p>
            </div>
            <div className="flex flex-col sm:w-[400px] mx-auto">
              <div>
                <label
                  htmlFor="otp"
                  className="text-[#ffffff] gont-[500] text-[14px] mb-1 block"
                >
                  OTP
                </label>
                <input
                  type="text"
                  onChange={(e) => setOtp(e.target.value)}
                  disabled={loading}
                  placeholder="123456"
                  className="border border-gray-300 text-[#707070] p-2 rounded-[8px] outline-none w-full"
                />
                <p className="text-[#667085] text-[12px] text-end">
                  Please check your email inbox for an OTP code
                </p>
              </div>

              <div className="my-5">
                <label className="text-[#ffffff] gont-[500] text-[14px] mb-1 block">
                  Password
                </label>
                <div className="flex items-center justify-between border border-gray-300 p-2 rounded-[6px] w-full">
                  <input
                    type={passwordType}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    className="outline-none w-full"
                    disabled={loading}
                  />
                  <div>
                    {passwordType === "password" ? (
                      <GoEye
                        className="cursor-pointer text-gray-300 text-[22px]"
                        onClick={() => setPasswordType("text")}
                      />
                    ) : (
                      <GoEyeClosed
                        className="cursor-pointer text-gray-300"
                        onClick={() => setPasswordType("password")}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[#ffffff] gont-[500] text-[14px] mb-1 block">
                  Confirm Password
                </label>
                <div className="flex items-center justify-between border border-gray-300 p-2 rounded-[6px] w-full">
                  <input
                    type={passwordType}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="********"
                    className="outline-none w-full"
                    disabled={loading}
                  />
                  <div>
                    {passwordType === "password" ? (
                      <GoEye
                        className="cursor-pointer text-gray-300 text-[22px]"
                        onClick={() => setPasswordType("text")}
                      />
                    ) : (
                      <GoEyeClosed
                        className="cursor-pointer text-gray-300"
                        onClick={() => setPasswordType("password")}
                      />
                    )}
                  </div>
                </div>
              </div>
              <p
                className="text-[white] cursor-pointer text-center mt-2 text-[14px]"
                onClick={resendOtp}
              >
                Click to resend code?
              </p>

              <button
                onClick={handlePasswordReset}
                disabled={loading}
                className="flex justify-center cursor-pointer bg-[#0E7BB2] border border-[#FFFFFF]/50 items-center bg-primary-color text-white w-[100%] mx-auto py-2 px-4 rounded-[8px] mt-5"
              >
                <span>Confirm</span>
                {loading && (
                  <img
                    src="./images/loader.gif"
                    className="w-[20px] mx-2"
                    alt=""
                  />
                )}
              </button>
              <div className="text-center text-[white] mt-5 sm:mt-[70px] text-[14px]">
                <p className="text-center">
                  Already have an account?{" "}
                  <Link to="/login" className="text-[#0E7BB2]">
                    Log in
                  </Link>
                </p>
              </div>
            </div>
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

export default PasswordReset;
