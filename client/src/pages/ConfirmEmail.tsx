import React, { useEffect, useState } from "react";
import OTPInput from "react-otp-input";
import AuthNav from "../components/auth-nav/AuthNav";
import Alert from "../components/alert/Alert";
import Cookies from "js-cookie";
import { Link, useNavigate } from "react-router-dom";
import { resendEmailOtp, verifyEmail } from "../function/auth";

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
    <div className="relative">
      <AuthNav />
      <div className="sm:mt-[5rem] h-[75vh] mt-[7rem]  mx-3">
        <h2 className="text-[24px] font-semibold text-white text-center">
          Confirm Email Address
        </h2>
        <div className="mt-5 flex flex-col justify-center items-center relative z-[11]">
          <div className="border border-[#FFFFFF]/50 px-4 sm:px-8 pt-8 pb-5 rounded-[16px] w-full sm:w-[488px]">
            <div className="top-bg relative top-[50px] sm:flex items-center justify-center w-[300px] mx-auto">
              <img
                src="./images/favicon.svg"
                alt="RendBit Logo"
                className="mx-auto mb-4 relative top-[-65px]"
              />
            </div>
            <div className="text-center mb-12 mt-[-30px] relative z-[100]">
              <h2 className="text-[24px] text-white">RendBit</h2>
              <p className="text-[#ffffff] text-[14px] mt-3">
                Please input the OTP sent to {email}
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
                      className="text-center bg-white/8 text-white otp-input text-[26px]  font-[600] outline-none h-[68px]  rounded-md border border-[white]/50 placeholder:text-[#b0b0b0] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
              <p
                className="text-[#ffffff] text-[12px] mt-4 mb-[0.5rem] text-center cursor-pointer"
                onClick={resendOtp}
              >
                Click to resend code?
              </p>
              <div className="text-center text-white mt-5 sm:mt-[50px] text-[14px]">
                Already have an account?{" "}
                <Link to="/login" className="text-[#0E7BB2]">
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-[50px] mb-5 sm:mx-10 flex sm:flex-row flex-col sm:gap-0 gap-3 items-center justify-between">
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

export default ConfirmEmail;
