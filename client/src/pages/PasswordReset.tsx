import React, { useEffect, useState } from "react";
import AuthNav from "../components/auth-nav/AuthNav";
import Alert from "../components/alert/Alert";
import { GoEye, GoEyeClosed } from "react-icons/go";
import Cookies from "js-cookie";
import { Link, useNavigate } from "react-router-dom";
import { passwordReset, resendForgotPasswordOtp } from "../function/auth";
import { FiExternalLink } from "react-icons/fi";

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
      const response = await passwordReset(otp, email, password);

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
    <div className="relative bg-[#F9F9F9] min-h-screen">
      <div className="flex items-center justify-between w-full md:pr-[100px] pr-[20px]">
        <AuthNav />
        <div className="text-center text-[14px]">
          Changed your mind?
          <Link to="/login" className="text-[#0E7BB2] underline ml-1">
            Go Back
          </Link>
        </div>
      </div>
      <div className="sm:mt-[5rem] md:mt-[7rem] mt-[50px] mx-3 md:px-24 relative">
        <img
          src="./image/Pattern.svg"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          alt=""
        />
        <div className="mt-5 flex flex-col justify-center items-center relative z-[11]">
          <div className="bg-white shadow shadow-[#585C5F1A] px-4 sm:px-6 pt-8 pb-5 rounded-[18px] w-full sm:w-[450px]">
            <div className="top-bg relative top-[50px] sm:flex items-center justify-center w-[300px] mx-auto">
              <img
                src="./image/CustomPasswordResetIcon.svg"
                alt="RendBit Logo"
                className="mx-auto mb-4 relative top-[-65px] mt-5"
              />
            </div>
            <div className="text-center mb-12 mt-[-30px] relative z-[100]">
              <h2 className="text-[24px] text-[#0A0D14] mb-2">Reset Password</h2>
              <p className="text-[#667085] text-[14px] mt-3">
                Please input the OTP sent to {email}
              </p>
            </div>
            <div className="flex flex-col sm:w-[400px] mx-auto">
              <div>
                <label
                  htmlFor="otp"
                  className="text-[#0A0D14] gont-[500] text-[14px] mb-1 block"
                >
                  OTP
                </label>
                <input
                  type="text"
                  onChange={(e) => setOtp(e.target.value)}
                  disabled={loading}
                  placeholder="123456"
                  className="border border-gray-300  text-[#667085] p-2 rounded-[8px] outline-none w-full"
                />
                <p className="text-[#667085] text-[12px] text-end">
                  Please check your email inbox for an OTP code
                </p>
              </div>

              <div className="my-5">
                <label className="text-[#0A0D14] gont-[500] text-[14px] mb-1 block">
                  Password
                </label>
                <div className="flex items-center justify-between border border-gray-300 p-2 rounded-[6px] w-full">
                  <input
                    type={passwordType}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    className="outline-none w-full text-[#667085]"
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
                <label className="text-[#0A0D14] gont-[500] text-[14px] mb-1 block">
                  Confirm Password
                </label>
                <div className="flex items-center justify-between border border-gray-300 p-2 rounded-[6px] w-full">
                  <input
                    type={passwordType}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="********"
                    className="outline-none w-full text-[#667085]"
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
              <div className="mt-2 text-[14px] text-center">
                <p className="text-[#525866]">Experiencing issues receiving the code?</p>
                <p
                  className="text-[#0A0D14] cursor-pointer text-center block underline mt-1"
                  onClick={resendOtp}
                >
                  Resend code
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-[50px] mb-5 sm:mx-10 flex sm:flex-row flex-col sm:gap-0 gap-3 items-center justify-between">
        <p className="text-[#525866] text-[14px]">
          &copy; {new Date().getFullYear()} RendBit. All rights
          reserved.
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

export default PasswordReset;
