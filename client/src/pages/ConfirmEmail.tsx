import React, { useEffect, useState } from "react";
import OTPInput from "react-otp-input";
import AuthNav from "../components/auth-nav/AuthNav";
import Alert from "../components/alert/Alert";
import Cookies from "js-cookie";
import { Link, useNavigate } from "react-router-dom";
import { resendEmailOtp, verifyEmail } from "../function/auth";
import { FiExternalLink } from "react-icons/fi";

const ConfirmEmail: React.FC = () => {
  const [otp, setOtp] = useState("");
  const [msg, setMsg] = useState("");
  const [alertType, setAlertType] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = Cookies.get("token");
    if (token) navigate("/dashboard");

    // Retrieve email from localStorage after component mounts
    const storedEmail = localStorage.getItem("reg-email");
    if (storedEmail) {
      setEmail(storedEmail);
    }
  }, [navigate]);

  async function handleConfirmEmail(e: any) {
    e.preventDefault();
    setLoading(true);

    if (!otp) {
      setMsg("Please input the OTP sent to you.");
      setAlertType("error");
      setLoading(false);
      return;
    }
    try {
      const response = await verifyEmail(otp);

      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        return;
      }
      navigate("/about-self");
    } catch (error: any) {
      setMsg(error.message || "An error occurred while verifuing OTP");
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp(e: any) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await resendEmailOtp(email);

      if (!response.success) {
        setMsg(response.message);
        setAlertType("error");
        return;
      }
      setMsg(response.message);
      setAlertType("success");
    } catch (error: any) {
      setMsg(error.message || "An error occurred while resnding OTP");
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
              <h2 className="text-[24px] text-[#0A0D14]">Enter Verification Code</h2>
              <p className="text-[#0A0D14] text-[14px] mt-3">
                We've sent a code to {email}
              </p>
            </div>
            <div className="flex flex-col sm:w-[400px] mx-auto">
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <OTPInput
                  value={otp}
                  inputType="number"
                  inputStyle={{ width: "70px" }}
                  onChange={setOtp}
                  numInputs={4}
                  renderSeparator={
                    <span style={{ visibility: "hidden" }}>---</span>
                  }
                  renderInput={(props) => (
                    <input
                      {...props}
                      placeholder="0"
                      className="text-center bg-white/8 text-[#0A0D14] otp-input text-[26px] font-[600] outline-none h-[68px] rounded-md border border-[#E2E4E9] placeholder:text-[#b0b0b0] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  )}
                />
              </div>
              <button
                onClick={handleConfirmEmail}
                disabled={loading}
                className="flex cursor-pointer justify-center items- border border-[white]/50 bg-[#0E7BB2] text-white w-[90%] mx-auto py-2 px-4 rounded-md mt-5"
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
              <div className="mt-4 text-[14px] text-center">
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

export default ConfirmEmail;
